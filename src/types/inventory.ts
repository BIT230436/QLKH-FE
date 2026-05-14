/** Kiểu dữ liệu phiếu xuất kho — khớp API `/api/outbound-receipts`. */

export type OutboundStatus =
  | "Chờ duyệt"
  | "Đã xuất"
  | "Từ chối"
  | "Đã duyệt"
  | "Hoàn hàng";

export type OutboundRow = {
  id: number;
  code: string;
  source: string;
  amount: number;
  at: string;
  status: OutboundStatus;
};

export type OutboundLineDetail = {
  name: string;
  code: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  subtotal: number;
};

export type OutboundDetailModel = {
  id: number;
  listCode: string;
  listSource: string;
  listAmount: number;
  listAt: string;
  listStatus: OutboundStatus;
  sourceCode: string;
  phone: string;
  address: string;
  receiptCode: string;
  warehouseName: string;
  warehouseCode: string;
  reason: string;
  contractSummary: string;
  createdBy: string;
  createdAt: string;
  lines: OutboundLineDetail[];
  scope?: string;
};

/** Kiểu dữ liệu lệnh nhập kho — khớp API `/api/inbound-orders`. */

export type InboundOrderStatus =
  | "Chờ duyệt"
  | "Đã duyệt"
  | "Đang nhập"
  | "Hoàn thành"
  | "Từ chối";

export type InboundOrderRow = {
  id: number;
  orderCode: string;
  sourceDept: string;
  destWarehouse: string;
  amount: number;
  at: string;
  status: InboundOrderStatus;
};

export type InboundOrderLineDetail = {
  name: string;
  code: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  subtotal: number;
};

export type InboundOrderDetailModel = {
  id: number;
  orderCode: string;
  sourceDept: string;
  sourceCode: string;
  destWarehouse: string;
  destWhCode: string;
  listAmount: number;
  listAt: string;
  listStatus: InboundOrderStatus;
  needByDate: string;
  phone: string;
  address: string;
  reason: string;
  approvalNote: string;
  evidenceNote: string;
  createdBy: string;
  createdAt: string;
  lines: InboundOrderLineDetail[];
};

/** Kiểu dữ liệu lệnh xuất kho — khớp API `/api/outbound-orders`. */

export type OutboundOrderStatus =
  | "Chờ duyệt"
  | "Đã duyệt"
  | "Đang xuất"
  | "Hoàn thành"
  | "Từ chối";

export type OutboundOrderRow = {
  id: number;
  orderCode: string;
  destDept: string;
  warehouse: string;
  amount: number;
  at: string;
  status: OutboundOrderStatus;
};

export type OutboundOrderLineDetail = {
  name: string;
  code: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  subtotal: number;
};

export type OutboundOrderDetailModel = {
  id: number;
  orderCode: string;
  destDept: string;
  destCode: string;
  warehouse: string;
  warehouseCode: string;
  listAmount: number;
  listAt: string;
  listStatus: OutboundOrderStatus;
  needByDate: string;
  phone: string;
  address: string;
  reason: string;
  approvalNote: string;
  createdBy: string;
  createdAt: string;
  lines: OutboundOrderLineDetail[];
};

/** Kiểu dữ liệu kiểm kê — khớp API `/api/stock-audits`. */

export type StockAuditStatus = "Nháp" | "Chờ duyệt" | "Hoàn thành" | "Hủy";

export type StockAuditListRow = {
  id: number;
  docCode: string;
  warehouse: string;
  auditedAt: string;
  status: StockAuditStatus;
  preparedBy: string;
  lineCount: number;
};

export type StockAuditLineDetail = {
  name: string;
  code: string;
  unit: string;
  bookQty: number;
  actualQty: number;
  note: string;
};

export type StockAuditDetailModel = {
  id: number;
  docCode: string;
  warehouse: string;
  whCode: string;
  auditedAt: string;
  status: StockAuditStatus;
  preparedBy: string;
  committeeNote: string;
  headerNote: string;
  approvedNote: string;
  lines: StockAuditLineDetail[];
};

/** Kiểu danh mục nguồn hàng — khớp API `/api/catalog/sources`. */

export type CatalogSourceStatus = "Đang dùng" | "Tạm ngưng" | "Nháp";

export type CatalogSourceRow = {
  id: number;
  code: string;
  name: string;
  kind: "Xuất" | "Nhập" | "Xuất / Nhập";
  status: CatalogSourceStatus;
  updatedAt: string;
};

/** Kiểu nhóm hàng hóa — khớp API `/api/catalog/product-groups`. */

export type ProductGroupStatus = "Hoạt động" | "Khóa";

export type ProductGroupRow = {
  id: number;
  groupCode: string;
  groupName: string;
  skuCount: number;
  owner: string;
  status: ProductGroupStatus;
  updatedAt: string;
};

/** Kiểu SKU trong nhóm — khớp API `/api/catalog/skus`. */

export type ProductSkuStatus = "Đang bán" | "Ngưng bán";

export type ProductSkuRow = {
  id: number;
  skuCode: string;
  name: string;
  unit: string;
  retailPrice: number;
  wholesalePrice: number;
  vatPct: number;
  barcode: string;
  note: string;
  groupCode: string;
  status: ProductSkuStatus;
  updatedAt: string;
};
