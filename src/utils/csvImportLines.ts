/** Một dòng hàng sau khi nhập từ CSV (khớp `ExcelImportModal` / bảng dòng lệnh). */
export type ExcelImportOrderLinePayload = {
  name: string;
  code: string;
  unit: string;
  unitPrice: string;
  quantity: string;
  discountPct: string;
};

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function splitCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.trim());
}

/** Đọc CSV mẫu lệnh/phiếu xuất: Ten_hang_hoa,Ma_hang,Don_vi_tinh,Don_gia,So_luong,Chiet_khau_pct */
export async function parseOrderLinesFromCsvFiles(files: File[]): Promise<ExcelImportOrderLinePayload[]> {
  const out: ExcelImportOrderLinePayload[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error("Chỉ hỗ trợ file .csv (UTF-8). Với .xlsx hãy xuất sang CSV trong Excel).");
    }
    const text = stripBom(await file.text());
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    for (let i = 1; i < lines.length; i += 1) {
      const row = splitCsvLine(lines[i] ?? "");
      if (row.length < 6) continue;
      const [name, code, unit, unitPrice, quantity, discountPct] = row;
      if (!name && !code) continue;
      out.push({
        name: name ?? "",
        code: code ?? "",
        unit: unit ?? "Cái",
        unitPrice: unitPrice ?? "",
        quantity: quantity ?? "1",
        discountPct: discountPct ?? "0",
      });
    }
  }
  if (out.length === 0) {
    throw new Error("Không đọc được dòng dữ liệu nào. Kiểm tra định dạng CSV.");
  }
  return out;
}

/**
 * CSV phiếu nhập: Ma_san_pham_id,So_luong_chung_tu,So_luong_thuc_nhap,Don_gia
 * (mã = id sản phẩm trong bảng products).
 */
export async function parseInboundReceiptLinesFromCsvFiles(files: File[]): Promise<ExcelImportOrderLinePayload[]> {
  const out: ExcelImportOrderLinePayload[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error("Chỉ hỗ trợ file .csv (UTF-8). Với .xlsx hãy xuất sang CSV trong Excel).");
    }
    const text = stripBom(await file.text());
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    for (let i = 1; i < lines.length; i += 1) {
      const row = splitCsvLine(lines[i] ?? "");
      if (row.length < 4) continue;
      const [productId, qtyDoc, qtyRec, unitPrice] = row;
      if (!productId) continue;
      out.push({
        name: "",
        code: productId,
        unit: "",
        unitPrice: unitPrice ?? "",
        quantity: qtyRec ?? qtyDoc ?? "1",
        discountPct: qtyDoc ?? qtyRec ?? "1",
      });
    }
  }
  if (out.length === 0) {
    throw new Error(
      "Không đọc được dòng dữ liệu nào. Kiểm tra cột Ma_san_pham_id,So_luong_chung_tu,So_luong_thuc_nhap,Don_gia."
    );
  }
  return out;
}

export function downloadInboundReceiptCsvTemplate(): void {
  const header = "Ma_san_pham_id,So_luong_chung_tu,So_luong_thuc_nhap,Don_gia";
  const example = "1,10,10,50000";
  const blob = new Blob([`\uFEFF${header}\n${example}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-dong-hang-phieu-nhap.csv";
  a.click();
  URL.revokeObjectURL(url);
}
