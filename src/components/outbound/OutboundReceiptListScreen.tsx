import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { OutboundReceiptDetailScreen } from "./OutboundReceiptDetailScreen";
import type { OutboundDetailModel, OutboundRow, OutboundStatus } from "../../types/inventory";
import {
  approveOutboundReceipt,
  deleteOutboundReceipt,
  fetchOutboundReceiptDetail,
  fetchOutboundReceipts,
  markReturnedOutboundReceipt,
  markShippedOutboundReceipt,
  rejectOutboundReceipt,
} from "../../services/outboundReceiptApi";
import { getHttpErrorMessage } from "../../utils/errors";
import { appAlert, appConfirm } from "../common/appDialogs";
import { IconActionView } from "../icons/ActionIcons";

type Props = {
  onCreate: () => void;
  title?: string;
  sourceColumnLabel?: string;
  createButtonLabel?: string;
  detailBackLabel?: string;
  detailCrumbSection?: string;
  detailCrumbAction?: string;
  /** Bắt buộc để tải danh sách từ API */
  receiptScope: "ncc" | "internal" | "nvbh";
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

function statusClass(s: OutboundStatus): string {
  switch (s) {
    case "Chờ duyệt":
      return "outbound-badge outbound-badge-warn";
    case "Đã xuất":
      return "outbound-badge outbound-badge-ok";
    case "Từ chối":
      return "outbound-badge outbound-badge-danger";
    case "Đã duyệt":
      return "outbound-badge outbound-badge-info";
    case "Hoàn hàng":
      return "outbound-badge outbound-badge-muted";
    default:
      return "outbound-badge";
  }
}

/** Danh sách phiếu xuất — dữ liệu API theo `receiptScope`. */
export function OutboundReceiptListScreen({
  onCreate,
  title = "Danh sách phiếu xuất",
  sourceColumnLabel = "Nguồn nhận",
  createButtonLabel = "Tạo phiếu xuất kho",
  detailBackLabel,
  detailCrumbSection,
  detailCrumbAction,
  receiptScope,
}: Props): ReactElement {
  const [rows, setRows] = useState<OutboundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OutboundDetailModel | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOutboundReceipts({
        scope: receiptScope,
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search.trim() || undefined,
      });
      setRows(data);
      setError(null);
    } catch (err) {
      setError(getHttpErrorMessage(err, "Không tải được danh sách phiếu xuất."));
    } finally {
      setLoading(false);
    }
  }, [receiptScope, statusFilter, fromDate, toDate, search]);

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
        const d = await fetchOutboundReceiptDetail(detailId);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setDetailError(getHttpErrorMessage(err, "Không tải được chi tiết phiếu."));
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId, detailRefresh]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (codeFilter && !r.code.toLowerCase().includes(codeFilter.toLowerCase())) return false;
      if (sourceFilter && !r.source.toLowerCase().includes(sourceFilter.toLowerCase())) return false;
      return true;
    });
  }, [rows, sourceFilter, codeFilter]);

  if (detailId != null) {
    if (detailLoading) {
      return (
        <div className="app-page outbound-page">
          <main className="outbound-main enterprise-ops-stack">
            <p className="muted">Đang tải chi tiết…</p>
          </main>
        </div>
      );
    }
    if (detailError || !detail) {
      return (
        <div className="app-page outbound-page">
          <main className="outbound-main enterprise-ops-stack">
            <button type="button" className="app-inbound-back" onClick={() => setDetailId(null)}>
              {detailBackLabel ?? "← Danh sách"}
            </button>
            <p className="login-banner">{detailError ?? "Không có chi tiết phiếu."}</p>
          </main>
        </div>
      );
    }
    return (
      <OutboundReceiptDetailScreen
        detail={detail}
        onClose={() => setDetailId(null)}
        onDelete={async () => {
          if (!(await appConfirm("Bạn chắc chắn muốn xóa phiếu xuất này?", { title: "Xác nhận xóa" }))) return;
          try {
            await deleteOutboundReceipt(detail.id);
            setDetailId(null);
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không xóa được (trạng thái không cho phép?)."), {
              title: "Không xóa được",
            });
          }
        }}
        onApprove={async () => {
          try {
            await approveOutboundReceipt(detail.id);
            setDetailRefresh((v) => v + 1);
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không duyệt được — kiểm tra quyền outbound.receipt.approve."), {
              title: "Không duyệt được",
            });
          }
        }}
        onReject={async () => {
          if (!(await appConfirm("Từ chối phiếu xuất này?", { title: "Xác nhận từ chối" }))) return;
          try {
            await rejectOutboundReceipt(detail.id);
            setDetailRefresh((v) => v + 1);
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không từ chối được."), { title: "Không từ chối được" });
          }
        }}
        onMarkShipped={async () => {
          if (
            !(await appConfirm("Xác nhận đã xuất kho (trừ tồn theo nghiệp vụ báo cáo)?", { title: "Xác nhận xuất kho" }))
          )
            return;
          try {
            await markShippedOutboundReceipt(detail.id);
            setDetailRefresh((v) => v + 1);
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không cập nhật được."), { title: "Không cập nhật được" });
          }
        }}
        onMarkReturned={async () => {
          if (!(await appConfirm("Ghi nhận hoàn hàng?", { title: "Xác nhận hoàn hàng" }))) return;
          try {
            await markReturnedOutboundReceipt(detail.id);
            setDetailRefresh((v) => v + 1);
            await load();
          } catch (err) {
            await appAlert(getHttpErrorMessage(err, "Không cập nhật được."), { title: "Không cập nhật được" });
          }
        }}
        backLabel={detailBackLabel}
        crumbSection={detailCrumbSection}
        crumbAction={detailCrumbAction}
      />
    );
  }

  return (
    <div className="app-page outbound-page">
      <main className="outbound-main enterprise-ops-stack">
        <div className="outbound-head">
          <div>
            <h1 className="outbound-title">{title}</h1>
            <p className="enterprise-page-meta">Danh sách phiếu xuất theo phạm vi kênh — lọc nhanh theo trạng thái và thời gian.</p>
          </div>
          <button type="button" className="outbound-btn-primary" onClick={onCreate}>
            {createButtonLabel}
          </button>
        </div>

        <section className="outbound-filters card">
          <div className="outbound-filter-grid">
            <label className="field compact">
              <span>Tình trạng</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option>Chờ duyệt</option>
                <option>Đã xuất</option>
                <option>Từ chối</option>
                <option>Đã duyệt</option>
                <option>Hoàn hàng</option>
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
                placeholder="Mã, nguồn…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="field compact">
              <span>{sourceColumnLabel}</span>
              <input
                type="text"
                placeholder="Lọc theo cột"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              />
            </label>
            <label className="field compact">
              <span>Mã phiếu</span>
              <input
                type="text"
                placeholder="Mã phiếu"
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
              />
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
                  <th>Mã phiếu</th>
                  <th>{sourceColumnLabel}</th>
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
                    <td>{r.code}</td>
                    <td>{r.source}</td>
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
          {!loading && !filtered.length && <p className="outbound-empty muted">Không có phiếu phù hợp bộ lọc.</p>}
        </div>
      </main>
    </div>
  );
}
