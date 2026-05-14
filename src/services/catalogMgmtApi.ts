import { http } from "./http";
import type {
  CatalogSourceRow,
  CatalogSourceStatus,
  ProductGroupRow,
  ProductGroupStatus,
  ProductSkuRow,
  ProductSkuStatus,
} from "../types/inventory";

export async function fetchCatalogSources(params: {
  kind?: string;
  status?: string;
  search?: string;
} = {}): Promise<CatalogSourceRow[]> {
  const sp = new URLSearchParams();
  if (params.kind) sp.set("kind", params.kind);
  if (params.status) sp.set("status", params.status);
  if (params.search) sp.set("search", params.search);
  const q = sp.toString();
  const { data } = await http.get<CatalogSourceRow[]>(`/api/catalog/sources${q ? `?${q}` : ""}`);
  return data;
}

export async function createCatalogSource(payload: {
  code: string;
  name: string;
  kind: CatalogSourceRow["kind"];
  status: CatalogSourceStatus;
}): Promise<CatalogSourceRow> {
  const { data } = await http.post<CatalogSourceRow>("/api/catalog/sources", payload);
  return data;
}

export async function updateCatalogSource(
  id: number,
  payload: { code: string; name: string; kind: CatalogSourceRow["kind"]; status: CatalogSourceStatus }
): Promise<CatalogSourceRow> {
  const { data } = await http.put<CatalogSourceRow>(`/api/catalog/sources/${id}`, payload);
  return data;
}

export async function deleteCatalogSource(id: number): Promise<void> {
  await http.delete(`/api/catalog/sources/${id}`);
}

export async function fetchProductGroups(params: { status?: string; owner?: string; search?: string } = {}): Promise<
  ProductGroupRow[]
> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.owner) sp.set("owner", params.owner);
  if (params.search) sp.set("search", params.search);
  const q = sp.toString();
  const { data } = await http.get<ProductGroupRow[]>(`/api/catalog/product-groups${q ? `?${q}` : ""}`);
  return data;
}

export async function createProductGroup(payload: {
  groupCode: string;
  groupName: string;
  ownerLabel: string;
  status: ProductGroupStatus;
}): Promise<ProductGroupRow> {
  const { data } = await http.post<ProductGroupRow>("/api/catalog/product-groups", payload);
  return data;
}

export async function updateProductGroup(
  id: number,
  payload: { groupCode: string; groupName: string; ownerLabel: string; status: ProductGroupStatus }
): Promise<ProductGroupRow> {
  const { data } = await http.put<ProductGroupRow>(`/api/catalog/product-groups/${id}`, payload);
  return data;
}

export async function deleteProductGroup(id: number): Promise<void> {
  await http.delete(`/api/catalog/product-groups/${id}`);
}

export async function fetchSkus(params: { groupId?: number; groupCode?: string; status?: string; search?: string }): Promise<
  ProductSkuRow[]
> {
  const sp = new URLSearchParams();
  if (params.groupId != null) sp.set("groupId", String(params.groupId));
  if (params.groupCode) sp.set("groupCode", params.groupCode);
  if (params.status) sp.set("status", params.status);
  if (params.search) sp.set("search", params.search);
  const { data } = await http.get<ProductSkuRow[]>(`/api/catalog/skus?${sp.toString()}`);
  return data;
}

export async function createSku(payload: {
  groupId: number;
  skuCode: string;
  name: string;
  unit: string;
  retailPrice: number;
  wholesalePrice: number;
  vatPct: number;
  barcode?: string;
  note?: string;
  status: ProductSkuStatus;
}): Promise<ProductSkuRow> {
  const { data } = await http.post<ProductSkuRow>("/api/catalog/skus", payload);
  return data;
}

export async function updateSku(
  id: number,
  payload: {
    skuCode: string;
    name: string;
    unit: string;
    retailPrice: number;
    wholesalePrice: number;
    vatPct: number;
    barcode?: string;
    note?: string;
    status: ProductSkuStatus;
  }
): Promise<ProductSkuRow> {
  const { data } = await http.put<ProductSkuRow>(`/api/catalog/skus/${id}`, payload);
  return data;
}

export async function deleteSku(id: number): Promise<void> {
  await http.delete(`/api/catalog/skus/${id}`);
}
