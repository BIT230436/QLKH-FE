import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { OutboundOrderDetailScreen } from "./OutboundOrderDetailScreen";
import type { OutboundOrderDetailModel, OutboundOrderRow, OutboundOrderStatus } from "../../types/inventory";
import {
  deleteOutboundOrder,
  fetchOutboundOrderDetail,
  fetchOutboundOrders,
} from "../../services/outboundOrderApi";
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

function statusClass(s: OutboundOrderStatus): string {
  switch (s) {
    case "Chờ duyệt":
      return "outbound-badge outbound-badge-warn";
    case "Hoàn thành":
      return "outbound-badge outbound-badge-ok";
    case "Từ chối":
      return "outbound-badge outbound-badge-danger";
    case "Đã duyệt":
    case "Đang xuất":
      return "outbound-badge outbound-badge-info";
    default:
      return "outbound-badge";
  }
}

/** Danh sách lệnh xuất kho — API. */
export function OutboundOrderListScreen({ onBack, onCreate }: Props): ReactElement {
  const [rows, setRows] = useState<OutboundOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OutboundOrderDetailModel | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [destDept, setDestDept] = useState("");
  const [warehouse, setWarehouse] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOutboundOrders({
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search.trim() || undefined,
        orderCode: orderCode.trim() || undefined,
        destDept: destDept.trim() || undefined,
        warehouse: warehouse.trim() || undefined,
      });
      setRows(data);
      setError(null);
    } catch (err) {
      setError(getHttpErrorMessage(err, "Không tải được danh sách lệnh xuất."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate, search, orderCode, destDept, warehouse]);

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
        const d = await fetchOutboundOrderDetail(detailId);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setDetailError(getHttpErrorMessage(err, "Không tải được chi tiết lệnh xuất."));
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
              ← Danh sách lệnh xuất kho
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
              ← Danh sách lệnh xuất kho
            </button>
            <p className="login-banner">{detailError ?? "Không có chi tiết lệnh."}</p>
          </main>
        </div>
      );
    }
    return (
      <OutboundOrderDetailScreen
        detail={detail}
        onClose={() => setDetailId(null)}
        onDelete={async () => {
          if (!(await appConfirm("Bạn chắc chắn muốn xóa lệnh này?", { title: "Xác nhận xóa" }))) return;
          try {
            await deleteOutboundOrder(detail.id);
            setDetailId(null);
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không xóa được."), { title: "Không xóa được" });
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
            <h1 className="outbound-title">Danh sách lệnh xuất kho</h1>
            <p className="enterprise-page-meta">Quy trình duyệt và theo dõi thực hiện xuất theo lệnh.</p>
          </div>
          <button type="button" className="outbound-btn-primary" onClick={onCreate}>
            Tạo lệnh xuất kho
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
                <option>Đang xuất</option>
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
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã, đích, kho…" />
            </label>
            <label className="field compact">
              <span>Mã lệnh</span>
              <input type="text" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} />
            </label>
            <label className="field compact">
              <span>Đích / bộ phận</span>
              <input type="text" value={destDept} onChange={(e) => setDestDept(e.target.value)} />
            </label>
            <label className="field compact">
              <span>Kho xuất</span>
              <input type="text" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
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
                  <th>Đích / bộ phận</th>
                  <th>Kho xuất</th>
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
                    <td>{r.destDept}</td>
                    <td className="muted">{r.warehouse}</td>
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
