import type { AppPage } from "./appPages";

/** Hành động menu — khớp handler trong `InventoryPages`. */
export type NavAction =
  | "inbound-list"
  | "inbound-create"
  | "outbound"
  | "outbound-nvbh"
  | "outbound-orders"
  | "inbound-orders"
  | "stock-audit-list"
  | "stock-audit-create"
  | "outbound-internal"
  | "catalog-sources"
  | "catalog-product-groups"
  | "report-inbound"
  | "report-stock"
  | "report-io"
  | "contract-list";

export type NavId = "ncc" | "internal" | "nvbh" | "inventory-check" | "reports" | "catalog";

export type NavSubItem = { label: string; action: NavAction };

export type NavGroupDef = { title: string; items: NavSubItem[] };

/** Icon sidebar — map sang SVG trong AppShell (không dùng emoji). */
export type NavSectionIconKey = "package" | "clipboard" | "retail" | "audit" | "chart" | "folder";

export type NavSectionDef = { id: NavId; label: string; icon: NavSectionIconKey; groups: NavGroupDef[] };

/** Cấu trúc menu theo wireframe mẫu (nhóm Xuất kho / Nhập kho). */
export const APP_NAV_SECTIONS: NavSectionDef[] = [
  {
    id: "ncc",
    label: "Xuất - nhập với NCC",
    icon: "package",
    groups: [
      { title: "Xuất kho", items: [{ label: "Phiếu xuất kho", action: "outbound" }] },
      {
        title: "Nhập kho",
        items: [{ label: "Phiếu nhập kho", action: "inbound-list" }],
      },
    ],
  },
  {
    id: "internal",
    label: "Xuất - nhập với Nội bộ",
    icon: "clipboard",
    groups: [
      {
        title: "Xuất kho",
        items: [
          { label: "Lệnh xuất kho", action: "outbound-orders" },
          { label: "Phiếu xuất kho", action: "outbound-internal" },
        ],
      },
      {
        title: "Nhập kho",
        items: [{ label: "Lệnh nhập kho", action: "inbound-orders" }],
      },
    ],
  },
  {
    id: "nvbh",
    label: "Xuất - nhập với NVBH",
    icon: "retail",
    groups: [{ title: "Xuất kho", items: [{ label: "Phiếu xuất kho", action: "outbound-nvbh" }] }],
  },
  {
    id: "inventory-check",
    label: "Quản lý kiểm kê",
    icon: "audit",
    groups: [
      {
        title: "",
        items: [{ label: "Danh sách biên bản kiểm kê", action: "stock-audit-list" }],
      },
    ],
  },
  {
    id: "reports",
    label: "Báo cáo thống kê",
    icon: "chart",
    groups: [
      {
        title: "",
        items: [
          { label: "Báo cáo nhập kho", action: "report-inbound" },
          { label: "Báo cáo tồn kho", action: "report-stock" },
          { label: "Báo cáo xuất nhập tồn", action: "report-io" },
        ],
      },
    ],
  },
  {
    id: "catalog",
    label: "Danh mục",
    icon: "folder",
    groups: [
      {
        title: "",
        items: [
          { label: "Nguồn hàng xuất/nhập", action: "catalog-sources" },
          { label: "Danh mục hàng hóa", action: "catalog-product-groups" },
          { label: "Hợp đồng", action: "contract-list" },
        ],
      },
    ],
  },
];

/** Trang hiện tại → mục menu cần highlight (hoặc tổng quan). */
export function activeNavTarget(page: AppPage): "overview" | NavAction | null {
  if (page === "home") return "overview";
  const map: Partial<Record<AppPage, NavAction>> = {
    "inbound-list": "inbound-list",
    "inbound-create": "inbound-list",
    outbound: "outbound",
    "outbound-create": "outbound",
    "outbound-orders": "outbound-orders",
    "outbound-order-create": "outbound-orders",
    "inbound-orders": "inbound-orders",
    "inbound-order-create": "inbound-orders",
    "stock-audit-list": "stock-audit-list",
    "stock-audit-create": "stock-audit-list",
    "outbound-internal": "outbound-internal",
    "outbound-internal-create": "outbound-internal",
    "outbound-nvbh": "outbound-nvbh",
    "outbound-nvbh-create": "outbound-nvbh",
    "catalog-sources": "catalog-sources",
    "catalog-product-groups": "catalog-product-groups",
    "report-inbound": "report-inbound",
    "report-stock": "report-stock",
    "report-io": "report-io",
    "contract-list": "contract-list",
  };
  return map[page] ?? null;
}

export function sectionContainingAction(action: NavAction): NavId | null {
  for (const s of APP_NAV_SECTIONS) {
    for (const g of s.groups) {
      if (g.items.some((i) => i.action === action)) return s.id;
    }
  }
  return null;
}
