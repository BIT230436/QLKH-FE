import { useEffect, useId, useState, type ReactElement } from "react";
import type { ReceiptDetail } from "../../services/types";
import { confirmReceipt, fetchReceiptDetail } from "../../services/receiptApi";
import { getHttpErrorMessage } from "../../utils/errors";
import { IconDialogConfirm } from "../icons/ActionIcons";
import { openReceiptPrintWindow } from "../../utils/receiptPrint";
import { formatSourceDocOneVtLine, hasSourceDocReference } from "../../utils/receiptSourceDoc";

export type ReceiptDetailModalState =
  | { status: "closed" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ReceiptDetail };

type Props = {
  state: ReceiptDetailModalState;
  onClose: () => void;
  /** Sau khi xác nhận từ modal — cập nhật chi tiết + có thể kích hoạt làm mới danh sách */
  onAfterConfirm?: (detail: ReceiptDetail) => void;
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

/** Modal xem chi tiết phiếu nhập (mẫu 01-VT mở rộng) */
export function ReceiptDetailModal({ state, onClose, onAfterConfirm }: Props): ReactElement | null {
  const titleId = useId();
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "closed") return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.status, onClose]);

  const detailKey =
    state.status === "ready"
      ? `${state.data.receipt.id}-${state.data.receipt.status}`
      : state.status;

  useEffect(() => {
    setActionError(null);
  }, [detailKey]);

  if (state.status === "closed") return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel card modal-wide feature-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId} className="card-title">
            Chi tiết phiếu nhập
          </h2>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </div>

        {state.status === "loading" && <p className="muted">Đang tải…</p>}

        {state.status === "error" && (
          <div className="banner banner-error" role="alert">
            {state.message}
          </div>
        )}

        {state.status === "ready" && (
          <>
            {actionError && (
              <div className="banner banner-error subtle" role="alert">
                {actionError}
              </div>
            )}

            <div className="modal-toolbar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => openReceiptPrintWindow(state.data)}
              >
                In phiếu
              </button>
              {state.data.receipt.status === "draft" && (
                <button
                  type="button"
                  className="btn-primary btn-with-ico"
                  disabled={confirmBusy}
                  onClick={() => {
                    void (async () => {
                      setActionError(null);
                      setConfirmBusy(true);
                      try {
                        const d = await confirmReceipt(state.data.receipt.id);
                        onAfterConfirm?.(d);
                      } catch (e) {
                        setActionError(getHttpErrorMessage(e));
                      } finally {
                        setConfirmBusy(false);
                      }
                    })();
                  }}
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

            <dl className="detail-dl">
              <div>
                <dt>Mã phiếu</dt>
                <dd>{state.data.receipt.receipt_code}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  {state.data.receipt.status === "draft" ? (
                    <span className="badge badge-warn">Nháp</span>
                  ) : (
                    <span className="badge badge-ok">Đã xác nhận</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Nhà cung cấp</dt>
                <dd>{state.data.receipt.supplier_name}</dd>
              </div>
              <div>
                <dt>Kho nhập</dt>
                <dd>{state.data.receipt.warehouse_name}</dd>
              </div>
              <div>
                <dt>Ngày chứng từ</dt>
                <dd>{formatDateOnly(state.data.receipt.document_date)}</dd>
              </div>
              <div>
                <dt>Lưu hệ thống</dt>
                <dd>
                  {new Date(state.data.receipt.created_at).toLocaleString("vi-VN", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </dd>
              </div>
              <div>
                <dt>Tổng tiền</dt>
                <dd>
                  <strong>{formatMoney(Number(state.data.receipt.total_amount))}</strong>
                </dd>
              </div>
            </dl>

            <p className="amount-words">
              <span className="muted">Bằng chữ: </span>
              {state.data.total_amount_in_words}
            </p>

            {(state.data.receipt.org_unit ||
              state.data.receipt.department ||
              state.data.receipt.debit_account ||
              state.data.receipt.credit_account ||
              state.data.receipt.deliverer_name ||
              state.data.receipt.attached_original_count > 0) && (
              <dl className="detail-dl">
                {state.data.receipt.org_unit && (
                  <div>
                    <dt>Đơn vị</dt>
                    <dd>{state.data.receipt.org_unit}</dd>
                  </div>
                )}
                {state.data.receipt.department && (
                  <div>
                    <dt>Bộ phận</dt>
                    <dd>{state.data.receipt.department}</dd>
                  </div>
                )}
                {state.data.receipt.debit_account && (
                  <div>
                    <dt>TK Nợ</dt>
                    <dd>{state.data.receipt.debit_account}</dd>
                  </div>
                )}
                {state.data.receipt.credit_account && (
                  <div>
                    <dt>TK Có</dt>
                    <dd>{state.data.receipt.credit_account}</dd>
                  </div>
                )}
                {state.data.receipt.deliverer_name && (
                  <div>
                    <dt>Người giao</dt>
                    <dd>{state.data.receipt.deliverer_name}</dd>
                  </div>
                )}
                <div>
                  <dt>Số CT gốc kèm theo</dt>
                  <dd>{state.data.receipt.attached_original_count}</dd>
                </div>
              </dl>
            )}

            {hasSourceDocReference(state.data.receipt) && (
              <p className="detail-note">
                <span className="muted">Theo chứng từ gốc: </span>
                {formatSourceDocOneVtLine(state.data.receipt)}
              </p>
            )}

            {state.data.receipt.source_doc_note && (
              <p className="detail-note">
                <span className="muted">Diễn giải: </span>
                {state.data.receipt.source_doc_note}
              </p>
            )}

            {state.data.attachments.length > 0 && (
              <div className="detail-attachments">
                <h3 className="detail-lines-title">File đính kèm</h3>
                <ul className="attach-links">
                  {state.data.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                        {a.label?.trim() || "Tệp"}
                      </a>
                      <span className="muted attach-url-hint">{a.file_url}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h3 className="detail-lines-title">Chi tiết sản phẩm</h3>
            <div className="table-scroll">
              <table className="lines-table condensed">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đơn vị</th>
                    <th className="align-right">SL theo CT</th>
                    <th className="align-right">SL thực nhập</th>
                    <th className="align-right">Đơn giá</th>
                    <th className="align-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.items.map((line) => {
                    const qd = Number(line.quantity_per_doc);
                    const qr = Number(line.quantity_received);
                    const mismatch =
                      Number.isFinite(qd) && Number.isFinite(qr) && qd !== qr;
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
                        <td>{line.product_name}</td>
                        <td className="muted">{line.product_unit}</td>
                        <td className="align-right">{line.quantity_per_doc}</td>
                        <td className="align-right">{line.quantity_received}</td>
                        <td className="align-right muted">
                          {formatMoney(Number(line.unit_price))}
                        </td>
                        <td className="align-right">
                          {formatMoney(Number(line.subtotal))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export async function loadReceiptDetailForModal(
  id: number,
  setState: (s: ReceiptDetailModalState) => void
): Promise<void> {
  setState({ status: "loading" });
  try {
    const data = await fetchReceiptDetail(id);
    setState({ status: "ready", data });
  } catch (e) {
    setState({ status: "error", message: getHttpErrorMessage(e) });
  }
}
