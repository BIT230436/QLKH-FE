import { useCallback, useEffect, useState, type ReactElement } from "react";
import type { ReceiptDetail } from "../../services/types";
import { confirmReceipt, deleteReceipt, fetchReceiptDetail } from "../../services/receiptApi";
import { getHttpErrorMessage } from "../../utils/errors";
import { appConfirm } from "../common/appDialogs";
import { IconDialogConfirm } from "../icons/ActionIcons";
import { openReceiptPrintWindow } from "../../utils/receiptPrint";
import { formatSourceDocOneVtLine, hasSourceDocReference } from "../../utils/receiptSourceDoc";

type Props = {
  receiptId: number;
  onClose: () => void;
  /** Gọi sau khi xác nhận nhập kho thành công (làm mới danh sách). */
  onAfterMutation?: () => void;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDateOnly(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("vi-VN");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: string): string {
  return status === "draft" ? "outbound-badge outbound-badge-warn" : "outbound-badge outbound-badge-ok";
}

function statusLabel(status: string): string {
  return status === "draft" ? "Nháp" : "Đã xác nhận";
}

/**
 * Xem phiếu nhập kho — bố cục theo Figma / Builder, dữ liệu từ API chi tiết phiếu.
 */
export function InboundReceiptDetailScreen({
  receiptId,
  onClose,
  onAfterMutation,
}: Props): ReactElement {
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchReceiptDetail(receiptId);
      setDetail(d);
    } catch (e) {
      setErr(getHttpErrorMessage(e));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirm = async (): Promise<void> => {
    if (!detail || detail.receipt.status !== "draft") return;
    setActionErr(null);
    setConfirmBusy(true);
    try {
      const d = await confirmReceipt(detail.receipt.id);
      setDetail(d);
      onAfterMutation?.();
    } catch (e) {
      setActionErr(getHttpErrorMessage(e));
    } finally {
      setConfirmBusy(false);
    }
  };

  const r = detail?.receipt;
  const totalNum = detail ? Number(detail.receipt.total_amount) : 0;

  return (
    <div className="app-page outbound-page out-detail-page inbound-detail-page feature-doc-page">
      <main className="outbound-main out-detail-main">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onClose}>
            ← Danh sách phiếu nhập
          </button>
        </div>
        <p className="out-create-crumb muted">
          Xuất - nhập với NCC <span className="out-create-crumb-sep">›</span> Xem phiếu nhập kho
        </p>

        <div className="out-detail-head-row">
          <h1 className="out-detail-doc-title">Phiếu nhập kho</h1>
          {detail && detail.receipt.status === "draft" ? (
            <div className="out-detail-head-actions">
              <button
                type="button"
                className="out-detail-btn-danger"
                disabled={deleteBusy}
                title="Xóa vĩnh viễn — chỉ áp dụng cho phiếu nháp"
                onClick={() => {
                  void (async () => {
                    setDeleteBusy(true);
                    try {
                      if (!(await appConfirm("Xóa vĩnh viễn phiếu nháp này?", { title: "Xác nhận xóa" }))) return;
                      setActionErr(null);
                      try {
                        await deleteReceipt(detail.receipt.id);
                        onAfterMutation?.();
                        onClose();
                      } catch (e) {
                        setActionErr(getHttpErrorMessage(e, "Không xóa được phiếu."));
                      }
                    } finally {
                      setDeleteBusy(false);
                    }
                  })();
                }}
              >
                {deleteBusy ? "Đang xóa…" : "Xóa"}
              </button>
            </div>
          ) : null}
        </div>

        {loading && <p className="muted inbound-detail-loading">Đang tải…</p>}

        {err && (
          <div className="banner banner-error" role="alert">
            {err}
          </div>
        )}

        {detail && r && (
          <>
            {actionErr && (
              <div className="banner banner-error subtle" role="alert">
                {actionErr}
              </div>
            )}

            <div className="inbound-detail-toolbar">
              <button
                type="button"
                className="out-create-btn-secondary"
                onClick={() => openReceiptPrintWindow(detail)}
              >
                In phiếu
              </button>
              {r.status === "draft" && (
                <button
                  type="button"
                  className="btn-primary btn-with-ico"
                  disabled={confirmBusy}
                  onClick={() => void handleConfirm()}
                >
                  {confirmBusy ? (
                    "Đang xác nhận…"
                  ) : (
                    <>
                      <IconDialogConfirm />
                      Xác nhận nhập kho
                    </>
                  )}
                </button>
              )}
            </div>

            <section className="card out-create-table-card out-detail-table-card">
              <div className="table-scroll sticky-head-wrap">
                <table className="lines-table condensed outbound-table sticky-head">
                  <thead>
                    <tr>
                      <th className="outbound-col-stt">STT</th>
                      <th>Tên hàng hóa</th>
                      <th>Mã hàng</th>
                      <th>Đơn vị tính</th>
                      <th className="align-right">SL theo CT</th>
                      <th className="align-right">SL thực nhập</th>
                      <th className="align-right">Đơn giá</th>
                      <th className="align-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((line, index) => {
                      const qd = Number(line.quantity_per_doc);
                      const qr = Number(line.quantity_received);
                      const mismatch = Number.isFinite(qd) && Number.isFinite(qr) && qd !== qr;
                      return (
                        <tr
                          key={line.id}
                          className={mismatch ? "row-qty-mismatch" : undefined}
                          title={
                            mismatch
                              ? "Số lượng trên chứng từ khác số lượng thực nhập"
                              : undefined
                          }
                        >
                          <td className="muted">{index + 1}</td>
                          <td>{line.product_name}</td>
                          <td className="muted">SP-{line.product_id}</td>
                          <td>{line.product_unit}</td>
                          <td className="align-right">{line.quantity_per_doc}</td>
                          <td className="align-right">{line.quantity_received}</td>
                          <td className="align-right muted">{formatMoney(Number(line.unit_price))}</td>
                          <td className="align-right">{formatMoney(Number(line.subtotal))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="out-detail-total-row">
                      <td colSpan={7} className="align-right">
                        <strong>Tổng cộng</strong>
                      </td>
                      <td className="align-right">
                        <strong>{formatMoney(totalNum)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <p className="amount-words inbound-detail-words">
              <span className="muted">Bằng chữ: </span>
              {detail.total_amount_in_words}
            </p>

            <section className="card out-create-section out-detail-section">
              <div className="section-head">
                <h2 className="out-create-section-title">Thông tin chung</h2>
              </div>
              <div className="out-detail-info-grid">
                <div className="out-detail-kv">
                  <span className="muted">Nguồn nhận</span>
                  <span>{r.supplier_name}</span>
                </div>
                <div className="out-detail-kv">
                  <span className="muted">Mã phiếu</span>
                  <span>{r.receipt_code}</span>
                </div>
                <div className="out-detail-kv">
                  <span className="muted">Kho nhập</span>
                  <span>{r.warehouse_name}</span>
                </div>
                <div className="out-detail-kv">
                  <span className="muted">Ngày chứng từ</span>
                  <span>{formatDateOnly(r.document_date)}</span>
                </div>
                <div className="out-detail-kv">
                  <span className="muted">Lưu hệ thống</span>
                  <span>{formatDateTime(r.created_at)}</span>
                </div>
                <div className="out-detail-kv">
                  <span className="muted">Tình trạng</span>
                  <span>
                    <span className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</span>
                  </span>
                </div>
              </div>
            </section>

            {(r.org_unit ||
              r.department ||
              r.debit_account ||
              r.credit_account ||
              r.deliverer_name ||
              r.attached_original_count > 0) && (
              <section className="card out-create-section out-detail-section">
                <div className="section-head">
                  <h2 className="out-create-section-title">Thông tin bổ sung (01-VT)</h2>
                </div>
                <div className="out-detail-info-grid">
                  {r.org_unit && (
                    <div className="out-detail-kv">
                      <span className="muted">Đơn vị</span>
                      <span>{r.org_unit}</span>
                    </div>
                  )}
                  {r.department && (
                    <div className="out-detail-kv">
                      <span className="muted">Bộ phận</span>
                      <span>{r.department}</span>
                    </div>
                  )}
                  {r.debit_account && (
                    <div className="out-detail-kv">
                      <span className="muted">TK Nợ</span>
                      <span>{r.debit_account}</span>
                    </div>
                  )}
                  {r.credit_account && (
                    <div className="out-detail-kv">
                      <span className="muted">TK Có</span>
                      <span>{r.credit_account}</span>
                    </div>
                  )}
                  {r.deliverer_name && (
                    <div className="out-detail-kv">
                      <span className="muted">Người giao</span>
                      <span>{r.deliverer_name}</span>
                    </div>
                  )}
                  <div className="out-detail-kv">
                    <span className="muted">Số CT gốc kèm theo</span>
                    <span>{r.attached_original_count}</span>
                  </div>
                </div>
              </section>
            )}

            {hasSourceDocReference(r) && (
              <section className="card out-create-section out-detail-section">
                <div className="section-head">
                  <h2 className="out-create-section-title">Theo chứng từ gốc</h2>
                </div>
                <p className="out-detail-contract muted">{formatSourceDocOneVtLine(r)}</p>
              </section>
            )}

            {r.source_doc_note && (
              <section className="card out-create-section out-detail-section">
                <div className="section-head">
                  <h2 className="out-create-section-title">Diễn giải</h2>
                </div>
                <p className="out-detail-contract muted">{r.source_doc_note}</p>
              </section>
            )}

            {detail.attachments.length > 0 && (
              <section className="card out-create-section out-detail-section">
                <div className="section-head">
                  <h2 className="out-create-section-title">Đính kèm</h2>
                </div>
                <ul className="attach-links inbound-detail-attach">
                  {detail.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                        {a.label?.trim() || "Tệp"}
                      </a>
                      <span className="muted attach-url-hint">{a.file_url}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card out-create-section out-detail-section">
              <div className="section-head">
                <h2 className="out-create-section-title">Tình trạng xử lý</h2>
              </div>
              <ul className="out-detail-timeline">
                <li className="muted">
                  <strong>Tạo / cập nhật</strong> — {formatDateTime(r.created_at)}
                </li>
                <li className="muted">
                  <strong>Xác nhận nhập kho</strong>{" "}
                  {r.status === "posted" ? "— Đã hoàn tất" : "— Chưa xác nhận (nháp)"}
                </li>
              </ul>
            </section>

            <div className="out-detail-footer-actions">
              <button type="button" className="btn-primary out-detail-btn-wide" onClick={onClose}>
                Đóng
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
