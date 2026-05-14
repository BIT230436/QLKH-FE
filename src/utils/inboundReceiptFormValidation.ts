/**
 * Validate tạo phiếu nhập kho — khớp `receiptValidation.ts` (backend) + quy tắc nghiệp vụ.
 */
import type { FormFieldErrors } from "./receiptFormHelpers";
import {
  NOTE_MAX_LEN,
  parseNonNegativeInt,
  validateReceiptForm,
} from "./receiptFormHelpers";

export const INBOUND_VT_TEXT_MAX = 255;
export const INBOUND_VT_ACCOUNT_MAX = 32;
export const INBOUND_VT_SOURCE_DOC_NO_MAX = 100;
export const INBOUND_ATTACH_LABEL_MAX = 255;
export const INBOUND_ATTACH_URL_MAX = 2048;
export const INBOUND_MAX_ATTACHMENTS = 20;

/** Prefix tránh trùng key với UUID dòng sản phẩm trong cùng `fieldErrors`. */
export function inboundAttachmentErrorKey(rowKey: string): string {
  return `attachment:${rowKey}`;
}

export type InboundVtFieldsInput = {
  orgUnit: string;
  department: string;
  debitAccount: string;
  creditAccount: string;
  delivererName: string;
  sourceDocNo: string;
  sourceDocDate: string;
  sourceDocNote: string;
  attachedCount: string;
};

export type InboundAttachmentRowInput = { key: string; label: string; url: string };

/** Mã phiếu: không khoảng trắng / xuống dòng (trim ở payload; kiểm tra chuỗi đã trim). */
const RECEIPT_CODE_PATTERN = /^\S+$/;

/** TK kế toán (tùy chọn): chữ số và dấu phân tách phổ biến, độ dài theo DB. */
const ACCOUNT_CODE_PATTERN = /^[0-9A-Za-z.\-]+$/;

function mergeErrors(target: FormFieldErrors, src: FormFieldErrors): void {
  for (const [k, v] of Object.entries(src)) {
    if (v) target[k] = v;
  }
}

function validateVtAndDates(
  vt: InboundVtFieldsInput,
  documentDate: string,
  errors: FormFieldErrors
): void {
  const ou = vt.orgUnit.trim();
  if (ou.length > INBOUND_VT_TEXT_MAX) {
    errors.org_unit = `Đơn vị tối đa ${INBOUND_VT_TEXT_MAX} ký tự`;
  }

  const dep = vt.department.trim();
  if (dep.length > INBOUND_VT_TEXT_MAX) {
    errors.department = `Bộ phận tối đa ${INBOUND_VT_TEXT_MAX} ký tự`;
  }

  const da = vt.debitAccount.trim();
  if (da.length > 0) {
    if (da.length > INBOUND_VT_ACCOUNT_MAX) {
      errors.debit_account = `TK Nợ tối đa ${INBOUND_VT_ACCOUNT_MAX} ký tự`;
    } else if (!ACCOUNT_CODE_PATTERN.test(da)) {
      errors.debit_account = "TK Nợ chỉ gồm chữ, số, dấu chấm và gạch ngang";
    }
  }

  const ca = vt.creditAccount.trim();
  if (ca.length > 0) {
    if (ca.length > INBOUND_VT_ACCOUNT_MAX) {
      errors.credit_account = `TK Có tối đa ${INBOUND_VT_ACCOUNT_MAX} ký tự`;
    } else if (!ACCOUNT_CODE_PATTERN.test(ca)) {
      errors.credit_account = "TK Có chỉ gồm chữ, số, dấu chấm và gạch ngang";
    }
  }

  const del = vt.delivererName.trim();
  if (del.length > INBOUND_VT_TEXT_MAX) {
    errors.deliverer_name = `Họ tên người giao tối đa ${INBOUND_VT_TEXT_MAX} ký tự`;
  }

  const sno = vt.sourceDocNo.trim();
  if (sno.length > INBOUND_VT_SOURCE_DOC_NO_MAX) {
    errors.source_doc_no = `Số chứng từ gốc tối đa ${INBOUND_VT_SOURCE_DOC_NO_MAX} ký tự`;
  }

  const note = vt.sourceDocNote;
  if (note.length > NOTE_MAX_LEN) {
    errors.source_doc_note = `Diễn giải tối đa ${NOTE_MAX_LEN} ký tự`;
  }

  const attached = parseNonNegativeInt(vt.attachedCount);
  if (attached === null) {
    errors.attached_count = "Số chứng từ kèm theo phải là số nguyên ≥ 0";
  }

  const doc = documentDate.trim();
  const sdd = vt.sourceDocDate.trim();
  if (doc && sdd && /^(\d{4})-(\d{2})-(\d{2})$/.test(doc) && /^(\d{4})-(\d{2})-(\d{2})$/.test(sdd)) {
    if (sdd > doc) {
      errors.source_doc_date = "Ngày chứng từ gốc không được sau ngày chứng từ phiếu";
    }
  }
}

function validateAttachmentRows(rows: InboundAttachmentRowInput[], errors: FormFieldErrors): void {
  const withUrl = rows.filter((r) => r.url.trim() !== "");
  if (withUrl.length > INBOUND_MAX_ATTACHMENTS) {
    errors.attachments = `Tối đa ${INBOUND_MAX_ATTACHMENTS} liên kết có URL`;
  }

  for (const r of rows) {
    const ek = inboundAttachmentErrorKey(r.key);
    const u = r.url.trim();
    const lab = r.label.trim();

    if (lab.length > INBOUND_ATTACH_LABEL_MAX) {
      errors[ek] = `Nhãn tối đa ${INBOUND_ATTACH_LABEL_MAX} ký tự`;
      continue;
    }

    if (lab && !u) {
      errors[ek] = "Có nhãn thì phải nhập URL https";
      continue;
    }

    if (!u) continue;

    if (!/^https:\/\//i.test(u)) {
      errors[ek] = "Chỉ chấp nhận liên kết https://";
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      errors[ek] = "URL không hợp lệ";
      continue;
    }

    if (parsed.protocol !== "https:") {
      errors[ek] = "Chỉ chấp nhận giao thức https";
      continue;
    }

    if (u.length > INBOUND_ATTACH_URL_MAX) {
      errors[ek] = `URL tối đa ${INBOUND_ATTACH_URL_MAX} ký tự`;
    }
  }
}

/**
 * Gom validate header + dòng hàng (dùng `validateReceiptForm`) + 01-VT + đính kèm URL + mã phiếu.
 */
export function validateInboundReceiptCreateForm(params: {
  receiptCode: string;
  supplierId: string;
  warehouseId: string;
  documentDate: string;
  vt: InboundVtFieldsInput;
  attachments: InboundAttachmentRowInput[];
  lines: Parameters<typeof validateReceiptForm>[0]["lines"];
}): FormFieldErrors {
  const errors: FormFieldErrors = {};

  const base = validateReceiptForm({
    receiptCode: params.receiptCode,
    supplierId: params.supplierId,
    warehouseId: params.warehouseId,
    documentDate: params.documentDate,
    lines: params.lines,
  });
  mergeErrors(errors, base);

  const code = params.receiptCode.trim();
  if (code.length > 0 && !RECEIPT_CODE_PATTERN.test(code)) {
    errors.receipt_code = "Mã phiếu không được chứa khoảng trắng hoặc xuống dòng";
  }

  validateVtAndDates(params.vt, params.documentDate, errors);
  validateAttachmentRows(params.attachments, errors);

  return errors;
}

export function isInboundFormValid(errors: FormFieldErrors): boolean {
  return Object.keys(errors).length === 0;
}
