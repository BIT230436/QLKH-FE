import { useEffect, useState, type ReactElement } from "react";
import { fetchDashboardSummary, type DashboardSummary } from "../../services/dashboardApi";
import { IconClipboard, IconPackage } from "../icons/NavIcons";

export type Props = {
  onOpenInboundList: () => void;
  onOpenInboundCreate: () => void;
  onOpenOutboundList: () => void;
  onOpenOutboundNvbhList: () => void;
  onOpenOutboundOrderList: () => void;
  onOpenInboundOrderList: () => void;
  onOpenStockAuditList: () => void;
  onOpenStockAuditCreate: () => void;
  onOpenOutboundInternalList: () => void;
  onOpenCatalogSources: () => void;
  onOpenCatalogProductGroups: () => void;
  onOpenReportInbound: () => void;
  onOpenReportStock: () => void;
  onOpenReportIo: () => void;
  onOpenContracts: () => void;
};

function StatusListBlock({
  title,
  map,
  fmt,
}: {
  title: string;
  map: Record<string, number>;
  fmt: (n: number) => string;
}): ReactElement {
  const entries = Object.entries(map).filter(([, c]) => c > 0);
  const total = entries.reduce((s, [, c]) => s + c, 0);
  return (
    <article className="home-card home-card-chart dash-chart-card dash-state-panel">
      <div className="dash-card-head">
        <h2 className="dash-card-head-title">{title}</h2>
      </div>
      <div className="dash-card-body">
        {total === 0 ? (
          <p className="muted home-card-chart-empty dash-state-empty">Chưa có dữ liệu.</p>
        ) : (
          <ul className="home-status-list">
            {entries.map(([st, c]) => (
              <li key={st}>
                <span>{st}</span>
                <span className="home-status-meta">
                  <strong>{fmt(c)}</strong>
                  <span className="muted"> ({Math.round((c / total) * 100)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

/** Trang chủ / tổng quan — KPI và phân bổ trạng thái (menu nằm ở AppShell). */
export function HomeScreen({
  onOpenInboundList,
  onOpenInboundCreate,
  onOpenOutboundList,
  onOpenOutboundNvbhList,
  onOpenOutboundOrderList,
  onOpenInboundOrderList,
  onOpenStockAuditList,
  onOpenStockAuditCreate,
  onOpenOutboundInternalList,
  onOpenCatalogSources,
  onOpenCatalogProductGroups,
  onOpenReportInbound,
  onOpenReportStock,
  onOpenReportIo,
  onOpenContracts,
}: Props): ReactElement {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoad, setSummaryLoad] = useState<"loading" | "ok" | "error">("loading");
  const [summaryUpdatedAt, setSummaryUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await fetchDashboardSummary();
        if (!cancelled) {
          setSummary(s);
          setSummaryLoad("ok");
          setSummaryUpdatedAt(
            new Date().toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
          setSummaryLoad("error");
          setSummaryUpdatedAt(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number): string => new Intl.NumberFormat("vi-VN").format(n);

  const inboundOrderTotal = summary
    ? Object.values(summary.inboundOrdersByStatus).reduce((a, b) => a + b, 0)
    : 0;
  const outboundOrderTotal = summary
    ? Object.values(summary.outboundOrdersByStatus).reduce((a, b) => a + b, 0)
    : 0;

  const inboundTotal = summary ? Object.values(summary.receiptsByStatus).reduce((a, b) => a + b, 0) : 0;
  const outboundRcTotal = summary
    ? Object.values(summary.outboundReceiptsByStatus).reduce((a, b) => a + b, 0)
    : 0;
  const ratioInbound =
    inboundTotal + outboundRcTotal > 0 ? Math.round((inboundTotal / (inboundTotal + outboundRcTotal)) * 100) : 50;
  const ratioOutbound = 100 - ratioInbound;

  return (
    <div className="dash-home">
      <div className="home-content dash-home-inner">
        <section className="home-hero dash-home-hero">
          <div className="dash-hero-top">
            <div>
              <h1 className="home-hero-title">Tổng quan</h1>
              <p className="home-hero-desc">
                Theo dõi vận hành kho — menu trái mở đầy đủ phiếu, lệnh và kiểm kê.
              </p>
            </div>
            {summaryUpdatedAt && summaryLoad === "ok" ? (
              <p className="dash-meta-updated" title="Thời điểm tải dữ liệu gần nhất">
                Cập nhật <strong>{summaryUpdatedAt}</strong>
              </p>
            ) : null}
          </div>

          <div className="dash-link-groups">
            <div className="dash-link-group">
              <div className="dash-link-group-label">Thao tác nhanh — vận hành</div>
              <div className="dash-quick-links dash-quick-links-primary">
                <button type="button" className="dash-chip dash-chip-primary" onClick={onOpenOutboundList}>
                  Phiếu xuất NCC
                </button>
                <button type="button" className="dash-chip dash-chip-primary" onClick={onOpenInboundList}>
                  Phiếu nhập kho
                </button>
                <button type="button" className="dash-chip dash-chip-primary" onClick={onOpenOutboundOrderList}>
                  Lệnh xuất kho
                </button>
                <button type="button" className="dash-chip dash-chip-primary" onClick={onOpenInboundOrderList}>
                  Lệnh nhập kho
                </button>
                <button type="button" className="dash-chip dash-chip-primary" onClick={onOpenStockAuditList}>
                  Kiểm kê
                </button>
                <button type="button" className="dash-chip dash-chip-primary" onClick={onOpenInboundCreate}>
                  Tạo phiếu nhập
                </button>
                <button type="button" className="dash-chip dash-chip-primary" onClick={onOpenStockAuditCreate}>
                  Tạo kiểm kê
                </button>
              </div>
            </div>
            <div className="dash-link-group">
              <div className="dash-link-group-label">Kênh &amp; danh mục / báo cáo</div>
              <div className="dash-quick-links dash-quick-links-secondary">
                <button type="button" className="dash-chip" onClick={onOpenOutboundNvbhList}>
                  Xuất NVBH
                </button>
                <button type="button" className="dash-chip" onClick={onOpenOutboundInternalList}>
                  Xuất nội bộ
                </button>
                <button type="button" className="dash-chip" onClick={onOpenCatalogProductGroups}>
                  Danh mục hàng
                </button>
                <button type="button" className="dash-chip" onClick={onOpenCatalogSources}>
                  Nguồn hàng
                </button>
                <button type="button" className="dash-chip" onClick={onOpenContracts}>
                  Hợp đồng
                </button>
                <button type="button" className="dash-chip" onClick={onOpenReportInbound}>
                  Báo cáo nhập
                </button>
                <button type="button" className="dash-chip" onClick={onOpenReportStock}>
                  Báo cáo tồn
                </button>
                <button type="button" className="dash-chip" onClick={onOpenReportIo}>
                  XNT
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="dash-section">
          <header className="dash-section-bar">
            <h2 className="dash-section-bar-title">Phân bổ phiếu</h2>
            <div className="dash-segmented" role="group" aria-label="Kỳ thời gian">
              <button type="button" className="is-active">
                Ngày
              </button>
              <button type="button" disabled>
                Tuần
              </button>
              <button type="button" disabled>
                Tháng
              </button>
              <button type="button" disabled>
                Năm
              </button>
            </div>
          </header>
          <div className="dash-section-body dash-overview-visual dash-overview-ratio">
            <p className="dash-visual-caption">Tỉ lệ phiếu nhập / phiếu xuất (theo số lượng chứng từ)</p>
            <div className="dash-ratio-column">
              <div className="dash-ratio-bar-wrap" aria-hidden>
                <div className="dash-ratio-bar">
                  <div
                    className="dash-ratio-seg dash-ratio-seg-in"
                    style={{ width: summaryLoad === "ok" && summary ? `${ratioInbound}%` : "50%" }}
                    title="Nhập"
                  />
                  <div
                    className="dash-ratio-seg dash-ratio-seg-out"
                    style={{ width: summaryLoad === "ok" && summary ? `${ratioOutbound}%` : "50%" }}
                    title="Xuất"
                  />
                </div>
              </div>
              <div className="home-legend dash-ratio-legend">
                <span>
                  <span className="dot dot-in" /> Nhập {summaryLoad === "ok" && summary ? `${ratioInbound}%` : "—"}
                </span>
                <span>
                  <span className="dot dot-out" /> Xuất {summaryLoad === "ok" && summary ? `${ratioOutbound}%` : "—"}
                </span>
              </div>
            </div>
            <div className="dash-stat-cards">
              <div className="dash-stat-teal dash-stat-slate">
                <span className="dash-stat-ico" aria-hidden>
                  <IconClipboard className="dash-stat-ico-svg" />
                </span>
                <div>
                  <div className="dash-stat-label">Tổng số phiếu</div>
                  <div className="dash-stat-num">{summary ? fmt(inboundTotal + outboundRcTotal) : "—"}</div>
                </div>
              </div>
              <div className="dash-stat-teal dash-stat-slate">
                <span className="dash-stat-ico" aria-hidden>
                  <IconPackage className="dash-stat-ico-svg" />
                </span>
                <div>
                  <div className="dash-stat-label">Phiếu nhập / Phiếu xuất</div>
                  <div className="dash-stat-num">{summary ? `${fmt(inboundTotal)} / ${fmt(outboundRcTotal)}` : "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {summaryLoad === "loading" && (
          <div className="dash-feed-state dash-feed-state-loading" role="status">
            Đang tải dữ liệu tổng quan…
          </div>
        )}
        {summaryLoad === "error" && (
          <div className="dash-feed-state dash-feed-state-error" role="alert">
            Không tải được tổng quan. Kiểm tra mạng hoặc đăng nhập.
          </div>
        )}

        {summaryLoad === "ok" && summary && (
          <div className="home-split">
            <StatusListBlock title="Phiếu nhập kho — theo trạng thái" map={summary.receiptsByStatus} fmt={fmt} />
            <StatusListBlock title="Phiếu xuất kho — theo trạng thái" map={summary.outboundReceiptsByStatus} fmt={fmt} />
          </div>
        )}

        <div className="home-kpi-grid">
          <div className="home-kpi dash-kpi">
            <span className="home-kpi-label">Tổng phiếu xuất</span>
            <strong className="home-kpi-value">{summary ? fmt(summary.outboundReceiptTotal) : "—"}</strong>
          </div>
          <div className="home-kpi dash-kpi">
            <span className="home-kpi-label">Tổng phiếu nhập</span>
            <strong className="home-kpi-value">{summary ? fmt(summary.receiptTotal) : "—"}</strong>
          </div>
          <div className="home-kpi dash-kpi">
            <span className="home-kpi-label">Nhóm hàng hóa</span>
            <strong className="home-kpi-value">{summary ? fmt(summary.productGroups) : "—"}</strong>
          </div>
          <div className="home-kpi dash-kpi">
            <span className="home-kpi-label">Nguồn hàng</span>
            <strong className="home-kpi-value">{summary ? fmt(summary.catalogSources) : "—"}</strong>
          </div>
        </div>

        {summaryLoad === "ok" && summary && (
          <div className="home-split home-split-bottom">
            <StatusListBlock title="Lệnh nhập kho — theo trạng thái" map={summary.inboundOrdersByStatus} fmt={fmt} />
            <StatusListBlock title="Lệnh xuất kho — theo trạng thái" map={summary.outboundOrdersByStatus} fmt={fmt} />
            <article className="home-card home-card-stat-tall home-stat-wide dash-chart-card">
              <div className="dash-card-head">
                <h2 className="dash-card-head-title">Phiếu nhập vs lệnh</h2>
              </div>
              <div className="dash-card-body">
                <p className="home-stat-big">{fmt(summary.receiptTotal)}</p>
                <p className="muted home-card-stat-note">
                  Tổng phiếu nhập kho (01-VT). Khác với tổng đơn lệnh nhập/xuất.
                </p>
                <p className="muted">
                  Lệnh nhập: {fmt(inboundOrderTotal)} · Lệnh xuất: {fmt(outboundOrderTotal)}
                </p>
              </div>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
