import { type ReactElement } from "react";
import type { StockAuditDetailModel, StockAuditStatus } from "../../types/inventory";

type Props = {
  detail: StockAuditDetailModel;
  onClose: () => void;
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

/** Màn xem biên bản kiểm kê — API. */
export function StockAuditDetailScreen({ detail: d, onClose }: Props): ReactElement {
  return (
    <div className="app-page outbound-page out-detail-page outbound-order-detail-page feature-doc-page">
      <main className="outbound-main out-detail-main">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onClose}>
            ← Danh sách biên bản kiểm kê
          </button>
        </div>
        <p className="out-create-crumb muted">
          Quản lý kiểm kê <span className="out-create-crumb-sep">&gt;</span> Xem biên bản kiểm kê
        </p>
        <div className="out-detail-head-row">
          <h1 className="out-detail-doc-title">Biên bản kiểm kê</h1>
        </div>

        <section className="card out-create-section out-detail-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Thông tin chung</h2>
          </div>
          <div className="out-detail-info-grid">
            <div className="out-detail-kv">
              <span className="muted">Mã biên bản</span>
              <span>{d.docCode}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Kho kiểm</span>
              <span>{d.warehouse}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Mã kho</span>
              <span>{d.whCode}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Thời gian kiểm</span>
              <span>{formatDateTime(d.auditedAt)}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Người lập</span>
              <span>{d.preparedBy}</span>
            </div>
            <div className="out-detail-kv">
              <span className="muted">Trạng thái</span>
              <span>
                <span className={statusClass(d.status)}>{d.status}</span>
              </span>
            </div>
            <div className="out-detail-kv out-detail-kv-wide">
              <span className="muted">Hội đồng kiểm kê</span>
              <span>{d.committeeNote}</span>
            </div>
            <div className="out-detail-kv out-detail-kv-wide">
              <span className="muted">Diễn giải / mục đích</span>
              <span>{d.headerNote}</span>
            </div>
            <div className="out-detail-kv out-detail-kv-wide">
              <span className="muted">Phê duyệt</span>
              <span className="muted">{d.approvedNote}</span>
            </div>
          </div>
        </section>

        <section className="card out-create-table-card out-detail-table-card">
          <div className="table-scroll sticky-head-wrap">
            <table className="lines-table condensed outbound-table sticky-head">
              <thead>
                <tr>
                  <th className="outbound-col-stt">STT</th>
                  <th>Tên hàng hóa</th>
                  <th>Mã hàng</th>
                  <th>Đơn vị tính</th>
                  <th className="align-right">SL sổ sách</th>
                  <th className="align-right">SL thực tế</th>
                  <th className="align-right">Chênh lệch</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {d.lines.map((line, index) => {
                  const diff = line.actualQty - line.bookQty;
                  return (
                    <tr key={`${line.code}-${index}`}>
                      <td className="muted">{index + 1}</td>
                      <td>{line.name}</td>
                      <td>{line.code}</td>
                      <td>{line.unit}</td>
                      <td className="align-right">{line.bookQty}</td>
                      <td className="align-right">{line.actualQty}</td>
                      <td
                        className={[
                          "align-right",
                          "stock-audit-diff-cell",
                          diff === 0 ? "stock-audit-diff-zero" : "",
                          diff > 0 ? "stock-audit-diff-pos" : "",
                          diff < 0 ? "stock-audit-diff-neg" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {diff === 0 ? "0" : diff > 0 ? `+${diff}` : `${diff}`}
                      </td>
                      <td className="muted">{line.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
