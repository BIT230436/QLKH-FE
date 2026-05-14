import { http } from "./http";
import type { OutboundDetailModel, OutboundRow } from "../types/inventory";

export type OutboundReceiptListParams = {
  scope: "ncc" | "internal" | "nvbh";
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
};

export async function fetchOutboundReceipts(params: OutboundReceiptListParams): Promise<OutboundRow[]> {
  const sp = new URLSearchParams();
  sp.set("scope", params.scope);
  if (params.status) sp.set("status", params.status);
  if (params.fromDate) sp.set("fromDate", params.fromDate);
  if (params.toDate) sp.set("toDate", params.toDate);
  if (params.search) sp.set("search", params.search);
  const { data } = await http.get<OutboundRow[]>(`/api/outbound-receipts?${sp.toString()}`);
  return data;
}

export async function fetchOutboundReceiptDetail(id: number): Promise<OutboundDetailModel> {
  const { data } = await http.get<OutboundDetailModel>(`/api/outbound-receipts/${id}`);
  return data;
}

export async function createOutboundReceipt(payload: Record<string, unknown>): Promise<{ id: number }> {
  const { data } = await http.post<{ id: number }>("/api/outbound-receipts", payload);
  return data;
}

export async function deleteOutboundReceipt(id: number): Promise<void> {
  await http.delete(`/api/outbound-receipts/${id}`);
}

export async function approveOutboundReceipt(id: number): Promise<void> {
  await http.post(`/api/outbound-receipts/${id}/approve`);
}

export async function rejectOutboundReceipt(id: number): Promise<void> {
  await http.post(`/api/outbound-receipts/${id}/reject`);
}

export async function markShippedOutboundReceipt(id: number): Promise<void> {
  await http.post(`/api/outbound-receipts/${id}/mark-shipped`);
}

export async function markReturnedOutboundReceipt(id: number): Promise<void> {
  await http.post(`/api/outbound-receipts/${id}/mark-returned`);
}
