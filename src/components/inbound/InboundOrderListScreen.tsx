import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { InboundOrderDetailScreen } from "./InboundOrderDetailScreen";
import type { InboundOrderDetailModel, InboundOrderRow, InboundOrderStatus } from "../../types/inventory";
import {
  approveInboundOrder,
  deleteInboundOrder,
  fetchInboundOrderDetail,
  fetchInboundOrders,
  rejectInboundOrder,
} from "../../services/inboundOrderApi";
import { getHttpErrorMessage } from "../../utils/errors";
import { appAlert, appConfirm } from "../common/appDialogs";
import { IconActionView } from "../icons/ActionIcons";

type Props = {
  onBack: () => void;
  onCreate: () => void;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(s: InboundOrderStatus): string {
  switch (s) {
    case "Chờ duyệt":
      return "outbound-badge outbound-badge-warn";
    case "Hoàn thành":
      return "outbound-badge outbound-badge-ok";
    case "Từ chối":
      return "outbound-badge outbound-badge-danger";
    case "Đã duyệt":
    case "Đang nhập":
      return "outbound-badge outbound-badge-info";
    default:
      return "outbound-badge";
  }
}

/** Danh sách lệnh nhập kho — API. */
export function InboundOrderListScreen({ onBack, onCreate }: Props): ReactElement {
  const [rows, setRows] = useState<InboundOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<InboundOrderDetailModel | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [whFilter, setWhFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInboundOrders({
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search.trim() || undefined,
        orderCode: codeFilter.trim() || undefined,
        sourceDept: sourceFilter.trim() || undefined,
        destWarehouse: whFilter.trim() || undefined,
      });
      setRows(data);
      setError(null);
    } catch (err) {
      setError(getHttpErrorMessage(err, "Không tải được danh sách lệnh nhập."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate, search, codeFilter, sourceFilter, whFilter]);

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
        const d = await fetchInboundOrderDetail(detailId);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setDetailError(getHttpErrorMessage(err, "Không tải được chi tiết lệnh nhập."));
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

  const reloadDetail = async (): Promise<void> => {
    if (detailId == null) return;
    try {
      const d = await fetchInboundOrderDetail(detailId);
      setDetail(d);
    } catch (err) {
      await appAlert(getHttpErrorMessage(err, "Không tải lại chi tiết."), { title: "Không tải lại chi tiết" });
    }
  };

  if (detailId != null) {
    if (detailLoading) {
      return (
        <div className="app-page outbound-page outbound-order-list-page">
          <main className="outbound-main enterprise-ops-stack">
            <button type="button" className="app-inbound-back" onClick={() => setDetailId(null)}>
              ← Danh sách lệnh nhập kho
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
              ← Danh sách lệnh nhập kho
            </button>
            <p className="login-banner">{detailError ?? "Không có chi tiết lệnh."}</p>
          </main>
        </div>
      );
    }
    return (
      <InboundOrderDetailScreen
        detail={detail}
        onClose={() => setDetailId(null)}
        onDelete={async () => {
          if (!(await appConfirm("Bạn chắc chắn muốn xóa lệnh này?", { title: "Xác nhận xóa" }))) return;
          try {
            await deleteInboundOrder(detail.id);
            setDetailId(null);
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không xóa được."), { title: "Không xóa được" });
          }
        }}
        onApprove={async () => {
          try {
            await approveInboundOrder(detail.id);
            await reloadDetail();
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không duyệt được."), { title: "Không duyệt được" });
          }
        }}
        onReject={async () => {
          try {
            await rejectInboundOrder(detail.id);
            await reloadDetail();
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không từ chối được."), { title: "Không từ chối được" });
          }
        }}
      />
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
            <h1 className="outbound-title">Danh sách lệnh nhập kho</h1>
            <p className="enterprise-page-meta">Lệnh nội bộ / NCC — duyệt trước khi ghi phiếu nhập.</p>
          </div>
          <button type="button" className="outbound-btn-primary" onClick={onCreate}>
            Tạo lệnh nhập kho
          </button>
        </div>

        <section className="outbound-filters card">
          <div className="outbound-filter-grid">
            <label className="field compact">
              <span>Tình trạng</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option>Chờ duyệt</option>
                <option>Đã duyệt</option>
                <option>Đang nhập</option>
                <option>Hoàn thành</option>
                <option>Từ chối</option>
              </select>
            </label>
            <label className="field compact">
              <span>Từ ngày</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label className="field compact">
              <span>Đến ngày</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            <label className="field compact">
              <span>Tìm kiếm</span>
              <input
                type="text"
                placeholder="Mã lệnh, bộ phận giao, kho nhập…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="field compact">
              <span>Bộ phận / nguồn giao</span>
              <input
                type="text"
                placeholder="Lọc nguồn giao"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              />
            </label>
            <label className="field compact">
              <span>Mã lệnh</span>
              <input type="text" placeholder="Mã lệnh" value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} />
            </label>
            <label className="field compact">
              <span>Kho nhập</span>
              <input type="text" placeholder="Tên kho nhập" value={whFilter} onChange={(e) => setWhFilter(e.target.value)} />
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
                  <th>Mã lệnh</th>
                  <th>Bộ phận / nguồn giao</th>
                  <th>Kho nhập</th>
                  <th className="align-right">Giá trị</th>
                  <th>Thời gian</th>
                  <th>Tình trạng</th>
                  <th className="narrow">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{r.orderCode}</td>
                    <td>{r.sourceDept}</td>
                    <td className="muted">{r.destWarehouse}</td>
                    <td className="align-right">{formatMoney(r.amount)}</td>
                    <td className="muted">{formatDateTime(r.at)}</td>
                    <td>
                      <span className={statusClass(r.status)}>{r.status}</span>
                    </td>
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
          {!loading && !filtered.length && <p className="outbound-empty muted">Không có lệnh phù hợp bộ lọc.</p>}
        </div>
      </main>
    </div>
  );
}
