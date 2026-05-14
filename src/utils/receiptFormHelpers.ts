/** Giới hạn khớp backend (schema + receiptValidation) */
export const RECEIPT_CODE_MAX_LEN = 100;
export const NOTE_MAX_LEN = 2000;
export const MAX_LINE_ITEMS = 200;
export const QTY_MAX_DECIMALS = 3;
export const PRICE_MAX_DECIMALS = 2;

/** Đầu ngày theo lịch máy người dùng → ISO (dùng khi API cần timestamp; document_date dùng YYYY-MM-DD trực tiếp) */
export function localDateInputToIso(dateStr: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const localMidnight = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (
    localMidnight.getFullYear() !== y ||
    localMidnight.getMonth() !== mo - 1 ||
    localMidnight.getDate() !== d
  ) {
    return null;
  }
  return localMidnight.toISOString();
}

/**
 * Chuẩn hoá chuỗi số nhập tay (VN: `1.234,56` / `15.000`; EN: `15000.00`) về dạng một dấu `.` thập phân.
 * Dùng chung cho đếm số lẻ, validate và gửi API.
 */
export function normalizeDecimalInput(raw: string): string {
  const t = raw.trim();
  if (t === "") return "";
  if (t.includes(",")) {
    return t.replace(/\./g, "").replace(",", ".");
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    return t.replace(/\./g, "");
  }
  return t;
}

export function countFractionDigits(raw: string): number {
  const n = normalizeDecimalInput(raw);
  const i = n.indexOf(".");
  if (i === -1) return 0;
  return n.length - i - 1;
}

export function parsePositiveFinite(raw: string): number | null {
  const n = normalizeDecimalInput(raw);
  if (n === "") return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

export function parseNonNegativeInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export type FormFieldErrors = Partial<Record<string, string>>;

export function validateReceiptForm(params: {
  receiptCode: string;
  supplierId: string;
  warehouseId: string;
  documentDate: string;
  lines: Array<{
    key: string;
    productId: string;
    quantityDoc: string;
    quantityReceived: string;
    unitPrice: string;
  }>;
}): FormFieldErrors {
  const next: FormFieldErrors = {};
  const code = params.receiptCode.trim();

  if (code === "") next.receipt_code = "Mã phiếu bắt buộc";
  else if (code.length > RECEIPT_CODE_MAX_LEN) {
    next.receipt_code = `Tối đa ${RECEIPT_CODE_MAX_LEN} ký tự`;
  }

  if (params.supplierId === "") next.supplier = "Chọn nhà cung cấp";
  if (params.warehouseId === "") next.warehouse = "Chọn kho nhập";

  const doc = params.documentDate.trim();
  if (doc === "") next.document_date = "Chọn ngày chứng từ";
  else if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(doc)) {
    next.document_date = "Ngày không hợp lệ";
  }

  if (!params.lines.length) {
    next.lines = "Cần ít nhất một dòng sản phẩm";
    return next;
  }
  if (params.lines.length > MAX_LINE_ITEMS) {
    next.lines = `Tối đa ${MAX_LINE_ITEMS} dòng`;
    return next;
  }

  params.lines.forEach((ln, idx) => {
    const rowLabel = `Dòng ${idx + 1}`;
    if (!ln.productId) {
      next[ln.key] = `${rowLabel}: chọn sản phẩm`;
      return;
    }
    const qDocStr = ln.quantityDoc.trim();
    const qRecStr = ln.quantityReceived.trim();
    const priceStr = ln.unitPrice.trim();
    if (qDocStr === "") {
      next[ln.key] = `${rowLabel}: nhập SL theo chứng từ`;
      return;
    }
    if (qRecStr === "") {
      next[ln.key] = `${rowLabel}: nhập SL thực nhập`;
      return;
    }
    if (priceStr === "") {
      next[ln.key] = `${rowLabel}: nhập đơn giá`;
      return;
    }
    if (countFractionDigits(qDocStr) > QTY_MAX_DECIMALS) {
      next[ln.key] = `${rowLabel}: SL theo CT tối đa ${QTY_MAX_DECIMALS} số lẻ`;
      return;
    }
    if (countFractionDigits(qRecStr) > QTY_MAX_DECIMALS) {
      next[ln.key] = `${rowLabel}: SL thực nhập tối đa ${QTY_MAX_DECIMALS} số lẻ`;
      return;
    }
    if (countFractionDigits(priceStr) > PRICE_MAX_DECIMALS) {
      next[ln.key] = `${rowLabel}: đơn giá tối đa ${PRICE_MAX_DECIMALS} số lẻ`;
      return;
    }
    const qDoc = parsePositiveFinite(qDocStr);
    const qRec = parsePositiveFinite(qRecStr);
    const price = parsePositiveFinite(priceStr);
    if (qDoc === null) next[ln.key] = `${rowLabel}: SL theo CT phải là số dương`;
    else if (qRec === null) next[ln.key] = `${rowLabel}: SL thực nhập phải là số dương`;
    else if (price === null) next[ln.key] = `${rowLabel}: đơn giá phải là số dương`;
  });

  return next;
}

export function isFormValid(errors: FormFieldErrors): boolean {
  return Object.keys(errors).length === 0;
}
