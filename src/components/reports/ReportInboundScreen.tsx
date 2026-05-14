import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { fetchSuppliers, fetchWarehouses } from "../../services/catalogApi";
import { fetchReceiptList, fetchReceiptReportTotals, type ReceiptReportTotals } from "../../services/receiptApi";
import type { ReceiptSummary, Supplier, Warehouse } from "../../services/types";
import { getHttpErrorMessage } from "../../utils/errors";
import { IconActionView } from "../icons/ActionIcons";
import { InboundReceiptDetailScreen } from "../inbound/InboundReceiptDetailScreen";

type Props = {
  onBack: () => void;
};

function moneyVi(s: string): string {
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return s;
  return new Intl.NumberFormat("vi-VN").format(n);
}

function inboundStatusLabel(status: ReceiptSummary["status"]): string {
  return status === "draft" ? "Nháp" : "Đã xác nhận";
}

function inboundStatusClass(status: ReceiptSummary["status"]): string {
  if (status === "draft") return "outbound-badge outbound-badge-warn";
  return "outbound-badge outbound-badge-ok";
}

/**
 * Báo cáo nhập kho — tổng hợp theo bộ lọc (đồng bộ logic truy vấn với danh sách phiếu nhập / DB).
 */
export function ReportInboundScreen({ onBack }: Props): ReactElement {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fWh, setFWh] = useState("");
  const [fSup, setFSup] = useState("");
  const [fCode, setFCode] = useState("");
  const [fStatus, setFStatus] = useState<"" | "draft" | "posted">("");

  type Applied = {
    from: string;
    to: string;
    wh: string;
    sup: string;
    code: string;
    status: "" | "draft" | "posted";
  };
  const [applied, setApplied] = useState<Applied>({ from: "", to: "", wh: "", sup: "", code: "", status: "" });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState<ReceiptSummary[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [agg, setAgg] = useState<ReceiptReportTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [remoteTick, setRemoteTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [s, w] = await Promise.all([fetchSuppliers(), fetchWarehouses()]);
        if (!cancelled) {
          setSuppliers(s);
          setWarehouses(w);
        }
      } catch (e) {
        if (!cancelled) setCatalogError(getHttpErrorMessage(e, "Không tải được danh mục."));
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filterParams = useMemo(
    () => ({
      from_date: applied.from.trim() || undefined,
      to_date: applied.to.trim() || undefined,
      warehouse_id: applied.wh || undefined,
      supplier_id: applied.sup || undefined,
      receipt_code: applied.code,
      status: applied.status,
    }),
    [applied]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listParams = { page, pageSize, ...filterParams };
      const [listRes, totals] = await Promise.all([
        fetchReceiptList(listParams),
        fetchReceiptReportTotals(listParams),
      ]);
      setItems(listRes.items);
      setListTotal(listRes.total);
      setAgg(totals);
    } catch (e) {
      setError(getHttpErrorMessage(e));
      setItems([]);
      setListTotal(0);
      setAgg(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterParams, remoteTick]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = (): void => {
    setApplied({
      from: fFrom,
      to: fTo,
      wh: fWh,
      sup: fSup,
      code: fCode,
      status: fStatus,
    });
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize));

  if (detailId != null) {
    return (
      <InboundReceiptDetailScreen
        receiptId={detailId}
        onClose={() => setDetailId(null)}
        onAfterMutation={() => setRemoteTick((k) => k + 1)}
      />
    );
  }

  return (
    <div className="app-page outbound-page inbound-list-page feature-doc-page">
      <main className="outbound-main enterprise-ops-stack">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBack}>
            ← Tổng quan
          </button>
        </div>
        <div className="outbound-head">
          <div>
            <h1 className="outbound-title">Báo cáo nhập kho</h1>
            <p className="enterprise-page-meta">Tổng hợp phiếu nhập theo bộ lọc — xuất dữ liệu kiểm soát nội bộ.</p>
          </div>
        </div>

        {catalogError && <div className="banner banner-error">{catalogError}</div>}
        {error && <div className="banner banner-error">{error}</div>}

        <section className="outbound-filters card inbound-builder-filters">
          <div className="outbound-filter-grid">
            <label className="field compact">
              <span>Tình trạng</span>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value as "" | "draft" | "posted")} disabled={catalogLoading}>
                <option value="">Tất cả</option>
                <option value="draft">Nháp</option>
                <option value="posted">Đã xác nhận</option>
              </select>
            </label>
            <label className="field compact">
              <span>Từ ngày</span>
              <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} disabled={catalogLoading} />
            </label>
            <label className="field compact">
              <span>Đến ngày</span>
              <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} disabled={catalogLoading} />
            </label>
            <label className="field compact">
              <span>Mã phiếu</span>
              <input value={fCode} onChange={(e) => setFCode(e.target.value)} placeholder="Lọc theo mã…" disabled={catalogLoading} />
            </label>
            <label className="field compact">
              <span>Nguồn nhận</span>
              <select value={fSup} onChange={(e) => setFSup(e.target.value)} disabled={catalogLoading}>
                <option value="">Tất cả</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact">
              <span>Kho</span>
              <select value={fWh} onChange={(e) => setFWh(e.target.value)} disabled={catalogLoading}>
                <option value="">Tất cả</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="inbound-filter-apply">
              <button type="button" className="btn-primary inbound-filter-apply-btn" onClick={applyFilters} disabled={catalogLoading || loading}>
                Áp dụng
              </button>
            </div>
          </div>
        </section>

        {agg && (
          <section className="card out-create-section report-inbound-kpis">
            <div className="section-head">
              <h2 className="out-create-section-title">Tóm tắt theo bộ lọc</h2>
            </div>
            <div className="report-kpi-row">
              <div>
                <div className="muted">Số phiếu (theo bộ lọc)</div>
                <div className="report-kpi-value">{new Intl.NumberFormat("vi-VN").format(agg.totalCount)}</div>
              </div>
              <div>
                <div className="muted">Tổng thành tiền</div>
                <div className="report-kpi-value">{moneyVi(agg.sumTotalAmount)} đ</div>
              </div>
            </div>
          </section>
        )}

        <div className="outbound-table-wrap card inbound-builder-table-card builder-table-card">
          <div className="table-scroll sticky-head-wrap">
            <table className="lines-table condensed inbound-receipt-table sticky-head">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Ngày chứng từ</th>
                  <th>NCC</th>
                  <th>Kho</th>
                  <th>Trạng thái</th>
                  <th className="align-right">Thành tiền</th>
                  <th className="narrow" title="Chi tiết phiếu">
                    <span className="sr-only">Chi tiết</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="muted centered">
                      Đang tải…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted centered">
                      Không có phiếu khớp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.receipt_code}</td>
                      <td>{r.document_date}</td>
                      <td>{r.supplier_name}</td>
                      <td>{r.warehouse_name}</td>
                      <td>
                        <span className={inboundStatusClass(r.status)}>{inboundStatusLabel(r.status)}</span>
                      </td>
                      <td className="align-right">{moneyVi(r.total_amount)}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action-btn"
                          title="Chi tiết"
                          aria-label="Chi tiết"
                          onClick={() => setDetailId(r.id)}
                        >
                          <IconActionView className="table-action-ico" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="report-inbound-pager">
          <button type="button" className="btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            ← Trước
          </button>
          <span className="muted">
            Trang {page} / {totalPages} ({listTotal} phiếu)
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau →
          </button>
        </div>
      </main>
    </div>
  );
}
