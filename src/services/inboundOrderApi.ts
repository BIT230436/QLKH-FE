import { http } from "./http";
import type { InboundOrderDetailModel, InboundOrderRow } from "../types/inventory";

export type InboundOrderListParams = {
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  orderCode?: string;
  sourceDept?: string;
  destWarehouse?: string;
};

export async function fetchInboundOrders(params: InboundOrderListParams = {}): Promise<InboundOrderRow[]> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.fromDate) sp.set("fromDate", params.fromDate);
  if (params.toDate) sp.set("toDate", params.toDate);
  if (params.search) sp.set("search", params.search);
  if (params.orderCode) sp.set("orderCode", params.orderCode);
  if (params.sourceDept) sp.set("sourceDept", params.sourceDept);
  if (params.destWarehouse) sp.set("destWarehouse", params.destWarehouse);
  const q = sp.toString();
  const { data } = await http.get<InboundOrderRow[]>(`/api/inbound-orders${q ? `?${q}` : ""}`);
  return data;
}

export async function fetchInboundOrderDetail(id: number): Promise<InboundOrderDetailModel> {
  const { data } = await http.get<InboundOrderDetailModel>(`/api/inbound-orders/${id}`);
  return data;
}

export async function createInboundOrder(payload: Record<string, unknown>): Promise<{ id: number }> {
  const { data } = await http.post<{ id: number }>("/api/inbound-orders", payload);
  return data;
}

export async function deleteInboundOrder(id: number): Promise<void> {
  await http.delete(`/api/inbound-orders/${id}`);
}

export async function approveInboundOrder(id: number): Promise<void> {
  await http.post(`/api/inbound-orders/${id}/approve`);
}

export async function rejectInboundOrder(id: number): Promise<void> {
  await http.post(`/api/inbound-orders/${id}/reject`);
}

export async function startReceivingInboundOrder(id: number): Promise<void> {
  await http.post(`/api/inbound-orders/${id}/start-receiving`);
}

export async function completeInboundOrder(id: number): Promise<void> {
  await http.post(`/api/inbound-orders/${id}/complete`);
}
