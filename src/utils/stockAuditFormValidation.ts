/**
 * Validate form tạo biên bản kiểm kê — khớp `stock_audits` / `stock_audit_lines` (init.sql).
 */
import { normalizeDecimalInput } from "./receiptFormHelpers";
import {
  OUTBOUND_LINE_CODE_MAX,
  OUTBOUND_LINE_NAME_MAX,
  OUTBOUND_LINE_UNIT_MAX,
  OUTBOUND_MAX_LINES,
} from "./outboundReceiptFormValidation";

export const STOCK_AUDIT_DOC_CODE_MAX = 100;
export const STOCK_AUDIT_WAREHOUSE_NAME_MAX = 255;
/** Mã kho nhập tay (UI) — chưa gửi API; giới hạn độ dài để tránh dán văn bản nhầm. */
export const STOCK_AUDIT_WAREHOUSE_CODE_MAX = 100;
export const STOCK_AUDIT_PREPARED_BY_MAX = 255;
export const STOCK_AUDIT_NOTE_MAX = 4000;
export const STOCK_AUDIT_LINE_NOTE_MAX = 4000;
export const STOCK_AUDIT_QTY_MAX_DECIMALS = 3;

export type StockAuditLineInput = {
  key: string;
  name: string;
  code: string;
  unit: string;
  bookQty: string;
  actualQty: string;
  note: string;
};

export type StockAuditApiLine = {
  name: string;
  code: string;
  unit: string;
  bookQty: number;
  actualQty: number;
  note: string;
};

export type StockAuditFieldErrors = Partial<Record<string, string>>;

const DOC_CODE_PATTERN = /^\S+$/;

function countFractionAfterNormalize(raw: string): number {
  const n = normalizeDecimalInput(raw.trim());
  const i = n.indexOf(".");
  if (i === -1) return 0;
  return n.length - i - 1;
}

/** SL sổ sách / thực tế: bắt buộc, ≥ 0, hữu hạn. */
export function parseStockAuditQty(raw: string): number | null {
  const n = normalizeDecimalInput(raw.trim());
  if (n === "") return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

function validateAuditDate(raw: string): string | null {
  const t = raw.trim();
  if (t === "") return "Ngày kiểm bắt buộc";
  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(t)) {
    return "Ngày kiểm không hợp lệ";
  }
  const [y, mo, d] = t.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return "Ngày kiểm không tồn tại trên lịch";
  }
  return null;
}

export function validateStockAuditCreateForm(params: {
  docCode: string;
  warehouseName: string;
  warehouseCode: string;
  auditDate: string;
  committeeNote: string;
  headerNote: string;
  preparedBy: string;
  lines: StockAuditLineInput[];
}): { ok: true; apiLines: StockAuditApiLine[] } | { ok: false; errors: StockAuditFieldErrors } {
  const errors: StockAuditFieldErrors = {};

  const dc = params.docCode.trim();
  if (dc !== "") {
    if (dc.length > STOCK_AUDIT_DOC_CODE_MAX) {
      errors.doc_code = `Mã biên bản tối đa ${STOCK_AUDIT_DOC_CODE_MAX} ký tự`;
    } else if (!DOC_CODE_PATTERN.test(dc)) {
      errors.doc_code = "Mã biên bản không được chứa khoảng trắng hoặc xuống dòng";
    }
  }

  const wh = params.warehouseName.trim();
  if (wh === "") errors.warehouse_name = "Kho kiểm bắt buộc";
  else if (wh.length > STOCK_AUDIT_WAREHOUSE_NAME_MAX) {
    errors.warehouse_name = `Kho kiểm tối đa ${STOCK_AUDIT_WAREHOUSE_NAME_MAX} ký tự`;
  }

  const wc = params.warehouseCode.trim();
  if (wc.length > STOCK_AUDIT_WAREHOUSE_CODE_MAX) {
    errors.warehouse_code = `Mã kho tối đa ${STOCK_AUDIT_WAREHOUSE_CODE_MAX} ký tự`;
  }

  const dateErr = validateAuditDate(params.auditDate);
  if (dateErr) errors.audit_date = dateErr;

  const committee = params.committeeNote.trim();
  if (committee.length > STOCK_AUDIT_NOTE_MAX) {
    errors.committee_note = `Hội đồng kiểm kê tối đa ${STOCK_AUDIT_NOTE_MAX} ký tự`;
  }

  const header = params.headerNote.trim();
  if (header.length > STOCK_AUDIT_NOTE_MAX) {
    errors.header_note = `Diễn giải / mục đích tối đa ${STOCK_AUDIT_NOTE_MAX} ký tự`;
  }

  const prep = params.preparedBy.trim();
  if (prep.length > STOCK_AUDIT_PREPARED_BY_MAX) {
    errors.prepared_by = `Người lập tối đa ${STOCK_AUDIT_PREPARED_BY_MAX} ký tự`;
  }

  if (!params.lines.length) {
    errors.lines = "Cần ít nhất một dòng hàng";
    return { ok: false, errors };
  }
  if (params.lines.length > OUTBOUND_MAX_LINES) {
    errors.lines = `Tối đa ${OUTBOUND_MAX_LINES} dòng`;
    return { ok: false, errors };
  }

  const codeGroups = new Map<string, string[]>();
  for (const row of params.lines) {
    const c = row.code.trim().toLowerCase();
    if (c === "") continue;
    const list = codeGroups.get(c) ?? [];
    list.push(row.key);
    codeGroups.set(c, list);
  }
  for (const [, keys] of codeGroups) {
    if (keys.length > 1) {
      for (const k of keys) {
        errors[k] = "Mã hàng trùng trong biên bản";
      }
    }
  }

  const apiLines: StockAuditApiLine[] = [];

  params.lines.forEach((row, idx) => {
    const rowLabel = `Dòng ${idx + 1}`;
    const name = row.name.trim();
    const unit = row.unit.trim();
    const codeStr = row.code.trim();
    const noteT = row.note.trim();

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
    if (noteT.length > STOCK_AUDIT_LINE_NOTE_MAX) {
      errors[row.key] = `${rowLabel}: ghi chú tối đa ${STOCK_AUDIT_LINE_NOTE_MAX} ký tự`;
      return;
    }

    const bStr = row.bookQty.trim();
    const aStr = row.actualQty.trim();
    if (bStr === "") {
      errors[row.key] = `${rowLabel}: nhập SL sổ sách`;
      return;
    }
    if (aStr === "") {
      errors[row.key] = `${rowLabel}: nhập SL thực tế`;
      return;
    }

    if (countFractionAfterNormalize(bStr) > STOCK_AUDIT_QTY_MAX_DECIMALS) {
      errors[row.key] = `${rowLabel}: SL sổ sách tối đa ${STOCK_AUDIT_QTY_MAX_DECIMALS} số lẻ`;
      return;
    }
    if (countFractionAfterNormalize(aStr) > STOCK_AUDIT_QTY_MAX_DECIMALS) {
      errors[row.key] = `${rowLabel}: SL thực tế tối đa ${STOCK_AUDIT_QTY_MAX_DECIMALS} số lẻ`;
      return;
    }

    const bookQty = parseStockAuditQty(bStr);
    const actualQty = parseStockAuditQty(aStr);
    if (bookQty === null) {
      errors[row.key] = `${rowLabel}: SL sổ sách phải là số ≥ 0`;
      return;
    }
    if (actualQty === null) {
      errors[row.key] = `${rowLabel}: SL thực tế phải là số ≥ 0`;
      return;
    }

    apiLines.push({
      name,
      code: codeStr,
      unit,
      bookQty,
      actualQty,
      note: noteT,
    });
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, apiLines };
}
