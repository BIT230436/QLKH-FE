import type { Product, Supplier, Warehouse } from "./types";
import { http } from "./http";

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data } = await http.get<Supplier[]>("/api/suppliers");
  return data;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data } = await http.get<Product[]>("/api/products");
  return data;
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data } = await http.get<Warehouse[]>("/api/warehouses");
  return data;
}
