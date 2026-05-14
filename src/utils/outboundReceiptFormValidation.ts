/**
 * Quy tắc validate form tạo phiếu xuất kho — căn chỉnh giới hạn DB (init.sql) và nghiệp vụ.
 */
import { normalizeDecimalInput } from "./receiptFormHelpers";

export const OUTBOUND_RECEIPT_CODE_MAX = 100;
export const OUTBOUND_COUNTERPARTY_MAX = 255;
export const OUTBOUND_SOURCE_CODE_MAX = 100;
export const OUTBOUND_PHONE_MAX = 50;
export const OUTBOUND_LINE_NAME_MAX = 255;
export const OUTBOUND_LINE_CODE_MAX = 100;
export const OUTBOUND_LINE_UNIT_MAX = 50;
export const OUTBOUND_NOTE_MAX = 4000;
export const OUTBOUND_MAX_LINES = 200;
export const OUTBOUND_QTY_MAX_DECIMALS = 3;
export const OUTBOUND_PRICE_MAX_DECIMALS = 2;
export const OUTBOUND_DISCOUNT_MAX_DECIMALS = 2;

/** Ảnh đính kèm (chưa upload API): số lượng & dung lượng. */
export const OUTBOUND_IMAGE_MAX_FILES = 20;
export const OUTBOUND_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const OUTBOUND_IMAGE_ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/** PNG / JPEG / WebP — khớp gợi ý UI; MIME rỗng thì suy từ đuôi tên file. */
export function isAllowedOutboundReceiptImageFile(f: File): boolean {
  const t = (f.type || "").trim().toLowerCase();
  if (OUTBOUND_IMAGE_ALLOWED_MIME.has(t)) return true;
  if (t !== "" && t !== "application/octet-stream") return false;
  return /\.(png|jpe?g|webp)$/i.test(f.name.trim());
}

export type OutboundLineInput = {
  key: string;
  name: string;
  code: string;
  unit: string;
  unitPrice: string;
  quantity: string;
  discountPct: string;
};

export type OutboundApiLine = {
  name: string;
  code: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  subtotal: number;
};

export type OutboundValidateErrors = Partial<Record<string, string>>;

function countFractionAfterNormalize(raw: string): number {
  const n = normalizeDecimalInput(raw.trim());
  const i = n.indexOf(".");
  if (i === -1) return 0;
  return n.length - i - 1;
}

/** Parse số dương hữu hạn sau chuẩn hoá VN/EN; rỗng → null. */
export function parseOutboundPositiveDecimal(raw: string): number | null {
  const n = normalizeDecimalInput(raw.trim());
  if (n === "") return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

/** Chiết khấu %: cho phép 0; rỗng coi như 0. */
export function parseOutboundDiscountPct(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return 0;
  const n = normalizeDecimalInput(t);
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0 || v > 100) return null;
  return v;
}

/** Số điện thoại: tùy chọn; nếu có thì ký tự cho phép + độ dài. */
export function validatePhoneVi(raw: string): string | null {
  const t = raw.trim();
  if (t === "") return null;
  if (t.length > OUTBOUND_PHONE_MAX) {
    return `Số điện thoại tối đa ${OUTBOUND_PHONE_MAX} ký tự`;
  }
  if (!/^[\d\s+().\-/]{3,}$/.test(t)) {
    return "Số điện thoại chỉ gồm chữ số và ký tự + ( ) . - / khoảng trắng";
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return "Số điện thoại cần 8–15 chữ số";
  }
  return null;
}

export function validateOutboundImageFiles(files: File[]): string | null {
  if (files.length > OUTBOUND_IMAGE_MAX_FILES) {
    return `Tối đa ${OUTBOUND_IMAGE_MAX_FILES} ảnh mỗi mục`;
  }
  for (const f of files) {
    if (!isAllowedOutboundReceiptImageFile(f)) {
      return `« ${f.name} » chỉ chấp nhận PNG, JPG hoặc WebP`;
    }
    if (f.size > OUTBOUND_IMAGE_MAX_BYTES) {
      return `« ${f.name} » vượt quá 5 MB`;
    }
    if (f.size === 0) {
      return `« ${f.name} » rỗng (0 byte)`;
    }
  }
  return null;
}

function lineSubtotalFromParsed(unitPrice: number, quantity: number, discountPct: number): number {
  if (unitPrice <= 0 || quantity <= 0) return Number.NaN;
  const factor = Math.max(0, 1 - discountPct / 100);
  return Math.round(unitPrice * quantity * factor);
}

export type OutboundValidateOk = {
  ok: true;
  apiLines: OutboundApiLine[];
  contractSummary: string;
};

export type OutboundValidateFail = {
  ok: false;
  errors: OutboundValidateErrors;
};

export type OutboundValidateResult = OutboundValidateOk | OutboundValidateFail;

/**
 * Validate toàn bộ form tạo phiếu xuất. Trả về `apiLines` + `contractSummary` khi hợp lệ.
 */
export function validateOutboundReceiptCreateForm(
  params: {
    receiptCode: string;
    sourceName: string;
    sourceCode: string;
    phone: string;
    address: string;
    reason: string;
    contractNote: string;
    evidenceNote: string;
    contractImageFiles: File[];
    evidenceImageFiles: File[];
    lines: OutboundLineInput[];
  },
  options?: { receiptScope?: "ncc" | "internal" | "nvbh" }
): OutboundValidateResult {
  const errors: OutboundValidateErrors = {};
  const scope = options?.receiptScope ?? "ncc";
  const recipientLabel = scope === "ncc" ? "Nguồn nhận" : "Người nhận";

  const code = params.receiptCode.trim();
  if (code === "") errors.receipt_code = "Mã phiếu bắt buộc";
  else if (code.length > OUTBOUND_RECEIPT_CODE_MAX) {
    errors.receipt_code = `Mã phiếu tối đa ${OUTBOUND_RECEIPT_CODE_MAX} ký tự`;
  } else if (!/^\S+$/.test(code)) {
    errors.receipt_code = "Mã phiếu không được chứa khoảng trắng hoặc xuống dòng";
  }

  const cp = params.sourceName.trim();
  if (cp === "") errors.source_name = `${recipientLabel} bắt buộc`;
  else if (cp.length > OUTBOUND_COUNTERPARTY_MAX) {
    errors.source_name = `${recipientLabel} tối đa ${OUTBOUND_COUNTERPARTY_MAX} ký tự`;
  }

  const sc = params.sourceCode.trim();
  if (sc.length > OUTBOUND_SOURCE_CODE_MAX) {
    errors.source_code = `Mã nguồn tối đa ${OUTBOUND_SOURCE_CODE_MAX} ký tự`;
  }

  const phoneErr = validatePhoneVi(params.phone);
  if (phoneErr) errors.phone = phoneErr;

  const addr = params.address.trim();
  if (addr.length > 8000) {
    errors.address = "Địa chỉ quá dài (tối đa 8000 ký tự)";
  }

  const reason = params.reason.trim();
  if (reason === "") errors.reason = "Lý do xuất bắt buộc";
  else if (reason.length > OUTBOUND_NOTE_MAX) {
    errors.reason = `Lý do xuất tối đa ${OUTBOUND_NOTE_MAX} ký tự`;
  }

  const cNote = params.contractNote.trim();
  if (cNote.length > OUTBOUND_NOTE_MAX) {
    errors.contract_note = `Nội dung hợp đồng tối đa ${OUTBOUND_NOTE_MAX} ký tự`;
  }
  const eNote = params.evidenceNote.trim();
  if (eNote.length > OUTBOUND_NOTE_MAX) {
    errors.evidence_note = `Nội dung sở cứ tối đa ${OUTBOUND_NOTE_MAX} ký tự`;
  }

  const cImg = validateOutboundImageFiles(params.contractImageFiles);
  if (cImg) errors.contract_files = cImg;
  const eImg = validateOutboundImageFiles(params.evidenceImageFiles);
  if (eImg) errors.evidence_files = eImg;

  if (!params.lines.length) {
    errors.lines = "Cần ít nhất một dòng hàng";
    return { ok: false, errors };
  }
  if (params.lines.length > OUTBOUND_MAX_LINES) {
    errors.lines = `Tối đa ${OUTBOUND_MAX_LINES} dòng`;
    return { ok: false, errors };
  }

  const apiLines: OutboundApiLine[] = [];

  params.lines.forEach((row, idx) => {
    const rowLabel = `Dòng ${idx + 1}`;
    const name = row.name.trim();
    const unit = row.unit.trim();
    const codeStr = row.code.trim();

    if (name === "") {
      errors[row.key] = `${rowLabel}: nhập tên hàng hóa`;
      return;
    }
    if (name.length > OUTBOUND_LINE_NAME_MAX) {
      errors[row.key] = `${rowLabel}: tên hàng tối đa ${OUTBOUND_LINE_NAME_MAX} ký tự`;
      return;
    }
    if (codeStr.length > OUTBOUND_LINE_CODE_MAX) {
      errors[row.key] = `${rowLabel}: mã hàng tối đa ${OUTBOUND_LINE_CODE_MAX} ký tự`;
      return;
    }
    if (unit === "") {
      errors[row.key] = `${rowLabel}: nhập đơn vị tính`;
      return;
    }
    if (unit.length > OUTBOUND_LINE_UNIT_MAX) {
      errors[row.key] = `${rowLabel}: đơn vị tối đa ${OUTBOUND_LINE_UNIT_MAX} ký tự`;
      return;
    }

    const upStr = row.unitPrice.trim();
    const qtyStr = row.quantity.trim();
    const discStr = row.discountPct.trim();

    if (upStr === "") {
      errors[row.key] = `${rowLabel}: nhập đơn giá`;
      return;
    }
    if (qtyStr === "") {
      errors[row.key] = `${rowLabel}: nhập số lượng`;
      return;
    }

    if (countFractionAfterNormalize(upStr) > OUTBOUND_PRICE_MAX_DECIMALS) {
      errors[row.key] = `${rowLabel}: đơn giá tối đa ${OUTBOUND_PRICE_MAX_DECIMALS} số lẻ`;
      return;
    }
    if (countFractionAfterNormalize(qtyStr) > OUTBOUND_QTY_MAX_DECIMALS) {
      errors[row.key] = `${rowLabel}: số lượng tối đa ${OUTBOUND_QTY_MAX_DECIMALS} số lẻ`;
      return;
    }
    if (discStr !== "" && countFractionAfterNormalize(discStr) > OUTBOUND_DISCOUNT_MAX_DECIMALS) {
      errors[row.key] = `${rowLabel}: chiết khấu tối đa ${OUTBOUND_DISCOUNT_MAX_DECIMALS} số lẻ`;
      return;
    }

    const unitPrice = parseOutboundPositiveDecimal(upStr);
    const quantity = parseOutboundPositiveDecimal(qtyStr);
    const discountPct = parseOutboundDiscountPct(discStr);

    if (unitPrice === null) {
      errors[row.key] = `${rowLabel}: đơn giá phải là số dương`;
      return;
    }
    if (quantity === null) {
      errors[row.key] = `${rowLabel}: số lượng phải là số dương`;
      return;
    }
    if (discountPct === null) {
      errors[row.key] = `${rowLabel}: chiết khấu từ 0 đến 100%`;
      return;
    }

    const subtotal = lineSubtotalFromParsed(unitPrice, quantity, discountPct);
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      errors[row.key] = `${rowLabel}: thành tiền không hợp lệ (kiểm tra đơn giá, SL, CK)`;
      return;
    }

    apiLines.push({
      name,
      code: codeStr,
      unit,
      unitPrice,
      quantity,
      discountPct,
      subtotal,
    });
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const contractSummary = [cNote, eNote ? `Sở cứ:\n${eNote}` : ""].filter(Boolean).join("\n\n");
  if (contractSummary.length > 16000) {
    errors.contract_note = "Tổng nội dung hợp đồng + sở cứ quá dài (tối đa 16000 ký tự)";
    return { ok: false, errors };
  }

  return { ok: true, apiLines, contractSummary };
}
