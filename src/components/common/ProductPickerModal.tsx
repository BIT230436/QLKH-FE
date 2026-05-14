import { useEffect, useId, useMemo, useState, type ReactElement } from "react";
import { fetchProducts } from "../../services/catalogApi";
import type { Product } from "../../services/types";
import type { ExcelImportOrderLinePayload } from "../../utils/csvImportLines";
import { getHttpErrorMessage } from "../../utils/errors";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Mỗi dòng: `code` = id sản phẩm (chuỗi), `quantity` = 1, `discountPct` = 0 — phù hợp bảng lệnh/phiếu xuất. */
  onApply: (lines: ExcelImportOrderLinePayload[]) => void;
};

const PAGE_SIZE = 10;

function formatPriceVi(s: string): string {
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return s;
  return new Intl.NumberFormat("vi-VN").format(n);
}

/**
 * Modal chọn một hoặc nhiều sản phẩm từ `/api/products` (tìm theo tên / mã id, phân trang, chọn nhiều).
 */
export function ProductPickerModal({ open, onClose, onApply }: Props): ReactElement | null {
  const titleId = useId();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPage(0);
    setSelected(new Set());
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const list = await fetchProducts();
        if (!cancelled) setProducts(list);
      } catch (e) {
        if (!cancelled) setLoadError(getHttpErrorMessage(e, "Không tải được danh mục."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const idStr = String(p.id);
      return (
        p.name.toLowerCase().includes(q) ||
        idStr.includes(q) ||
        (p.unit && p.unit.toLowerCase().includes(q))
      );
    });
  }, [products, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIdx = Math.min(page, pageCount - 1);
  const pageItems = useMemo(() => {
    const start = pageIdx * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageIdx]);

  const toggle = (id: number): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageAll = (): void => {
    const ids = pageItems.map((p) => p.id);
    if (!ids.length) return;
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleApply = (): void => {
    const rows: ExcelImportOrderLinePayload[] = [];
    for (const id of selected) {
      const p = products.find((x) => x.id === id);
      if (!p) continue;
      rows.push({
        name: p.name,
        code: String(p.id),
        unit: p.unit || "Cái",
        unitPrice: p.price,
        quantity: "1",
        discountPct: "0",
      });
    }
    if (rows.length === 0) return;
    onApply(rows);
    onClose();
  };

  if (!open) return null;

  const pageAllSelected = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel card product-picker-panel feature-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="product-picker-topbar">
          <h2 id={titleId} className="product-picker-topbar-title">
            Chọn hàng từ danh mục
          </h2>
        </div>

        <div className="product-picker-body">
          <div className="product-picker-toolbar">
            <input
              type="search"
              className="product-picker-search"
              placeholder="Tìm theo tên, mã id, đơn vị…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Lọc sản phẩm"
            />
            <span className="muted product-picker-count">
              {loading ? "Đang tải…" : `${filtered.length} mặt hàng`}
              {selected.size > 0 ? ` · Đã chọn ${selected.size}` : ""}
            </span>
          </div>

          {loadError && (
            <div className="banner banner-error subtle" role="alert">
              {loadError}
            </div>
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <p className="muted product-picker-empty">Không có sản phẩm hoặc không khớp bộ lọc.</p>
          )}

          {(loading || filtered.length > 0) && (
            <div className="outbound-table-wrap card builder-table-card product-picker-table-wrap">
              <div className="table-scroll">
                <table className="lines-table condensed product-picker-table">
                  <thead>
                    <tr>
                      <th className="product-picker-col-check">
                        <button type="button" className="btn-link product-picker-select-page" onClick={togglePageAll}>
                          {pageAllSelected ? "Bỏ trang" : "Chọn trang"}
                        </button>
                      </th>
                      <th>ID</th>
                      <th>Tên hàng</th>
                      <th>Đơn vị</th>
                      <th className="align-right">Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="muted centered">
                          Đang tải danh mục…
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <label className="product-picker-check-label">
                              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                            </label>
                          </td>
                          <td className="muted">{p.id}</td>
                          <td>{p.name}</td>
                          <td>{p.unit}</td>
                          <td className="align-right">{formatPriceVi(p.price)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filtered.length > PAGE_SIZE && (
            <div className="product-picker-pager">
              <button
                type="button"
                className="btn-secondary"
                disabled={pageIdx <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Trước
              </button>
              <span className="muted">
                Trang {pageIdx + 1} / {pageCount}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={pageIdx >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Sau →
              </button>
            </div>
          )}

          <div className="product-picker-foot">
            <button type="button" className="btn-secondary confirm-dialog-btn" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary confirm-dialog-btn"
              disabled={selected.size === 0}
              onClick={handleApply}
            >
              Thêm ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
