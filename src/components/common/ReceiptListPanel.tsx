import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type Ref,
  type RefObject,
} from "react";
import type { Supplier, Warehouse } from "../../services/types";
import { confirmReceipt, fetchReceiptList } from "../../services/receiptApi";
import type { ReceiptSummary } from "../../services/types";
import { getHttpErrorMessage } from "../../utils/errors";
import { IconActionView, IconDialogConfirm } from "../icons/ActionIcons";
import { loadReceiptDetailForModal, type ReceiptDetailModalState } from "./ReceiptDetailModal";

type Props = {
  suppliers: Supplier[];
  warehouses: Warehouse[];
  setDetailModal?: (s: ReceiptDetailModalState) => void;
  /** Khi có, nút « Xem » mở màn full-page thay vì modal. */
  onOpenReceiptDetail?: (id: number) => void;
  listSectionRef: RefObject<HTMLElement | null>;
  refreshKey: number;
  highlightReceiptId: number | null;
  /** `builder`: bố cục theo Figma danh sách phiếu nhập / xuất (bộ lọc card + bảng). */
  layout?: "default" | "builder";
};

function openReceiptView(
  id: number,
  setDetailModal: Props["setDetailModal"],
  onOpenReceiptDetail?: (receiptId: number) => void
): void {
  if (onOpenReceiptDetail) {
    onOpenReceiptDetail(id);
  } else if (setDetailModal) {
    void loadReceiptDetailForModal(id, setDetailModal);
  }
}

function inboundStatusClass(status: ReceiptSummary["status"]): string {
  if (status === "draft") return "outbound-badge outbound-badge-warn";
  return "outbound-badge outbound-badge-ok";
}

function inboundStatusLabel(status: ReceiptSummary["status"]): string {
  return status === "draft" ? "Nháp" : "Đã xác nhận";
}

export function ReceiptListPanel({
  suppliers,
  warehouses,
  setDetailModal,
  onOpenReceiptDetail,
  listSectionRef,
  refreshKey,
  highlightReceiptId,
  layout = "default",
}: Props): ReactElement {
  const [items, setItems] = useState<ReceiptSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterTick, setFilterTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fWh, setFWh] = useState("");
  const [fSup, setFSup] = useState("");
  const [fCode, setFCode] = useState("");
  const [fStatus, setFStatus] = useState<"" | "draft" | "posted">("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchReceiptList({
        page,
        pageSize,
        from_date: fFrom.trim() || undefined,
        to_date: fTo.trim() || undefined,
        warehouse_id: fWh || undefined,
        supplier_id: fSup || undefined,
        receipt_code: fCode,
        status: fStatus,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setErr(getHttpErrorMessage(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, fFrom, fTo, fWh, fSup, fCode, fStatus, filterTick]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (highlightReceiptId === null || !listSectionRef.current) return;
    const t = window.setTimeout(() => {
      const el = listSectionRef.current?.querySelector(
        `[data-receipt-id="${highlightReceiptId}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(t);
  }, [highlightReceiptId, items, listSectionRef]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyFilters = (): void => {
    setPage(1);
    setFilterTick((t) => t + 1);
  };

  const onConfirm = async (id: number): Promise<void> => {
    setConfirmingId(id);
    try {
      await confirmReceipt(id);
      await load();
    } catch (e) {
      setErr(getHttpErrorMessage(e));
    } finally {
      setConfirmingId(null);
    }
  };

  const filterFields = (
    <>
      <label className="field compact">
        <span>Tình trạng</span>
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as "" | "draft" | "posted")}
        >
          <option value="">Tất cả</option>
          <option value="draft">Nháp</option>
          <option value="posted">Đã xác nhận</option>
        </select>
      </label>
      <label className="field compact">
        <span>Từ ngày</span>
        <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
      </label>
      <label className="field compact">
        <span>Đến ngày</span>
        <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
      </label>
      <label className="field compact">
        <span>Tìm kiếm</span>
        <input
          type="text"
          value={fCode}
          placeholder="Mã phiếu…"
          onChange={(e) => setFCode(e.target.value)}
        />
      </label>
      <label className="field compact">
        <span>Nguồn nhận</span>
        <select value={fSup} onChange={(e) => setFSup(e.target.value)}>
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
        <select value={fWh} onChange={(e) => setFWh(e.target.value)}>
          <option value="">Tất cả</option>
          {warehouses.map((w) => (
            <option key={w.id} value={String(w.id)}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <div className="inbound-filter-apply">
        <button type="button" className="outbound-btn-primary inbound-filter-apply-btn" onClick={() => applyFilters()}>
          Áp dụng
        </button>
      </div>
    </>
  );

  if (layout === "builder") {
    return (
      <div ref={listSectionRef as Ref<HTMLDivElement>} className="inbound-builder-list-root enterprise-ops-stack">
        <section className="outbound-filters card inbound-builder-filters">
          <div className="outbound-filter-grid">{filterFields}</div>
        </section>

        <div className="outbound-table-wrap card inbound-builder-table-card builder-table-card">
          {loading && (
            <p className="inbound-builder-loading muted">Đang tải…</p>
          )}
          {err && <div className="banner banner-error subtle">{err}</div>}

          <div className="table-scroll">
            <table className="outbound-table lines-table condensed">
              <thead>
                <tr>
                  <th className="outbound-col-stt">STT</th>
                  <th>Mã phiếu</th>
                  <th>Nguồn nhận</th>
                  <th>Kho</th>
                  <th className="align-right">Giá trị</th>
                  <th>Thời gian</th>
                  <th>Tình trạng</th>
                  <th className="narrow">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => (
                  <tr
                    key={r.id}
                    data-receipt-id={r.id}
                    className={highlightReceiptId === r.id ? "row-highlight" : undefined}
                  >
                    <td className="muted">{(page - 1) * pageSize + i + 1}</td>
                    <td>{r.receipt_code}</td>
                    <td>{r.supplier_name}</td>
                    <td className="muted">{r.warehouse_name}</td>
                    <td className="align-right">
                      {new Intl.NumberFormat("vi-VN").format(Number(r.total_amount))}
                    </td>
                    <td className="muted">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                    <td>
                      <span className={inboundStatusClass(r.status)}>{inboundStatusLabel(r.status)}</span>
                    </td>
                    <td className="narrow actions-stack">
                      <button
                        type="button"
                        className="table-action-btn"
                        title="Xem"
                        aria-label="Xem"
                        onClick={() => openReceiptView(r.id, setDetailModal, onOpenReceiptDetail)}
                      >
                        <IconActionView className="table-action-ico" />
                      </button>
                      {r.status === "draft" && (
                        <button
                          type="button"
                          className="btn-link table-action-btn"
                          title="Xác nhận nhập kho"
                          aria-label="Xác nhận nhập kho"
                          disabled={confirmingId === r.id}
                          onClick={() => void onConfirm(r.id)}
                        >
                          {confirmingId === r.id ? (
                            "…"
                          ) : (
                            <IconDialogConfirm className="table-action-ico" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!items.length && !loading && (
                  <tr>
                    <td colSpan={8} className="muted centered">
                      Không có phiếu phù hợp bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pager inbound-list-pager">
            <span className="muted">
              {total} phiếu — trang {page}/{totalPages}
            </span>
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="card enterprise-ops-stack" ref={listSectionRef as Ref<HTMLElement>}>
      <div className="section-head">
        <h2 className="card-title">Danh sách phiếu nhập</h2>
        {loading && <span className="muted">Đang tải…</span>}
      </div>
      <p className="muted small-hint">
        Lọc theo nghiệp vụ; mặc định sắp xếp theo thời điểm lưu (id mới nhất). Dùng &quot;Ngày CT&quot;
        để đối chiếu chứng từ.
      </p>

      {err && <div className="banner banner-error subtle">{err}</div>}

      <div className="filter-bar">
        <label className="field compact">
          <span>Từ ngày</span>
          <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
        </label>
        <label className="field compact">
          <span>Đến ngày</span>
          <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
        </label>
        <label className="field compact">
          <span>Kho</span>
          <select value={fWh} onChange={(e) => setFWh(e.target.value)}>
            <option value="">Tất cả</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>NCC</span>
          <select value={fSup} onChange={(e) => setFSup(e.target.value)}>
            <option value="">Tất cả</option>
            {suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>Mã phiếu</span>
          <input
            type="text"
            value={fCode}
            placeholder="Gõ một phần mã"
            onChange={(e) => setFCode(e.target.value)}
          />
        </label>
        <label className="field compact">
          <span>Trạng thái</span>
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value as "" | "draft" | "posted")}
          >
            <option value="">Tất cả</option>
            <option value="draft">Nháp</option>
            <option value="posted">Đã xác nhận</option>
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={() => applyFilters()}>
          Áp dụng
        </button>
      </div>

      <div className="table-scroll sticky-head-wrap">
        <table className="lines-table condensed sticky-head">
          <thead>
            <tr>
              <th>Mã</th>
              <th>TT</th>
              <th>NCC</th>
              <th>Kho</th>
              <th>Ngày CT</th>
              <th>Lưu lúc</th>
              <th className="align-right">Tổng</th>
              <th className="narrow">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr
                key={r.id}
                data-receipt-id={r.id}
                className={highlightReceiptId === r.id ? "row-highlight" : undefined}
              >
                <td>{r.receipt_code}</td>
                <td>
                  {r.status === "draft" ? (
                    <span className="badge badge-warn">Nháp</span>
                  ) : (
                    <span className="badge badge-ok">OK</span>
                  )}
                </td>
                <td>{r.supplier_name}</td>
                <td className="muted">{r.warehouse_name}</td>
                <td>{new Date(r.document_date + "T12:00:00").toLocaleDateString("vi-VN")}</td>
                <td className="muted">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                <td className="align-right muted">
                  {new Intl.NumberFormat("vi-VN").format(Number(r.total_amount))}
                </td>
                <td className="narrow actions-stack">
                  <button
                    type="button"
                    className="table-action-btn"
                    title="Xem"
                    aria-label="Xem"
                    onClick={() => openReceiptView(r.id, setDetailModal, onOpenReceiptDetail)}
                  >
                    <IconActionView className="table-action-ico" />
                  </button>
                  {r.status === "draft" && (
                    <button
                      type="button"
                      className="btn-link table-action-btn"
                      title="Xác nhận nhập kho"
                      aria-label="Xác nhận nhập kho"
                      disabled={confirmingId === r.id}
                      onClick={() => void onConfirm(r.id)}
                    >
                      {confirmingId === r.id ? (
                        "…"
                      ) : (
                        <IconDialogConfirm className="table-action-ico" />
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr>
                <td colSpan={8} className="muted centered">
                  Không có phiếu phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <span className="muted">
          {total} phiếu — trang {page}/{totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Trước
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau
        </button>
      </div>
    </section>
  );
}
