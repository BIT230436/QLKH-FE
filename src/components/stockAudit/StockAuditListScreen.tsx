import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { StockAuditDetailScreen } from "./StockAuditDetailScreen";
import type { StockAuditDetailModel, StockAuditListRow, StockAuditStatus } from "../../types/inventory";
import { fetchStockAuditDetail, fetchStockAudits } from "../../services/stockAuditApi";
import { getHttpErrorMessage } from "../../utils/errors";
import { IconActionView } from "../icons/ActionIcons";

type Props = {
  onBack: () => void;
  onCreate: () => void;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(s: StockAuditStatus): string {
  switch (s) {
    case "Nháp":
      return "outbound-badge outbound-badge-warn";
    case "Hoàn thành":
      return "outbound-badge outbound-badge-ok";
    case "Hủy":
      return "outbound-badge outbound-badge-danger";
    case "Chờ duyệt":
      return "outbound-badge outbound-badge-info";
    default:
      return "outbound-badge";
  }
}

/** Danh sách biên bản kiểm kê — API. */
export function StockAuditListScreen({ onBack, onCreate }: Props): ReactElement {
  const [rows, setRows] = useState<StockAuditListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StockAuditDetailModel | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStockAudits({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setRows(data);
      setError(null);
    } catch (err) {
      setError(getHttpErrorMessage(err, "Không tải được danh sách kiểm kê."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (detailId == null) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const d = await fetchStockAuditDetail(detailId);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setDetailError(getHttpErrorMessage(err, "Không tải được chi tiết kiểm kê."));
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const filtered = useMemo(() => rows, [rows]);

  if (detailId != null) {
    if (detailLoading) {
      return (
        <div className="app-page outbound-page outbound-order-list-page">
          <main className="outbound-main enterprise-ops-stack">
            <button type="button" className="app-inbound-back" onClick={() => setDetailId(null)}>
              ← Danh sách kiểm kê
            </button>
            <p className="muted">Đang tải chi tiết…</p>
          </main>
        </div>
      );
    }
    if (detailError || !detail) {
      return (
        <div className="app-page outbound-page outbound-order-list-page">
          <main className="outbound-main enterprise-ops-stack">
            <button type="button" className="app-inbound-back" onClick={() => setDetailId(null)}>
              ← Danh sách kiểm kê
            </button>
            <p className="login-banner">{detailError ?? "Không có chi tiết biên bản."}</p>
          </main>
        </div>
      );
    }
    return (
      <StockAuditDetailScreen detail={detail} onClose={() => setDetailId(null)} />
    );
  }

  return (
    <div className="app-page outbound-page outbound-order-list-page">
      <main className="outbound-main enterprise-ops-stack">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBack}>
            ← Tổng quan
          </button>
        </div>
        <div className="outbound-head">
          <div>
            <h1 className="outbound-title">Danh sách biên bản kiểm kê hàng hóa</h1>
            <p className="enterprise-page-meta">Theo dõi trạng thái biên bản; mở chi tiết để đối chiếu tồn thực tế.</p>
          </div>
          <button type="button" className="outbound-btn-primary" onClick={onCreate}>
            Tạo mới biên bản kiểm kê
          </button>
        </div>

        <section className="outbound-filters card">
          <div className="outbound-filter-grid">
            <label className="field compact">
              <span>Trạng thái</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option>Nháp</option>
                <option>Chờ duyệt</option>
                <option>Hoàn thành</option>
                <option>Hủy</option>
              </select>
            </label>
            <label className="field compact">
              <span>Tìm kiếm</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã, kho, người lập…" />
            </label>
          </div>
        </section>

        {error && <p className="login-banner">{error}</p>}
        {loading && <p className="muted">Đang tải…</p>}

        <div className="outbound-table-wrap card builder-table-card">
          <div className="table-scroll">
            <table className="outbound-table lines-table condensed">
              <thead>
                <tr>
                  <th className="outbound-col-stt">STT</th>
                  <th>Mã biên bản</th>
                  <th>Kho</th>
                  <th>Thời điểm kiểm</th>
                  <th>Trạng thái</th>
                  <th>Người lập</th>
                  <th className="align-right">Số dòng</th>
                  <th className="narrow">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{r.docCode}</td>
                    <td className="muted">{r.warehouse}</td>
                    <td className="muted">{formatDateTime(r.auditedAt)}</td>
                    <td>
                      <span className={statusClass(r.status)}>{r.status}</span>
                    </td>
                    <td>{r.preparedBy}</td>
                    <td className="align-right">{r.lineCount}</td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        title="Xem"
                        aria-label="Xem"
                        onClick={() => setDetailId(r.id)}
                      >
                        <IconActionView className="table-action-ico" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !filtered.length && <p className="outbound-empty muted">Không có biên bản phù hợp bộ lọc.</p>}
        </div>
      </main>
    </div>
  );
}
