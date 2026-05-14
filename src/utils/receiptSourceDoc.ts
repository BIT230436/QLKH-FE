import type { ReceiptSummary } from "../services/types";

type SourceDocFields = Pick<
  ReceiptSummary,
  "source_doc_no" | "source_doc_date" | "source_doc_issuer"
>;

/** Có tham chiếu chứng từ gốc (một trong số / ngày / nơi phát hành) */
export function hasSourceDocReference(receipt: SourceDocFields): boolean {
  return Boolean(
    receipt.source_doc_no?.trim() ||
      receipt.source_doc_date?.trim() ||
      receipt.source_doc_issuer?.trim()
  );
}

/** Một dòng theo mẫu 01-VT: Theo … số … ngày … tháng … năm … của … */
export function formatSourceDocOneVtLine(receipt: SourceDocFields): string | null {
  const no = receipt.source_doc_no?.trim();
  const date = receipt.source_doc_date?.trim();
  const issuer = receipt.source_doc_issuer?.trim();
  if (!no && !date && !issuer) return null;

  const parts: string[] = ["Theo chứng từ"];
  if (no) parts.push(`số ${no}`);
  if (date) {
    const d = new Date(date + "T12:00:00");
    parts.push(`ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`);
  }
  if (issuer) parts.push(`của ${issuer}`);
  return parts.join(" ");
}
