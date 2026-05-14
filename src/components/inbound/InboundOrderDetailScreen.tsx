import { useCallback, useState, type ReactElement } from "react";
import type { InboundOrderDetailModel, InboundOrderStatus } from "../../types/inventory";
import { formatMoneyVi, moneyFromLine, pickNum } from "../../utils/lineDisplay";

type Props = {
  detail: InboundOrderDetailModel;
  onClose: () => void;
  onDelete: () => void | Promise<void>;
  onApprove?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
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

function formatDateOnly(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("vi-VN");
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

/** Màn xem lệnh nhập kho — dữ liệu từ API (`detail`). */
export function InboundOrderDetailScreen({
  detail: d,
  onClose,
  onDelete,
  onApprove,
  onReject,
}: Props): ReactElement {
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(async (key: string, fn?: () => void | Promise<void>): Promise<void> => {
    if (!fn) return;
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }, []);

  const showApproveActions = d.listStatus === "Chờ duyệt" && onApprove && onReject;

  return (
    <div className="app-page outbound-page out-detail-page outbound-order-detail-page inbound-order-detail-page feature-doc-page">
      <main className="outbound-main out-detail-main">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onClose}>
            ← Danh sách lệnh nhập kho
          </button>
        </div>
        <p className="out-create-crumb muted">
          Xuất - nhập với Nội bộ <span className="out-create-crumb-sep">&gt;</span> Xem lệnh nhập kho
        </p>
        <div className="out-detail-head-row">
          <h1 className="out-detail-doc-title">Lệnh nhập kho</h1>
          <div className="out-detail-head-actions">
            {showApproveActions && (
              <>
                <button
                  type="button"
                  className="out-detail-btn-approve"
                  disabled={busy != null}
                  onClick={() => void run("approve", onApprove)}
                >
                  {busy === "approve" ? "Đang duyệt…" : "Duyệt"}
                </button>
                <button
                  type="button"
                  className="out-detail-btn-reject"
                  disabled={busy != null}
                  onClick={() => void run("reject", onReject)}
                >
                  {busy === "reject" ? "Đang xử lý…" : "Từ chối"}
                </button>
              </>
            )}
            <button
              type="button"
              className="out-detail-btn-danger"
              disabled={busy != null}
              onClick={() => void run("delete", onDelete)}
            >
              {busy === "delete" ? "Đang xóa…" : "Xóa"}
            </button>
          </div>
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
                  <th className="align-right">Đơn giá</th>
                  <th className="align-right">Số lượng</th>
                  <th className="align-right">Chiết khấu</th>
                  <th className="align-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {d.lines.map((line, index) => (
                  <tr key={`${line.code}-${index}`}>
                    <td className="muted">{index + 1}</td>
                    <td>{line.name}</td>
                    <td>{line.code}</td>
                    <td>{line.unit}</td>
                    <td className="align-right">{moneyFromLine(line, "unitPrice", "unit_price")}</td>
                    <td className="align-right">
                      {(() => {
                        const q = pickNum((line as unknown as Record<string, unknown>).quantity);
                        return Number.isFinite(q) ? String(q) : "—";
                      })()}
                    </td>
                    <td className="align-right">
                      {(() => {
                        const r = line as unknown as Record<string, unknown>;
                        const p = pickNum(r.discountPct, r.discount_pct);
                        return Number.isFinite(p) ? `${p}%` : "—";
                      })()}
                    </td>
                    <td className="align-right">{moneyFromLine(line, "subtotal")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="out-detail-total-row">
                  <td colSpan={7} className="align-right">
                    <strong>Tổng</strong>
                  </td>
                  <td className="align-right">
                    <strong>{formatMoneyVi(d.listAmount)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="card out-create-section out-detail-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Thông tin chung</h2>
          </div>
          <div className="out-detail-info-grid">
            <div className="out-detail-kv">
              <span className="muted">Nguồn xuất</span>
              <span>{d.sourceDept}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Mã nguồn</span>
              <span>{d.sourceCode}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Số điện thoại</span>
              <span>{d.phone}</span>
            </div>
            <div className="out-detail-kv out-detail-kv-wide">
              <span className="muted">Địa chỉ</span>
              <span>{d.address}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Mã lệnh</span>
              <span>{d.orderCode}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Kho nhập</span>
              <span>{d.destWarehouse}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Mã kho</span>
              <span>{d.destWhCode}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Ngày yêu cầu nhập</span>
              <span>{formatDateOnly(d.needByDate)}</span>
            </div>
            <div className="out-detail-kv out-detail-kv-wide">
              <span className="muted">Lý do</span>
              <span>{d.reason}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Tình trạng lệnh</span>
              <span>
                <span className={statusClass(d.listStatus)}>{d.listStatus}</span>
              </span>
            </div>
          </div>
        </section>

        <section className="card out-create-section out-detail-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Ghi chú phê duyệt</h2>
          </div>
          <p className="out-detail-contract muted">{d.approvalNote}</p>
        </section>

        <section className="card out-create-section out-detail-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Sở cứ / minh chứng</h2>
          </div>
          <p className="out-detail-contract muted">{d.evidenceNote}</p>
        </section>

        <section className="card out-create-section out-detail-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Tình trạng xử lý</h2>
          </div>
          <ul className="out-detail-timeline">
            <li>
              <strong>Tạo bởi</strong> {d.createdBy}{" "}
              <span className="muted">— {formatDateTime(d.createdAt)}</span>
            </li>
            <li className="muted">
              <strong>Duyệt bởi</strong> — (chưa có dữ liệu)
            </li>
            <li className="muted">
              <strong>Từ chối bởi</strong> — (chưa có dữ liệu)
            </li>
            <li className="muted">
              <strong>Hoàn thành nhập</strong> — (chưa có dữ liệu)
            </li>
          </ul>
        </section>

        <div className="out-detail-footer-actions">
          <button type="button" className="btn-primary out-detail-btn-wide" onClick={onClose}>
            Đóng
          </button>
        </div>
      </main>
    </div>
  );
}
