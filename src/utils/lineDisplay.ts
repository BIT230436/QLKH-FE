/** Đọc số từ dòng bảng API (camelCase hoặc snake_case). */
export function pickNum(...vals: unknown[]): number {
  for (const v of vals) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const t = v.trim().replace(/\s/g, "").replace(",", ".");
      if (t === "") continue;
      const n = Number(t);
      if (Number.isFinite(n)) return n;
    }
  }
  return Number.NaN;
}

export function formatMoneyVi(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function moneyFromLine(line: object, camelKey: string, snakeKey?: string): string {
  const r = line as Record<string, unknown>;
  return formatMoneyVi(pickNum(r[camelKey], snakeKey ? r[snakeKey] : undefined));
}
