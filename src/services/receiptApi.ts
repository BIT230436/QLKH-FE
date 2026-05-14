import type { CreateReceiptPayload, ReceiptDetail, ReceiptListResponse } from "./types";
import { http } from "./http";

export type ReceiptListParams = {
  page?: number;
  pageSize?: number;
  from_date?: string;
  to_date?: string;
  warehouse_id?: string;
  supplier_id?: string;
  receipt_code?: string;
  status?: "" | "draft" | "posted";
};

export type ReceiptReportTotals = {
  totalCount: number;
  sumTotalAmount: string;
};

function receiptListQueryString(params: ReceiptListParams): string {
  const sp = new URLSearchParams();
  if (params.page !== undefined) sp.set("page", String(params.page));
  if (params.pageSize !== undefined) sp.set("pageSize", String(params.pageSize));
  if (params.from_date) sp.set("from_date", params.from_date);
  if (params.to_date) sp.set("to_date", params.to_date);
  if (params.warehouse_id) sp.set("warehouse_id", params.warehouse_id);
  if (params.supplier_id) sp.set("supplier_id", params.supplier_id);
  if (params.receipt_code?.trim()) sp.set("receipt_code", params.receipt_code.trim());
  if (params.status) sp.set("status", params.status);
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export async function fetchReceiptList(params: ReceiptListParams = {}): Promise<ReceiptListResponse> {
  const { data } = await http.get<ReceiptListResponse>(`/api/receipts${receiptListQueryString(params)}`);
  return data;
}

export async function fetchReceiptReportTotals(params: ReceiptListParams = {}): Promise<ReceiptReportTotals> {
  const { data } = await http.get<ReceiptReportTotals>(`/api/receipts/report-totals${receiptListQueryString(params)}`);
  return data;
}

export async function fetchReceiptDetail(id: number): Promise<ReceiptDetail> {
  const { data } = await http.get<ReceiptDetail>(`/api/receipts/${id}`);
  return data;
}

export async function createReceipt(payload: CreateReceiptPayload): Promise<ReceiptDetail> {
  const { data } = await http.post<ReceiptDetail>("/api/receipts", payload);
  return data;
}

export async function confirmReceipt(id: number): Promise<ReceiptDetail> {
  const { data } = await http.post<ReceiptDetail>(`/api/receipts/${id}/confirm`);
  return data;
}

export async function deleteReceipt(id: number): Promise<void> {
  await http.delete(`/api/receipts/${id}`);
}
