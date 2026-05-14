import { http } from "./http";
import type { OutboundOrderDetailModel, OutboundOrderRow } from "../types/inventory";

export type OutboundOrderListParams = {
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  orderCode?: string;
  destDept?: string;
  warehouse?: string;
};

export async function fetchOutboundOrders(params: OutboundOrderListParams = {}): Promise<OutboundOrderRow[]> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.fromDate) sp.set("fromDate", params.fromDate);
  if (params.toDate) sp.set("toDate", params.toDate);
  if (params.search) sp.set("search", params.search);
  if (params.orderCode) sp.set("orderCode", params.orderCode);
  if (params.destDept) sp.set("destDept", params.destDept);
  if (params.warehouse) sp.set("warehouse", params.warehouse);
  const q = sp.toString();
  const { data } = await http.get<OutboundOrderRow[]>(`/api/outbound-orders${q ? `?${q}` : ""}`);
  return data;
}

export async function fetchOutboundOrderDetail(id: number): Promise<OutboundOrderDetailModel> {
  const { data } = await http.get<OutboundOrderDetailModel>(`/api/outbound-orders/${id}`);
  return data;
}

export async function createOutboundOrder(payload: Record<string, unknown>): Promise<{ id: number }> {
  const { data } = await http.post<{ id: number }>("/api/outbound-orders", payload);
  return data;
}

export async function deleteOutboundOrder(id: number): Promise<void> {
  await http.delete(`/api/outbound-orders/${id}`);
}

export async function approveOutboundOrder(id: number): Promise<void> {
  await http.post(`/api/outbound-orders/${id}/approve`);
}

export async function rejectOutboundOrder(id: number): Promise<void> {
  await http.post(`/api/outbound-orders/${id}/reject`);
}

export async function startShippingOutboundOrder(id: number): Promise<void> {
  await http.post(`/api/outbound-orders/${id}/start-shipping`);
}

export async function completeOutboundOrder(id: number): Promise<void> {
  await http.post(`/api/outbound-orders/${id}/complete`);
}
