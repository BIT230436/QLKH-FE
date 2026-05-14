import { http } from "./http";

export type ContractStatus = "Nháp" | "Hiệu lực" | "Hết hạn" | "Đã đóng" | "Tạm dừng";

export type ContractRow = {
  id: number;
  contractCode: string;
  title: string;
  supplierId: number;
  supplierName: string;
  signedDate: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  valueAmount: number;
  currency: string;
  status: ContractStatus;
  counterpartyRef: string;
  note: string;
  fileUrl: string | null;
  outboundReceiptId: number | null;
  outboundReceiptCode: string | null;
  updatedAt: string;
};

export type ContractPayload = {
  contractCode: string;
  title: string;
  supplierId: number;
  signedDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  valueAmount: number;
  currency?: string;
  status: ContractStatus;
  counterpartyRef?: string;
  note?: string;
  fileUrl?: string;
  outboundReceiptId?: number | null;
};

export async function fetchContracts(params?: {
  supplierId?: number;
  status?: string;
  search?: string;
}): Promise<ContractRow[]> {
  const sp = new URLSearchParams();
  if (params?.supplierId != null) sp.set("supplierId", String(params.supplierId));
  if (params?.status) sp.set("status", params.status);
  if (params?.search?.trim()) sp.set("search", params.search.trim());
  const q = sp.toString();
  const { data } = await http.get<ContractRow[]>(`/api/contracts${q ? `?${q}` : ""}`);
  return data;
}

export async function fetchContract(id: number): Promise<ContractRow> {
  const { data } = await http.get<ContractRow>(`/api/contracts/${id}`);
  return data;
}

export async function createContract(payload: ContractPayload): Promise<ContractRow> {
  const { data } = await http.post<ContractRow>("/api/contracts", payload);
  return data;
}

export async function updateContract(id: number, payload: ContractPayload): Promise<ContractRow> {
  const { data } = await http.put<ContractRow>(`/api/contracts/${id}`, payload);
  return data;
}

export async function deleteContract(id: number): Promise<void> {
  await http.delete(`/api/contracts/${id}`);
}
