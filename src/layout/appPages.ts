/** Các màn hình ứng dụng sau đăng nhập — dùng chung router state và menu. */
export type AppPage =
  | "home"
  | "inbound-list"
  | "inbound-create"
  | "outbound"
  | "outbound-create"
  | "outbound-orders"
  | "outbound-order-create"
  | "inbound-orders"
  | "inbound-order-create"
  | "stock-audit-list"
  | "stock-audit-create"
  | "outbound-internal"
  | "outbound-internal-create"
  | "outbound-nvbh"
  | "outbound-nvbh-create"
  | "catalog-sources"
  | "catalog-product-groups"
  | "report-inbound"
  | "report-stock"
  | "report-io"
  | "contract-list";

/** Các `AppPage` có thể mở từ liên kết thông báo (`link_path` API). */
export const NOTIFICATION_NAVIGABLE_PAGES = [
  "home",
  "inbound-list",
  "inbound-create",
  "outbound",
  "outbound-create",
  "outbound-orders",
  "outbound-order-create",
  "inbound-orders",
  "inbound-order-create",
  "stock-audit-list",
  "stock-audit-create",
  "outbound-internal",
  "outbound-internal-create",
  "outbound-nvbh",
  "outbound-nvbh-create",
  "catalog-sources",
  "catalog-product-groups",
  "report-inbound",
  "report-stock",
  "report-io",
  "contract-list",
] as const satisfies readonly AppPage[];
