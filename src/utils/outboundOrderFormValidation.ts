/**
 * Validate form tạo lệnh xuất kho — khớp `outbound_orders` / `outbound_order_lines` (init.sql).
 */
import { normalizeDecimalInput } from "./receiptFormHelpers";
import {
  OUTBOUND_DISCOUNT_MAX_DECIMALS,
  OUTBOUND_LINE_CODE_MAX,
  OUTBOUND_LINE_NAME_MAX,
  OUTBOUND_LINE_UNIT_MAX,
  OUTBOUND_MAX_LINES,
  OUTBOUND_NOTE_MAX,
  OUTBOUND_PRICE_MAX_DECIMALS,
  OUTBOUND_QTY_MAX_DECIMALS,
  parseOutboundDiscountPct,
  parseOutboundPositiveDecimal,
  validateOutboundImageFiles,
  validatePhoneVi,
  type OutboundApiLine,
  type OutboundLineInput,
} from "./outboundReceiptFormValidation";

export const OUTBOUND_ORDER_CODE_MAX = 100;
export const OUTBOUND_ORDER_DEST_DEPT_MAX = 255;
export const OUTBOUND_ORDER_DEST_CODE_MAX = 100;
export const OUTBOUND_ORDER_WAREHOUSE_MAX = 255;

export type OutboundOrderFieldErrors = Partial<Record<string, string>>;

const ORDER_CODE_PATTERN = /^\S+$/;

function countFractionAfterNormalize(raw: string): number {
  const n = normalizeDecimalInput(raw.trim());
  const i = n.indexOf(".");
  if (i === -1) return 0;
  return n.length - i - 1;
}

function lineSubtotalFromParsed(unitPrice: number, quantity: number, discountPct: number): number {
  if (unitPrice <= 0 || quantity <= 0) return Number.NaN;
  const factor = Math.max(0, 1 - discountPct / 100);
  return Math.round(unitPrice * quantity * factor);
}

function validateNeedByDate(raw: string): string | null {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(t)) {
    return "Ngày yêu cầu xuất không hợp lệ";
  }
  const [y, mo, d] = t.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return "Ngày yêu cầu xuất không tồn tại trên lịch";
  }
  return null;
}

export function validateOutboundOrderCreateForm(params: {
  orderCode: string;
  destDept: string;
  destCode: string;
  warehouse: string;
  needByDate: string;
  phone: string;
  address: string;
  reason: string;
  approvalNote: string;
  evidenceNote: string;
  approvalImageFiles: File[];
  evidenceImageFiles: File[];
  lines: OutboundLineInput[];
}): { ok: true; apiLines: OutboundApiLine[]; approvalPayload: string } | { ok: false; errors: OutboundOrderFieldErrors } {
  const errors: OutboundOrderFieldErrors = {};

  const oc = params.orderCode.trim();
  if (oc === "") errors.order_code = "Mã lệnh bắt buộc";
  else if (oc.length > OUTBOUND_ORDER_CODE_MAX) {
    errors.order_code = `Mã lệnh tối đa ${OUTBOUND_ORDER_CODE_MAX} ký tự`;
  } else if (!ORDER_CODE_PATTERN.test(oc)) {
    errors.order_code = "Mã lệnh không được chứa khoảng trắng hoặc xuống dòng";
  }

  const dd = params.destDept.trim();
  if (dd === "") errors.dest_dept = "Bộ phận nhận bắt buộc";
  else if (dd.length > OUTBOUND_ORDER_DEST_DEPT_MAX) {
    errors.dest_dept = `Bộ phận nhận tối đa ${OUTBOUND_ORDER_DEST_DEPT_MAX} ký tự`;
  }

  const dc = params.destCode.trim();
  if (dc.length > OUTBOUND_ORDER_DEST_CODE_MAX) {
    errors.dest_code = `Mã bộ phận / đích tối đa ${OUTBOUND_ORDER_DEST_CODE_MAX} ký tự`;
  }

  const wh = params.warehouse.trim();
  if (wh === "") errors.warehouse = "Kho xuất bắt buộc";
  else if (wh.length > OUTBOUND_ORDER_WAREHOUSE_MAX) {
    errors.warehouse = `Kho xuất tối đa ${OUTBOUND_ORDER_WAREHOUSE_MAX} ký tự`;
  }

  const nbdErr = validateNeedByDate(params.needByDate);
  if (nbdErr) errors.need_by_date = nbdErr;

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

  const aNote = params.approvalNote.trim();
  if (aNote.length > OUTBOUND_NOTE_MAX) {
    errors.approval_note = `Nội dung ghi chú phê duyệt tối đa ${OUTBOUND_NOTE_MAX} ký tự`;
  }
  const eNote = params.evidenceNote.trim();
  if (eNote.length > OUTBOUND_NOTE_MAX) {
    errors.evidence_note = `Nội dung sở cứ / minh chứng tối đa ${OUTBOUND_NOTE_MAX} ký tự`;
  }

  const aImg = validateOutboundImageFiles(params.approvalImageFiles);
  if (aImg) errors.approval_files = aImg;
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

  const approvalPayload = [aNote, eNote ? `Minh chứng:\n${eNote}` : ""].filter(Boolean).join("\n\n");
  if (approvalPayload.length > 16000) {
    errors.approval_note = "Tổng nội dung ghi chú + minh chứng quá dài (tối đa 16000 ký tự)";
    return { ok: false, errors };
  }

  return { ok: true, apiLines, approvalPayload };
}
