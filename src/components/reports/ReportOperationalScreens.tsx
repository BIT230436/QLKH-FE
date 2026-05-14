import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { fetchWarehouses } from "../../services/catalogApi";
import type { Warehouse } from "../../services/types";
import {
  downloadTextFile,
  fetchStockBalance,
  fetchStockIo,
  rowsToCsv,
  type StockBalanceRow,
  type StockIoRow,
} from "../../services/reportInventoryApi";
import { getHttpErrorMessage } from "../../utils/errors";

type Nav = {
  onBack: () => void;
  onOpenInboundList: () => void;
  onOpenInboundReport: () => void;
  onOpenOutboundNcc: () => void;
  onOpenOutboundInternal: () => void;
  onOpenOutboundNvbh: () => void;
  onOpenInboundOrders: () => void;
  onOpenOutboundOrders: () => void;
  onOpenStockAuditList: () => void;
};

function fmtQty(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(n);
}

function todayIsoDate(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function firstDayOfMonthIso(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-01`;
}

function ReportShell({
  title,
  intro,
  children,
  nav,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  nav: Nav;
}): ReactElement {
  return (
    <div className="app-page outbound-page out-create-page feature-doc-page">
      <main className="outbound-main out-create-main enterprise-ops-stack">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={nav.onBack}>
            ← Tổng quan
          </button>
        </div>
        <h1 className="out-create-doc-title">{title}</h1>
        <section className="card out-create-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Giới thiệu</h2>
          </div>
          <p className="muted">{intro}</p>
        </section>
        {children}
        <section className="card out-create-section report-nav-card">
          <div className="section-head">
            <h2 className="out-create-section-title">Điều hướng nhanh</h2>
          </div>
          <div className="report-nav-buttons">
            <button type="button" className="btn-secondary" onClick={nav.onOpenInboundList}>
              Phiếu nhập
            </button>
            <button type="button" className="btn-secondary" onClick={nav.onOpenInboundReport}>
              Báo cáo nhập kho
            </button>
            <button type="button" className="btn-secondary" onClick={nav.onOpenOutboundNcc}>
              Phiếu xuất NCC
            </button>
            <button type="button" className="btn-secondary" onClick={nav.onOpenOutboundInternal}>
              Phiếu xuất nội bộ
            </button>
            <button type="button" className="btn-secondary" onClick={nav.onOpenOutboundNvbh}>
              Phiếu xuất NVBH
            </button>
            <button type="button" className="btn-secondary" onClick={nav.onOpenInboundOrders}>
              Lệnh nhập
            </button>
            <button type="button" className="btn-secondary" onClick={nav.onOpenOutboundOrders}>
              Lệnh xuất
            </button>
            <button type="button" className="btn-secondary" onClick={nav.onOpenStockAuditList}>
              Kiểm kê
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

/** Báo cáo xuất nhập tồn (XNT) — tính từ phiếu nhập đã xác nhận và phiếu xuất (Đã xuất / Hoàn hàng); xuất CSV. */
export function ReportIoScreen({ nav }: { nav: Nav }): ReactElement {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [fFrom, setFFrom] = useState(firstDayOfMonthIso);
  const [fTo, setFTo] = useState(todayIsoDate);
  const [fWh, setFWh] = useState("");
  const [applied, setApplied] = useState({ from: firstDayOfMonthIso(), to: todayIsoDate(), wh: "" });
  const [rows, setRows] = useState<StockIoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCatalogLoading(true);
      try {
        const w = await fetchWarehouses();
        if (!cancelled) setWarehouses(w);
      } catch {
        if (!cancelled) setWarehouses([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wh = applied.wh.trim() ? Number(applied.wh) : null;
      const res = await fetchStockIo({
        from: applied.from,
        to: applied.to,
        warehouseId: wh != null && Number.isFinite(wh) ? wh : null,
      });
      setRows(res.rows);
    } catch (e) {
      setError(getHttpErrorMessage(e, "Không tải được báo cáo."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = (): void => {
    setApplied({ from: fFrom, to: fTo, wh: fWh });
  };

  const exportCsv = (): void => {
    const headers = [
      "Kho",
      "Mã kho",
      "Mã HH",
      "Tên hàng",
      "ĐVT",
      "Tồn đầu kỳ",
      "Nhập trong kỳ",
      "Xuất trong kỳ",
      "Tồn cuối kỳ",
    ];
    const lines = rows.map((r) => [
      r.warehouseName,
      r.warehouseCode ?? "",
      String(r.productId),
      r.productName,
      r.unit,
      String(r.opening),
      String(r.periodIn),
      String(r.periodOut),
      String(r.closing),
    ]);
    downloadTextFile(`bao-cao-xnt_${applied.from}_${applied.to}.csv`, rowsToCsv(headers, lines));
  };

  return (
    <ReportShell
      title="Báo cáo xuất nhập tồn"
      intro="Số liệu được tính từ phiếu nhập trạng thái « Đã xác nhận » (theo ngày chứng từ) và phiếu xuất « Đã xuất » / « Hoàn hàng » (theo ngày phiếu). Kho trên phiếu xuất được ghép với danh mục kho theo mã kho hoặc tên kho. Mặt hàng khớp theo mã dòng = id sản phẩm trong danh mục (cùng nguồn với phiếu nhập). Có thể xuất file CSV để đối soát ngoài hệ thống."
      nav={nav}
    >
      {error && <div className="banner banner-error">{error}</div>}

      <section className="outbound-filters card inbound-builder-filters">
        <div className="outbound-filter-grid">
          <label className="field compact">
            <span>Từ ngày</span>
            <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} disabled={catalogLoading} />
          </label>
          <label className="field compact">
            <span>Đến ngày</span>
            <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} disabled={catalogLoading} />
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
            <button type="button" className="btn-secondary inbound-filter-apply-btn" onClick={exportCsv} disabled={!rows.length}>
              Xuất CSV
            </button>
          </div>
        </div>
      </section>

      {loading && <p className="muted">Đang tải…</p>}

      <div className="outbound-table-wrap card inbound-builder-table-card builder-table-card">
        <div className="table-scroll sticky-head-wrap">
          <table className="lines-table condensed inbound-receipt-table sticky-head">
            <thead>
              <tr>
                <th>Kho</th>
                <th>Mã HH</th>
                <th>Tên hàng</th>
                <th>ĐVT</th>
                <th className="align-right">Tồn đầu</th>
                <th className="align-right">Nhập kỳ</th>
                <th className="align-right">Xuất kỳ</th>
                <th className="align-right">Tồn cuối</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                rows.map((r) => (
                  <tr key={`${r.warehouseId}-${r.productId}`}>
                    <td>{r.warehouseName}</td>
                    <td className="muted">{r.productId}</td>
                    <td>{r.productName}</td>
                    <td>{r.unit}</td>
                    <td className="align-right">{fmtQty(r.opening)}</td>
                    <td className="align-right">{fmtQty(r.periodIn)}</td>
                    <td className="align-right">{fmtQty(r.periodOut)}</td>
                    <td className="align-right">
                      <strong>{fmtQty(r.closing)}</strong>
                    </td>
                  </tr>
                ))}
              {!loading && !rows.length && (
                <tr>
                  <td colSpan={8} className="muted centered">
                    Không có dòng phù hợp bộ lọc (hoặc chưa có phát sinh nhập/xuất).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ReportShell>
  );
}

/** Báo cáo tồn kho theo mặt hàng — tính luỹ kế đến ngày chọn; đối chiếu thực tế vẫn nên dùng kiểm kê. */
export function ReportStockScreen({ nav }: { nav: Nav }): ReactElement {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [fAsOf, setFAsOf] = useState(todayIsoDate);
  const [fWh, setFWh] = useState("");
  const [applied, setApplied] = useState({ asOf: todayIsoDate(), wh: "" });
  const [rows, setRows] = useState<StockBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCatalogLoading(true);
      try {
        const w = await fetchWarehouses();
        if (!cancelled) setWarehouses(w);
      } catch {
        if (!cancelled) setWarehouses([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wh = applied.wh.trim() ? Number(applied.wh) : null;
      const res = await fetchStockBalance({
        asOf: applied.asOf,
        warehouseId: wh != null && Number.isFinite(wh) ? wh : null,
      });
      setRows(res.rows);
    } catch (e) {
      setError(getHttpErrorMessage(e, "Không tải được báo cáo."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = (): void => {
    setApplied({ asOf: fAsOf, wh: fWh });
  };

  const exportCsv = (): void => {
    const headers = ["Kho", "Mã kho", "Mã HH", "Tên hàng", "ĐVT", "Lũy kế nhập", "Lũy kế xuất", "Tồn"];
    const lines = rows.map((r) => [
      r.warehouseName,
      r.warehouseCode ?? "",
      String(r.productId),
      r.productName,
      r.unit,
      String(r.qtyIn),
      String(r.qtyOut),
      String(r.onHand),
    ]);
    downloadTextFile(`bao-cao-ton-${applied.asOf}.csv`, rowsToCsv(headers, lines));
  };

  return (
    <ReportShell
      title="Báo cáo tồn kho"
      intro="Tồn được suy ra theo công thức: tổng số lượng nhập đã xác nhận (đến hết ngày chọn) trừ tổng xuất thực (phiếu « Đã xuất » trừ « Hoàn hàng »). Không cần bảng tồn riêng; với kiểm kê thực địa vẫn dùng biên bản kiểm kê (sổ sách vs thực tế theo dòng)."
      nav={nav}
    >
      {error && <div className="banner banner-error">{error}</div>}

      <section className="outbound-filters card inbound-builder-filters">
        <div className="outbound-filter-grid">
          <label className="field compact">
            <span>Tính đến ngày</span>
            <input type="date" value={fAsOf} onChange={(e) => setFAsOf(e.target.value)} disabled={catalogLoading} />
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
            <button type="button" className="btn-secondary inbound-filter-apply-btn" onClick={exportCsv} disabled={!rows.length}>
              Xuất CSV
            </button>
          </div>
        </div>
      </section>

      {loading && <p className="muted">Đang tải…</p>}

      <div className="outbound-table-wrap card inbound-builder-table-card builder-table-card">
        <div className="table-scroll sticky-head-wrap">
          <table className="lines-table condensed inbound-receipt-table sticky-head">
            <thead>
              <tr>
                <th>Kho</th>
                <th>Mã HH</th>
                <th>Tên hàng</th>
                <th>ĐVT</th>
                <th className="align-right">Lũy kế nhập</th>
                <th className="align-right">Lũy kế xuất</th>
                <th className="align-right">Tồn</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                rows.map((r) => (
                  <tr key={`${r.warehouseId}-${r.productId}`}>
                    <td>{r.warehouseName}</td>
                    <td className="muted">{r.productId}</td>
                    <td>{r.productName}</td>
                    <td>{r.unit}</td>
                    <td className="align-right">{fmtQty(r.qtyIn)}</td>
                    <td className="align-right">{fmtQty(r.qtyOut)}</td>
                    <td className="align-right">
                      <strong>{fmtQty(r.onHand)}</strong>
                    </td>
                  </tr>
                ))}
              {!loading && !rows.length && (
                <tr>
                  <td colSpan={7} className="muted centered">
                    Không có dòng phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ReportShell>
  );
}
