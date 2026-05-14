import { http } from "./http";
import type { StockAuditDetailModel, StockAuditListRow } from "../types/inventory";

export async function fetchStockAudits(params: { status?: string; search?: string } = {}): Promise<StockAuditListRow[]> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.search) sp.set("search", params.search);
  const q = sp.toString();
  const { data } = await http.get<StockAuditListRow[]>(`/api/stock-audits${q ? `?${q}` : ""}`);
  return data;
}

export async function fetchStockAuditDetail(id: number): Promise<StockAuditDetailModel> {
  const { data } = await http.get<StockAuditDetailModel>(`/api/stock-audits/${id}`);
  return data;
}

export async function createStockAudit(payload: Record<string, unknown>): Promise<{ id: number }> {
  const { data } = await http.post<{ id: number }>("/api/stock-audits", payload);
  return data;
}

export async function deleteStockAudit(id: number): Promise<void> {
  await http.delete(`/api/stock-audits/${id}`);
}

export async function submitStockAudit(id: number): Promise<void> {
  await http.post(`/api/stock-audits/${id}/submit`);
}

export async function approveStockAudit(id: number): Promise<void> {
  await http.post(`/api/stock-audits/${id}/approve`);
}

export async function cancelStockAudit(id: number): Promise<void> {
  await http.post(`/api/stock-audits/${id}/cancel`);
}
