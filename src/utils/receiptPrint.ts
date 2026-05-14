import type { ReceiptDetail } from "../services/types";
import { formatSourceDocOneVtLine } from "./receiptSourceDoc";

/** Mở cửa sổ in (HTML) — bố cục 01-VT tối thiểu, chỉ in trường có giá trị */
export function openReceiptPrintWindow(detail: ReceiptDetail): void {
  printViaHiddenIframe(buildReceiptPrintHtml(detail));
}

function buildReceiptPrintHtml(detail: ReceiptDetail): string {
  const { receipt, items, total_amount_in_words, attachments } = detail;
  const isDraft = receipt.status === "draft";
  const attList = attachments ?? [];

  const rows = items
    .map((line, index) => {
      const qDoc = Number(line.quantity_per_doc);
      const qRec = Number(line.quantity_received);
      const mismatch = Number.isFinite(qDoc) && Number.isFinite(qRec) && qDoc !== qRec;
      const mismatchNote = mismatch ? ' <span class="warn">*</span>' : "";
      return `
          <tr>
            <td class="center">${index + 1}</td>
            <td>${escapeHtml(line.product_name)}${mismatchNote}</td>
            <td class="center">${escapeHtml(line.product_unit)}</td>
            <td class="num">${escapeHtml(formatQty(line.quantity_per_doc))}</td>
            <td class="num">${escapeHtml(formatQty(line.quantity_received))}</td>
            <td class="num">${escapeHtml(formatMoney(line.unit_price))}</td>
            <td class="num">${escapeHtml(formatMoney(line.subtotal))}</td>
          </tr>`;
    })
    .join("");

  const hasQtyMismatch = items.some((line) => {
    const qDoc = Number(line.quantity_per_doc);
    const qRec = Number(line.quantity_received);
    return Number.isFinite(qDoc) && Number.isFinite(qRec) && qDoc !== qRec;
  });

  const orgName = receipt.org_unit?.trim() ?? "";
  const mainFields = fieldGrid([
    ["Số phiếu", receipt.receipt_code],
    ["Ngày chứng từ", formatDateOnly(receipt.document_date)],
    ["Nhà cung cấp", receipt.supplier_name],
    ["Kho nhập", receipt.warehouse_name],
    ["Bộ phận", receipt.department],
    ["Người giao", receipt.deliverer_name],
  ]);

  const accountingFields = fieldGrid([
    ["TK Nợ", receipt.debit_account],
    ["TK Có", receipt.credit_account],
  ]);

  const accountingPanel = accountingFields
    ? `<div class="panel"><h2 class="panel-title">Hạch toán</h2>${accountingFields}</div>`
    : "";

  const sourceRefLine = formatSourceDocOneVtLine(receipt);
  const sourceRefBlock = sourceRefLine
    ? `<p class="source-ref">- ${escapeHtml(sourceRefLine)}</p>`
    : "";

  const extraPanels = accountingPanel
    ? `<section class="panel-row panel-row-single">${accountingPanel}</section>`
    : "";

  const narrativeParts: string[] = [];
  if (receipt.source_doc_note?.trim()) {
    narrativeParts.push(
      `<p class="narrative-line"><span class="narrative-label">Diễn giải:</span> ${escapeHtml(receipt.source_doc_note.trim())}</p>`
    );
  }
  if (receipt.attached_original_count > 0) {
    narrativeParts.push(
      `<p class="narrative-line"><span class="narrative-label">Kèm theo:</span> ${receipt.attached_original_count} chứng từ gốc.</p>`
    );
  }
  if (attList.length > 0) {
    narrativeParts.push(
      `<p class="narrative-line narrative-muted"><span class="narrative-label">Hồ sơ điện tử:</span> ${attList
        .map((a) => escapeHtml(a.label?.trim() || "Tệp đính kèm"))
        .join(", ")}.</p>`
    );
  }
  const narrativeBlock = narrativeParts.length
    ? `<section class="narrative">${narrativeParts.join("")}</section>`
    : "";

  const mismatchFootnote = hasQtyMismatch
    ? `<p class="footnote">* Dòng có SL theo chứng từ khác SL thực nhập.</p>`
    : "";

  const draftWatermark = isDraft
    ? `<div class="draft-mark" aria-hidden="true">BẢN NHÁP</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/><title>In phiếu nhập kho</title>
<style>
  @page { size: A4; margin: 14mm 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #111;
    font: 13px/1.45 "Times New Roman", Times, serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    position: relative;
    max-width: 186mm;
    margin: 0 auto;
    padding: 10mm 0 8mm;
  }
  .draft-mark {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 68px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: rgb(185 28 28 / 16%);
    transform: rotate(-24deg);
    pointer-events: none;
    user-select: none;
    z-index: 0;
  }
  .sheet > *:not(.draft-mark) { position: relative; z-index: 1; }
  .doc-header {
    margin-bottom: 10px;
    text-align: center;
  }
  .org-name {
    margin: 0 0 4px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .doc-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .section {
    margin-bottom: 10px;
  }
  .section-title {
    margin: 0 0 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #222;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
    border: 1px solid #222;
  }
  .field {
    display: grid;
    grid-template-columns: minmax(128px, 34%) 1fr;
    gap: 8px 10px;
    align-items: start;
    min-height: 30px;
    padding: 6px 8px;
    border-bottom: 1px solid #d4d4d8;
    border-right: 1px solid #d4d4d8;
  }
  .field:nth-child(2n) { border-right: none; }
  .field:nth-last-child(-n + 2) { border-bottom: none; }
  .field-label {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .field-value {
    margin: 0;
    font-size: 13px;
    word-break: normal;
    overflow-wrap: anywhere;
  }
  .panel-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 10px;
  }
  .panel-row-single {
    grid-template-columns: 1fr;
  }
  .panel {
    border: 1px solid #222;
    padding: 8px 10px 10px;
    min-height: 100%;
  }
  .panel .field-grid {
    border: none;
  }
  .panel .field {
    display: block;
    border-right: none;
    border-bottom: 1px solid #e4e4e7;
    padding: 6px 0;
    min-height: 0;
  }
  .panel .field-label {
    display: block;
    margin-bottom: 2px;
    white-space: normal;
    line-height: 1.25;
  }
  .panel .field-value {
    display: block;
    white-space: nowrap;
    overflow-wrap: normal;
    word-break: keep-all;
  }
  .panel .field:last-child { border-bottom: none; }
  .panel-title {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #333;
  }
  .narrative {
    margin-bottom: 10px;
    padding: 8px 10px;
    border: 1px solid #222;
    background: #fafafa;
  }
  .narrative-line {
    margin: 0;
    font-size: 12px;
  }
  .narrative-line + .narrative-line { margin-top: 4px; }
  .narrative-label {
    font-weight: 700;
  }
  .narrative-muted { color: #555; }
  .source-ref {
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.5;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #222;
    padding: 6px 7px;
    vertical-align: middle;
  }
  th {
    background: #f3f4f6;
    font-weight: 700;
    text-align: center;
  }
  .col-stt { width: 34px; }
  .col-unit { width: 48px; }
  .col-qty { width: 72px; }
  .col-price { width: 84px; }
  .col-amount { width: 92px; }
  .num { text-align: right; white-space: nowrap; }
  .center { text-align: center; }
  .warn { color: #b45309; font-weight: 700; }
  tfoot td {
    font-weight: 700;
    background: #f8fafc;
  }
  .summary {
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid #222;
    font-size: 13px;
  }
  .summary-label { font-weight: 700; }
  .footnote {
    margin: 6px 0 0;
    font-size: 11px;
    color: #555;
  }
  .signatures {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 22px;
    text-align: center;
    font-size: 12px;
    break-inside: avoid;
  }
  .signatures > div {
    padding: 0 4px;
  }
  .signatures p {
    margin: 0 0 56px;
    font-weight: 700;
  }
  .signatures span {
    display: block;
    font-size: 11px;
    font-style: italic;
    color: #555;
  }
  @media print {
    body { margin: 0; }
    .sheet {
      max-width: none;
      padding: 8mm 0 6mm;
    }
  }
</style></head><body>
  <div class="sheet">
    ${draftWatermark}
    <header class="doc-header">
      ${orgName ? `<p class="org-name">${escapeHtml(orgName)}</p>` : ""}
      <h1 class="doc-title">Phiếu nhập kho</h1>
    </header>

    <section class="section">
      <h2 class="section-title">Thông tin phiếu</h2>
      ${mainFields}
    </section>

    ${extraPanels}
    ${sourceRefBlock}
    ${narrativeBlock}

    <section class="section">
      <h2 class="section-title">Chi tiết hàng hóa</h2>
      <table>
        <thead>
          <tr>
            <th class="col-stt">STT</th>
            <th>Tên hàng</th>
            <th class="col-unit">ĐVT</th>
            <th class="col-qty">SL theo CT</th>
            <th class="col-qty">SL thực nhập</th>
            <th class="col-price">Đơn giá</th>
            <th class="col-amount">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="num">Tổng cộng</td>
            <td class="num">${escapeHtml(formatMoney(receipt.total_amount))}</td>
          </tr>
        </tfoot>
      </table>
    </section>

    <div class="summary">
      <span class="summary-label">Bằng chữ:</span> ${escapeHtml(total_amount_in_words)}
    </div>
    ${mismatchFootnote}

    <div class="signatures">
      <div><p>Người giao hàng</p><span>(Ký, họ tên)</span></div>
      <div><p>Thủ kho</p><span>(Ký, họ tên)</span></div>
      <div><p>Kế toán</p><span>(Ký, họ tên)</span></div>
      <div><p>Người lập phiếu</p><span>(Ký, họ tên)</span></div>
    </div>
  </div>
</body></html>`;
}

function fieldGrid(pairs: Array<[string, string | null | undefined]>): string {
  const cells = pairs
    .map(([label, value]) => fieldCell(label, value))
    .filter(Boolean)
    .join("");
  return cells ? `<div class="field-grid">${cells}</div>` : "";
}

function fieldCell(label: string, value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return "";
  return `<div class="field"><p class="field-label">${escapeHtml(label)}</p><p class="field-value">${escapeHtml(text)}</p></div>`;
}

function formatDateOnly(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("vi-VN");
}

function formatMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n)
    : String(value);
}

function formatQty(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(n)
    : String(value);
}

function printViaHiddenIframe(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("title", "In phiếu nhập kho");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument ?? frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return;
  }

  const triggerPrint = (): void => {
    win.document.title = "\u00a0";
    win.focus();
    win.print();
    window.setTimeout(() => frame.remove(), 1000);
  };

  if (win.document.readyState === "complete") {
    triggerPrint();
    return;
  }

  win.addEventListener("load", triggerPrint, { once: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
