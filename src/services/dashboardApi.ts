import { http } from "./http";

export type DashboardSummary = {
  receiptsByStatus: Record<string, number>;
  receiptTotal: number;
  inboundOrdersByStatus: Record<string, number>;
  outboundOrdersByStatus: Record<string, number>;
  outboundReceiptsByStatus: Record<string, number>;
  outboundReceiptTotal: number;
  stockAuditsByStatus: Record<string, number>;
  catalogSources: number;
  productGroups: number;
};

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await http.get<DashboardSummary>("/api/dashboard/summary");
  return data;
}
