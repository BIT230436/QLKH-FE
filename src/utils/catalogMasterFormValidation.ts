/**
 * Validate form danh mục master: nguồn hàng, nhóm hàng, hợp đồng — khớp init.sql + API backend.
 */
import { normalizeDecimalInput } from "./receiptFormHelpers";
import type { CatalogSourceRow, CatalogSourceStatus, ProductGroupStatus } from "../types/inventory";
import type { ContractPayload, ContractStatus } from "../services/contractsApi";

export const CATALOG_SOURCE_CODE_MAX = 100;
export const CATALOG_SOURCE_NAME_MAX = 255;

export const PRODUCT_GROUP_CODE_MAX = 50;
export const PRODUCT_GROUP_NAME_MAX = 255;
export const PRODUCT_GROUP_OWNER_MAX = 255;

export const CONTRACT_CODE_MAX = 100;
export const CONTRACT_TITLE_MAX = 500;
export const CONTRACT_COUNTERPARTY_REF_MAX = 200;
export const CONTRACT_NOTE_MAX = 4000;
export const CONTRACT_CURRENCY_MAX = 10;
export const CONTRACT_FILE_URL_MAX = 2048;

const CODE_NO_WS = /^\S+$/;

export const CATALOG_SOURCE_KINDS: CatalogSourceRow["kind"][] = ["Xuất", "Nhập", "Xuất / Nhập"];
export const CATALOG_SOURCE_STATUSES: CatalogSourceStatus[] = ["Đang dùng", "Tạm ngưng", "Nháp"];
export const PRODUCT_GROUP_STATUSES: ProductGroupStatus[] = ["Hoạt động", "Khóa"];

export const CONTRACT_STATUSES: ContractStatus[] = ["Nháp", "Hiệu lực", "Hết hạn", "Đã đóng", "Tạm dừng"];

export type CatalogSourceFieldErrors = Partial<Record<"code" | "name" | "kind" | "status", string>>;
export type ProductGroupFieldErrors = Partial<
  Record<"group_code" | "group_name" | "owner_label" | "status", string>
>;
export type ContractFieldErrors = Partial<
  Record<
    | "contract_code"
    | "title"
    | "supplier_id"
    | "status"
    | "signed_date"
    | "effective_from"
    | "effective_to"
    | "value_amount"
    | "currency"
    | "counterparty_ref"
    | "file_url"
    | "note",
    string
  >
>;

export function validateCatalogSourceForm(params: {
  code: string;
  name: string;
  kind: CatalogSourceRow["kind"];
  status: CatalogSourceStatus;
}): { ok: true } | { ok: false; errors: CatalogSourceFieldErrors } {
  const errors: CatalogSourceFieldErrors = {};
  const code = params.code.trim();
  if (code === "") errors.code = "Mã nguồn bắt buộc";
  else if (code.length > CATALOG_SOURCE_CODE_MAX) {
    errors.code = `Mã nguồn tối đa ${CATALOG_SOURCE_CODE_MAX} ký tự`;
  } else if (!CODE_NO_WS.test(code)) {
    errors.code = "Mã không được chứa khoảng trắng hoặc xuống dòng";
  }

  const name = params.name.trim();
  if (name === "") errors.name = "Tên nguồn bắt buộc";
  else if (name.length > CATALOG_SOURCE_NAME_MAX) {
    errors.name = `Tên nguồn tối đa ${CATALOG_SOURCE_NAME_MAX} ký tự`;
  }

  if (!CATALOG_SOURCE_KINDS.includes(params.kind)) {
    errors.kind = "Loại nguồn không hợp lệ";
  }
  if (!CATALOG_SOURCE_STATUSES.includes(params.status)) {
    errors.status = "Trạng thái không hợp lệ";
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

export function validateProductGroupCreateForm(params: {
  groupCode: string;
  groupName: string;
  ownerLabel: string;
  status: ProductGroupStatus;
}): { ok: true } | { ok: false; errors: ProductGroupFieldErrors } {
  const errors: ProductGroupFieldErrors = {};
  const gc = params.groupCode.trim();
  if (gc === "") errors.group_code = "Mã nhóm bắt buộc";
  else if (gc.length > PRODUCT_GROUP_CODE_MAX) {
    errors.group_code = `Mã nhóm tối đa ${PRODUCT_GROUP_CODE_MAX} ký tự`;
  } else if (!CODE_NO_WS.test(gc)) {
    errors.group_code = "Mã nhóm không được chứa khoảng trắng hoặc xuống dòng";
  }

  const gn = params.groupName.trim();
  if (gn === "") errors.group_name = "Tên nhóm bắt buộc";
  else if (gn.length > PRODUCT_GROUP_NAME_MAX) {
    errors.group_name = `Tên nhóm tối đa ${PRODUCT_GROUP_NAME_MAX} ký tự`;
  }

  const ow = params.ownerLabel.trim();
  if (ow.length > PRODUCT_GROUP_OWNER_MAX) {
    errors.owner_label = `Bộ phận tối đa ${PRODUCT_GROUP_OWNER_MAX} ký tự`;
  }

  if (!PRODUCT_GROUP_STATUSES.includes(params.status)) {
    errors.status = "Trạng thái không hợp lệ";
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

function parseYyyyMmDdOptional(raw: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(t)) {
    return { ok: false, message: "Định dạng ngày không hợp lệ (YYYY-MM-DD)" };
  }
  const [y, mo, d] = t.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return { ok: false, message: "Ngày không tồn tại trên lịch" };
  }
  return { ok: true, value: t };
}

function parseOptionalHttpsUrl(raw: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  if (t.length > CONTRACT_FILE_URL_MAX) {
    return { ok: false, message: `URL tối đa ${CONTRACT_FILE_URL_MAX} ký tự` };
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, message: "URL phải bắt đầu bằng http:// hoặc https://" };
    }
  } catch {
    return { ok: false, message: "URL không hợp lệ" };
  }
  return { ok: true, value: t };
}

function parseContractMoney(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const n = normalizeDecimalInput(raw.trim());
  if (n === "") return { ok: true, value: 0 };
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) {
    return { ok: false, message: "Giá trị phải là số ≥ 0" };
  }
  return { ok: true, value: v };
}

export function validateContractForm(params: {
  contractCode: string;
  title: string;
  supplierId: string;
  status: ContractStatus;
  signedDate: string;
  effectiveFrom: string;
  effectiveTo: string;
  valueAmount: string;
  currency: string;
  counterpartyRef: string;
  note: string;
  fileUrl: string;
  outboundReceiptId: number | null;
}): { ok: true; payload: ContractPayload } | { ok: false; errors: ContractFieldErrors } {
  const errors: ContractFieldErrors = {};

  const contractCode = params.contractCode.trim();
  if (contractCode === "") errors.contract_code = "Mã hợp đồng bắt buộc";
  else if (contractCode.length > CONTRACT_CODE_MAX) {
    errors.contract_code = `Mã hợp đồng tối đa ${CONTRACT_CODE_MAX} ký tự`;
  } else if (!CODE_NO_WS.test(contractCode)) {
    errors.contract_code = "Mã không được chứa khoảng trắng hoặc xuống dòng";
  }

  const title = params.title.trim();
  if (title === "") errors.title = "Tiêu đề bắt buộc";
  else if (title.length > CONTRACT_TITLE_MAX) {
    errors.title = `Tiêu đề tối đa ${CONTRACT_TITLE_MAX} ký tự`;
  }

  const supplierId = Number(params.supplierId);
  if (!params.supplierId.trim() || !Number.isFinite(supplierId) || supplierId <= 0) {
    errors.supplier_id = "Chọn nhà cung cấp";
  }

  if (!CONTRACT_STATUSES.includes(params.status)) {
    errors.status = "Trạng thái không hợp lệ";
  }

  const sd = parseYyyyMmDdOptional(params.signedDate);
  if (!sd.ok) errors.signed_date = sd.message;

  const ef = parseYyyyMmDdOptional(params.effectiveFrom);
  if (!ef.ok) errors.effective_from = ef.message;

  const et = parseYyyyMmDdOptional(params.effectiveTo);
  if (!et.ok) errors.effective_to = et.message;

  if (!errors.effective_from && !errors.effective_to && ef.ok && et.ok && ef.value && et.value && et.value < ef.value) {
    errors.effective_to = "Ngày hiệu lực đến phải ≥ hiệu lực từ";
  }

  let valueAmount = 0;
  const money = parseContractMoney(params.valueAmount);
  if (!money.ok) errors.value_amount = money.message;
  else valueAmount = money.value;

  const cur = (params.currency.trim() || "VND").slice(0, CONTRACT_CURRENCY_MAX);
  if (cur.length === 0) errors.currency = "Loại tiền bắt buộc";
  else if (params.currency.trim().length > CONTRACT_CURRENCY_MAX) {
    errors.currency = `Loại tiền tối đa ${CONTRACT_CURRENCY_MAX} ký tự`;
  }

  const cref = params.counterpartyRef.trim();
  if (cref.length > CONTRACT_COUNTERPARTY_REF_MAX) {
    errors.counterparty_ref = `Mã tham chiếu NCC tối đa ${CONTRACT_COUNTERPARTY_REF_MAX} ký tự`;
  }

  const note = params.note.trim();
  if (note.length > CONTRACT_NOTE_MAX) {
    errors.note = `Ghi chú tối đa ${CONTRACT_NOTE_MAX} ký tự`;
  }

  const fu = parseOptionalHttpsUrl(params.fileUrl);
  if (!fu.ok) errors.file_url = fu.message;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const payload: ContractPayload = {
    contractCode,
    title,
    supplierId,
    status: params.status,
    valueAmount,
    currency: cur,
    counterpartyRef: cref,
    note,
  };

  if (sd.ok && sd.value) payload.signedDate = sd.value;
  if (ef.ok && ef.value) payload.effectiveFrom = ef.value;
  if (et.ok && et.value) payload.effectiveTo = et.value;
  if (fu.ok && fu.value) payload.fileUrl = fu.value;
  if (params.outboundReceiptId != null && params.outboundReceiptId > 0) {
    payload.outboundReceiptId = params.outboundReceiptId;
  } else {
    payload.outboundReceiptId = null;
  }

  return { ok: true, payload };
}
