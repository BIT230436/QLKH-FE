import { useMemo, type ReactElement } from "react";
import type { Product } from "../../services/types";
import { normalizeDecimalInput } from "../../utils/receiptFormHelpers";

export type LineRow = {
  key: string;
  productId: string;
  quantityDoc: string;
  quantityReceived: string;
  unitPrice: string;
};

type Props = {
  lines: LineRow[];
  products: Product[];
  disabled?: boolean;
  validationErrors: Partial<Record<string, string>>;
  onChangeLine: (key: string, patch: Partial<LineRow>) => void;
  onAddLine: () => void;
  onRemoveLine: (key: string) => void;
  /** `outCreate`: bảng kiểu màn tạo phiếu (Figma / Builder). */
  skin?: "default" | "outCreate";
};

function formatMoney(value: number): string {
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function lineSubtotal(line: LineRow): number {
  const qRec = Number(normalizeDecimalInput(line.quantityReceived));
  const price = Number(normalizeDecimalInput(line.unitPrice));
  if (!Number.isFinite(qRec) || !Number.isFinite(price) || qRec <= 0 || price <= 0) {
    return Number.NaN;
  }
  return parseFloat((qRec * price).toFixed(2));
}

/** Chi tiết hàng: SL theo chứng từ, SL thực nhập (mẫu 01-VT) */
export function ProductLinesTable({
  lines,
  products,
  disabled,
  validationErrors,
  onChangeLine,
  onAddLine,
  onRemoveLine,
  skin = "default",
}: Props): ReactElement {
  const isCreate = skin === "outCreate";

  const grandTotal = useMemo(() => {
    return lines.reduce((sum, ln) => {
      const sub = lineSubtotal(ln);
      return sum + (Number.isFinite(sub) ? sub : 0);
    }, 0);
  }, [lines]);

  const tableBody = lines.map((line, index) => {
    const qDoc = Number(normalizeDecimalInput(line.quantityDoc));
    const qRec = Number(normalizeDecimalInput(line.quantityReceived));
    const price = Number(normalizeDecimalInput(line.unitPrice));
    const subtotal =
      Number.isFinite(qRec) && Number.isFinite(price) ? qRec * price : Number.NaN;
    const rowErr = validationErrors[line.key] ?? validationErrors[`row-${index}`] ?? "";
    const qtyMismatch =
      Number.isFinite(qDoc) && Number.isFinite(qRec) && qDoc !== qRec;
    const rowClass = [rowErr && "has-error", qtyMismatch && "row-qty-mismatch"]
      .filter(Boolean)
      .join(" ");

    const productCell = (
      <div className="product-cell-stack">
        <select
          className={isCreate ? "out-create-cell" : undefined}
          value={line.productId}
          disabled={disabled}
          aria-label={`Sản phẩm dòng ${index + 1}`}
          onChange={(e) => onChangeLine(line.key, { productId: e.target.value })}
        >
          <option value="">— Chọn —</option>
          {products.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name} ({p.unit})
            </option>
          ))}
        </select>
        {rowErr ? <p className="inline-error">{rowErr}</p> : null}
      </div>
    );

    const qtyDocInput = (
      <input
        type="text"
        inputMode="decimal"
        className={isCreate ? "out-create-cell out-create-cell-num" : "input-number"}
        title="Số lượng theo chứng từ"
        value={line.quantityDoc}
        disabled={disabled}
        onChange={(e) => onChangeLine(line.key, { quantityDoc: e.target.value })}
      />
    );

    const qtyRecInput = (
      <input
        type="text"
        inputMode="decimal"
        className={isCreate ? "out-create-cell out-create-cell-num" : "input-number"}
        title="Số lượng thực nhập"
        value={line.quantityReceived}
        disabled={disabled}
        onChange={(e) => onChangeLine(line.key, { quantityReceived: e.target.value })}
      />
    );

    const priceInput = (
      <input
        type="text"
        inputMode="decimal"
        className={isCreate ? "out-create-cell out-create-cell-num" : "input-number"}
        value={line.unitPrice}
        disabled={disabled}
        onChange={(e) => onChangeLine(line.key, { unitPrice: e.target.value })}
      />
    );

    const subtotalCell = (
      <td className={isCreate ? "align-right muted" : "muted"}>
        {formatMoney(parseFloat(subtotal.toFixed(2)))}
      </td>
    );

    const deleteCell = (
      <td className={isCreate ? "narrow" : "actions"}>
        <button
          type="button"
          className="btn-ghost-danger"
          title="Xóa dòng"
          disabled={disabled || lines.length <= 1}
          onClick={() => onRemoveLine(line.key)}
        >
          Xóa
        </button>
      </td>
    );

    if (isCreate) {
      return (
        <tr
          key={line.key}
          className={rowClass || undefined}
          title={
            qtyMismatch
              ? "SL theo chứng từ khác SL thực nhập — kiểm tra trước khi lưu"
              : undefined
          }
        >
          <td className="muted">{index + 1}</td>
          <td>{productCell}</td>
          <td>
            {qtyMismatch && (
              <div className="row-warn" aria-live="polite">
                Lệch SL
              </div>
            )}
            {qtyDocInput}
          </td>
          <td>{qtyRecInput}</td>
          <td>{priceInput}</td>
          {subtotalCell}
          {deleteCell}
        </tr>
      );
    }

    return (
      <tr
        key={line.key}
        className={rowClass || undefined}
        title={
          qtyMismatch
            ? "SL theo chứng từ khác SL thực nhập — kiểm tra trước khi lưu"
            : undefined
        }
      >
        <td>{productCell}</td>
        <td>
          {qtyMismatch && (
            <div className="row-warn" aria-live="polite">
              Lệch SL
            </div>
          )}
          {qtyDocInput}
        </td>
        <td>{qtyRecInput}</td>
        <td>{priceInput}</td>
        {subtotalCell}
        {deleteCell}
      </tr>
    );
  });

  const emptyColSpan = isCreate ? 7 : 6;

  if (isCreate) {
    return (
      <section className="card out-create-table-card">
        <div className="table-scroll sticky-head-wrap">
          <table className="lines-table condensed out-create-lines sticky-head">
            <thead>
              <tr>
                <th className="outbound-col-stt">STT</th>
                <th>Sản phẩm</th>
                <th className="align-right">SL theo CT</th>
                <th className="align-right">SL thực nhập</th>
                <th className="align-right">Đơn giá</th>
                <th className="align-right">Thành tiền</th>
                <th className="narrow" />
              </tr>
            </thead>
            <tbody>
              {tableBody}
              {!lines.length && (
                <tr>
                  <td colSpan={emptyColSpan} className="muted centered">
                    Chưa có dòng hàng
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="out-detail-total-row">
                <td colSpan={5} className="align-right">
                  <strong>Tổng cộng</strong>
                </td>
                <td className="align-right">
                  <strong>{formatMoney(grandTotal)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {validationErrors.lines && <p className="inline-error">{validationErrors.lines}</p>}
        <div className="out-create-add-row">
          <button type="button" className="btn-secondary" disabled={disabled} onClick={onAddLine}>
            + Thêm dòng
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-head">
        <h2 className="card-title">Chi tiết sản phẩm</h2>
        <button type="button" className="btn-secondary" disabled={disabled} onClick={onAddLine}>
          Thêm dòng
        </button>
      </div>

      <div className="table-scroll sticky-head-wrap">
        <table className="lines-table sticky-head">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th className="align-right">SL theo CT</th>
              <th className="align-right">SL thực nhập</th>
              <th className="align-right">Đơn giá</th>
              <th className="align-right">Thành tiền</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tableBody}
            {!lines.length && (
              <tr>
                <td colSpan={emptyColSpan} className="muted centered">
                  Chưa có dòng hàng
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {validationErrors.lines && <p className="inline-error">{validationErrors.lines}</p>}
    </section>
  );
}
