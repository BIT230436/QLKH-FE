import { useMemo, useState, type ReactElement } from "react";
import { createStockAudit } from "../../services/stockAuditApi";
import { getHttpErrorMessage } from "../../utils/errors";
import type { ExcelImportOrderLinePayload } from "../../utils/csvImportLines";
import { localDateInputToIso } from "../../utils/receiptFormHelpers";
import {
  OUTBOUND_LINE_CODE_MAX,
  OUTBOUND_LINE_NAME_MAX,
  OUTBOUND_LINE_UNIT_MAX,
} from "../../utils/outboundReceiptFormValidation";
import {
  parseStockAuditQty,
  validateStockAuditCreateForm,
  STOCK_AUDIT_DOC_CODE_MAX,
  STOCK_AUDIT_NOTE_MAX,
  STOCK_AUDIT_LINE_NOTE_MAX,
  STOCK_AUDIT_WAREHOUSE_CODE_MAX,
  STOCK_AUDIT_WAREHOUSE_NAME_MAX,
  type StockAuditFieldErrors,
  type StockAuditLineInput,
} from "../../utils/stockAuditFormValidation";
import { ProductPickerModal } from "../common/ProductPickerModal";

export type StockAuditLineRow = StockAuditLineInput;

type Props = {
  onBack: () => void;
  userDisplayName?: string;
};

function newLine(): StockAuditLineRow {
  return {
    key: crypto.randomUUID(),
    name: "",
    code: "",
    unit: "Cái",
    bookQty: "",
    actualQty: "",
    note: "",
  };
}

/** Tạo mới biên bản kiểm kê — lưu qua API `/api/stock-audits`. */
export function StockAuditCreateScreen({ onBack, userDisplayName = "Người dùng" }: Props): ReactElement {
  const [lines, setLines] = useState<StockAuditLineRow[]>(() => [newLine()]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<StockAuditFieldErrors>({});
  const [docCode, setDocCode] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [whCode, setWhCode] = useState("");
  const [auditDate, setAuditDate] = useState(() => {
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });
  const [committee, setCommittee] = useState("");
  const [headerNote, setHeaderNote] = useState("");

  const fieldErrorBannerText = useMemo(() => {
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const [k, msg] of Object.entries(fieldErrors)) {
      if (!msg || seen.has(msg)) continue;
      if (lines.some((ln) => ln.key === k)) continue;
      seen.add(msg);
      parts.push(msg);
    }
    return parts.join(" · ");
  }, [fieldErrors, lines]);

  const updateLine = (key: string, patch: Partial<StockAuditLineRow>): void => {
    setLines((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setFieldErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      delete n.lines;
      return n;
    });
  };

  const addLine = (): void => {
    setLines((prev) => [...prev, newLine()]);
    setFieldErrors((p) => {
      const n = { ...p };
      delete n.lines;
      return n;
    });
  };

  const removeLine = (key: string): void => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[key];
      delete n.lines;
      return n;
    });
  };

  const applyCatalogToAuditLines = (rows: ExcelImportOrderLinePayload[]): void => {
    setLines((prev) => [
      ...prev,
      ...rows.map((r) => ({
        key: crypto.randomUUID(),
        name: r.name,
        code: r.code,
        unit: r.unit || "Cái",
        bookQty: "",
        actualQty: r.quantity.trim() || "1",
        note: "",
      })),
    ]);
    setFieldErrors((p) => {
      const n = { ...p };
      delete n.lines;
      return n;
    });
  };

  const lineDiff = (row: StockAuditLineRow): number | null => {
    const b = parseStockAuditQty(row.bookQty);
    const a = parseStockAuditQty(row.actualQty);
    if (b === null || a === null) return null;
    return a - b;
  };

  const totalDiff = useMemo(
    () =>
      lines.reduce((s, row) => {
        const d = lineDiff(row);
        return d === null ? s : s + Math.abs(d);
      }, 0),
    [lines]
  );

  return (
    <div className="app-page outbound-page out-create-page feature-doc-page">
      <ProductPickerModal
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        onApply={applyCatalogToAuditLines}
      />
      <main className="outbound-main out-create-main">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBack}>
            ← Danh sách biên bản kiểm kê
          </button>
        </div>
        {submitError && <div className="banner banner-error">{submitError}</div>}
        {fieldErrorBannerText ? (
          <div className="banner banner-error subtle" role="alert">
            {fieldErrorBannerText}
          </div>
        ) : null}
        <p className="out-create-crumb muted">
          Quản lý kiểm kê <span className="out-create-crumb-sep">&gt;</span> Tạo mới biên bản kiểm kê
        </p>
        <h1 className="out-create-doc-title">Biên bản kiểm kê</h1>

        <section className="card out-create-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Thông tin chung</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Mã biên bản</span>
              <input
                value={docCode}
                maxLength={STOCK_AUDIT_DOC_CODE_MAX}
                aria-invalid={Boolean(fieldErrors.doc_code)}
                onChange={(e) => {
                  setDocCode(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.doc_code;
                    return n;
                  });
                }}
                placeholder="Để trống — hệ thống cấp mã khi lưu"
              />
              {fieldErrors.doc_code ? <p className="inline-error">{fieldErrors.doc_code}</p> : null}
            </label>
            <label className="field">
              <span>Kho kiểm *</span>
              <input
                value={warehouse}
                maxLength={STOCK_AUDIT_WAREHOUSE_NAME_MAX}
                aria-invalid={Boolean(fieldErrors.warehouse_name)}
                onChange={(e) => {
                  setWarehouse(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.warehouse_name;
                    return n;
                  });
                }}
                placeholder="VD: Kho tổng"
              />
              {fieldErrors.warehouse_name ? <p className="inline-error">{fieldErrors.warehouse_name}</p> : null}
            </label>
            <label className="field">
              <span>Mã kho</span>
              <input
                value={whCode}
                maxLength={STOCK_AUDIT_WAREHOUSE_CODE_MAX}
                aria-invalid={Boolean(fieldErrors.warehouse_code)}
                onChange={(e) => {
                  setWhCode(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.warehouse_code;
                    return n;
                  });
                }}
                placeholder="VD: KT_0001"
              />
              {fieldErrors.warehouse_code ? <p className="inline-error">{fieldErrors.warehouse_code}</p> : null}
            </label>
            <label className="field">
              <span>Ngày kiểm *</span>
              <input
                type="date"
                value={auditDate}
                aria-invalid={Boolean(fieldErrors.audit_date)}
                onChange={(e) => {
                  setAuditDate(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.audit_date;
                    return n;
                  });
                }}
              />
              {fieldErrors.audit_date ? <p className="inline-error">{fieldErrors.audit_date}</p> : null}
            </label>
            <label className="field span-2">
              <span>Hội đồng kiểm kê</span>
              <textarea
                className="textarea-field"
                rows={2}
                maxLength={STOCK_AUDIT_NOTE_MAX}
                value={committee}
                aria-invalid={Boolean(fieldErrors.committee_note)}
                onChange={(e) => {
                  setCommittee(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.committee_note;
                    return n;
                  });
                }}
                placeholder="Danh sách thành viên, vai trò…"
              />
              {fieldErrors.committee_note ? <p className="inline-error">{fieldErrors.committee_note}</p> : null}
            </label>
            <label className="field span-2">
              <span>Diễn giải / mục đích</span>
              <textarea
                className="textarea-field"
                rows={2}
                maxLength={STOCK_AUDIT_NOTE_MAX}
                value={headerNote}
                aria-invalid={Boolean(fieldErrors.header_note)}
                onChange={(e) => {
                  setHeaderNote(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.header_note;
                    return n;
                  });
                }}
              />
              {fieldErrors.header_note ? <p className="inline-error">{fieldErrors.header_note}</p> : null}
            </label>
          </div>
        </section>

        <div className="out-create-toolbar">
          <button type="button" className="out-create-btn-secondary" onClick={addLine}>
            + Thêm dòng hàng
          </button>
          <button type="button" className="out-create-btn-secondary" onClick={() => setProductPickerOpen(true)}>
            + Chọn từ danh mục
          </button>
        </div>

        <section className="card out-create-table-card">
          <div className="table-scroll sticky-head-wrap">
            <table className="lines-table condensed out-create-lines sticky-head">
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
                  <th className="narrow" />
                </tr>
              </thead>
              <tbody>
                {lines.map((row, index) => {
                  const diff = lineDiff(row);
                  return (
                    <tr key={row.key} className={fieldErrors[row.key] ? "has-error" : undefined}>
                      <td className="muted">{index + 1}</td>
                      <td>
                        <div className="product-cell-stack">
                          <input
                            className="out-create-cell"
                            maxLength={OUTBOUND_LINE_NAME_MAX}
                            aria-invalid={Boolean(fieldErrors[row.key])}
                            value={row.name}
                            onChange={(e) => updateLine(row.key, { name: e.target.value })}
                          />
                          {fieldErrors[row.key] ? (
                            <p className="inline-error">{fieldErrors[row.key]}</p>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <input
                          className="out-create-cell"
                          maxLength={OUTBOUND_LINE_CODE_MAX}
                          value={row.code}
                          onChange={(e) => updateLine(row.key, { code: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="out-create-cell out-create-cell-narrow"
                          maxLength={OUTBOUND_LINE_UNIT_MAX}
                          value={row.unit}
                          onChange={(e) => updateLine(row.key, { unit: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="out-create-cell out-create-cell-num"
                          inputMode="decimal"
                          value={row.bookQty}
                          onChange={(e) => updateLine(row.key, { bookQty: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="out-create-cell out-create-cell-num"
                          inputMode="decimal"
                          value={row.actualQty}
                          onChange={(e) => updateLine(row.key, { actualQty: e.target.value })}
                        />
                      </td>
                      <td
                        className={[
                          "align-right",
                          "stock-audit-diff-cell",
                          diff === null ? "muted" : "",
                          diff !== null && diff > 0 ? "stock-audit-diff-pos" : "",
                          diff !== null && diff < 0 ? "stock-audit-diff-neg" : "",
                          diff === 0 ? "stock-audit-diff-zero" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {diff === null ? "—" : diff === 0 ? "0" : diff > 0 ? `+${diff}` : `${diff}`}
                      </td>
                      <td>
                        <input
                          className="out-create-cell"
                          maxLength={STOCK_AUDIT_LINE_NOTE_MAX}
                          value={row.note}
                          onChange={(e) => updateLine(row.key, { note: e.target.value })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost-danger"
                          disabled={lines.length <= 1}
                          onClick={() => removeLine(row.key)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="out-create-add-row">
            {fieldErrors.lines ? <p className="inline-error">{fieldErrors.lines}</p> : null}
          </div>
          <p className="muted stock-audit-create-foot">
            Tổng độ lệch tuyệt đối (ước lượng): <strong>{totalDiff}</strong> đơn vị — dùng cho đối soát nhanh (mẫu).
          </p>
        </section>

        <div className="out-create-actions">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Hủy
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={() => {
              void (async () => {
                setSubmitError(null);
                const prepared = userDisplayName.trim() || "system";
                const checked = validateStockAuditCreateForm({
                  docCode,
                  warehouseName: warehouse,
                  warehouseCode: whCode,
                  auditDate,
                  committeeNote: committee,
                  headerNote,
                  preparedBy: prepared,
                  lines,
                });
                if (!checked.ok) {
                  setFieldErrors(checked.errors);
                  return;
                }
                setFieldErrors({});
                const doc = docCode.trim() || `KK-${Date.now()}`;
                const auditedIso = localDateInputToIso(auditDate) ?? `${auditDate}T12:00:00.000Z`;
                setSaving(true);
                try {
                  await createStockAudit({
                    docCode: doc,
                    warehouseName: warehouse.trim(),
                    auditedAt: auditedIso,
                    preparedBy: prepared.slice(0, 255),
                    committeeNote: committee.trim(),
                    headerNote: headerNote.trim(),
                    lines: checked.apiLines,
                  });
                  onBack();
                } catch (err) {
                  setSubmitError(getHttpErrorMessage(err, "Không lưu được biên bản kiểm kê."));
                } finally {
                  setSaving(false);
                }
              })();
            }}
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </main>
    </div>
  );
}
