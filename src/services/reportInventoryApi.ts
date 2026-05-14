import { http } from "./http";

export type StockBalanceRow = {
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string | null;
  productId: number;
  productName: string;
  unit: string;
  qtyIn: number;
  qtyOut: number;
  onHand: number;
};

export type StockBalanceResponse = {
  asOf: string;
  warehouseId: number | null;
  rows: StockBalanceRow[];
};

export type StockIoRow = {
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string | null;
  productId: number;
  productName: string;
  unit: string;
  opening: number;
  periodIn: number;
  periodOut: number;
  closing: number;
};

export type StockIoResponse = {
  from: string;
  to: string;
  asOfOpen: string;
  warehouseId: number | null;
  rows: StockIoRow[];
};

export async function fetchStockBalance(params: {
  asOf: string;
  warehouseId?: number | null;
}): Promise<StockBalanceResponse> {
  const sp = new URLSearchParams();
  sp.set("asOf", params.asOf);
  if (params.warehouseId != null && Number.isFinite(params.warehouseId)) {
    sp.set("warehouseId", String(params.warehouseId));
  }
  const { data } = await http.get<StockBalanceResponse>(`/api/reports/stock-balance?${sp.toString()}`);
  return data;
}

export async function fetchStockIo(params: {
  from: string;
  to: string;
  warehouseId?: number | null;
}): Promise<StockIoResponse> {
  const sp = new URLSearchParams();
  sp.set("from", params.from);
  sp.set("to", params.to);
  if (params.warehouseId != null && Number.isFinite(params.warehouseId)) {
    sp.set("warehouseId", String(params.warehouseId));
  }
  const { data } = await http.get<StockIoResponse>(`/api/reports/stock-io?${sp.toString()}`);
  return data;
}

export function rowsToCsv(headers: string[], lines: string[][]): string {
  const esc = (cell: string): string => {
    if (cell.includes('"') || cell.includes(",") || cell.includes("\n")) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };
  return [headers.map(esc).join(","), ...lines.map((row) => row.map(esc).join(","))].join("\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob(["\uFEFF", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
