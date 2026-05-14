import { useMemo, useState, type ReactElement } from "react";
import { ExcelImportModal, type ExcelImportOrderLinePayload } from "../common/ExcelImportModal";
import { ProductPickerModal } from "../common/ProductPickerModal";
import { ImageFilePickerField } from "../common/ImageFilePickerField";
import { createOutboundOrder } from "../../services/outboundOrderApi";
import { getHttpErrorMessage } from "../../utils/errors";
import { parseOrderLinesFromCsvFiles } from "../../utils/csvImportLines";
import {
  OUTBOUND_NOTE_MAX,
  OUTBOUND_PHONE_MAX,
  OUTBOUND_LINE_CODE_MAX,
  OUTBOUND_LINE_NAME_MAX,
  OUTBOUND_LINE_UNIT_MAX,
  parseOutboundDiscountPct,
  parseOutboundPositiveDecimal,
  validateOutboundImageFiles,
} from "../../utils/outboundReceiptFormValidation";
import {
  validateOutboundOrderCreateForm,
  OUTBOUND_ORDER_CODE_MAX,
  OUTBOUND_ORDER_DEST_CODE_MAX,
  OUTBOUND_ORDER_DEST_DEPT_MAX,
  OUTBOUND_ORDER_WAREHOUSE_MAX,
  type OutboundOrderFieldErrors,
} from "../../utils/outboundOrderFormValidation";
import type { OutboundLineInput } from "../../utils/outboundReceiptFormValidation";

export type OutboundOrderLineRow = OutboundLineInput;

type Props = {
  onBack: () => void;
  userDisplayName?: string;
};

function newLine(): OutboundOrderLineRow {
  return {
    key: crypto.randomUUID(),
    name: "",
    code: "",
    unit: "Cái",
    unitPrice: "",
    quantity: "1",
    discountPct: "0",
  };
}

function lineSubtotal(row: OutboundOrderLineRow): number {
  const price = parseOutboundPositiveDecimal(row.unitPrice) ?? 0;
  const qty = parseOutboundPositiveDecimal(row.quantity) ?? 0;
  const disc = parseOutboundDiscountPct(row.discountPct);
  if (price <= 0 || qty <= 0 || disc === null) return 0;
  const factor = Math.max(0, 1 - disc / 100);
  return Math.round(price * qty * factor);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function todayISODate(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Tạo mới lệnh xuất kho — lưu qua API `/api/outbound-orders`. */
export function OutboundOrderCreateScreen({ onBack, userDisplayName = "Người dùng" }: Props): ReactElement {
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<OutboundOrderLineRow[]>(() => [newLine()]);
  const [destDept, setDestDept] = useState("");
  const [destCode, setDestCode] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [needByDate, setNeedByDate] = useState(todayISODate);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [approvalImageFiles, setApprovalImageFiles] = useState<File[]>([]);
  const [evidenceImageFiles, setEvidenceImageFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<OutboundOrderFieldErrors>({});

  const grandTotal = useMemo(
    () => lines.reduce((s, row) => s + lineSubtotal(row), 0),
    [lines]
  );

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

  const updateLine = (key: string, patch: Partial<OutboundOrderLineRow>): void => {
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

  const applyExcelLines = (rows: ExcelImportOrderLinePayload[]): void => {
    setLines((prev) => [...prev, ...rows.map((r) => ({ ...r, key: crypto.randomUUID() }))]);
    setFieldErrors((p) => {
      const n = { ...p };
      delete n.lines;
      return n;
    });
  };

  const setApprovalImages = (files: File[]): void => {
    setApprovalImageFiles(files);
    const err = validateOutboundImageFiles(files);
    setFieldErrors((prev) => {
      const n = { ...prev };
      if (err) n.approval_files = err;
      else delete n.approval_files;
      return n;
    });
  };

  const setEvidenceImages = (files: File[]): void => {
    setEvidenceImageFiles(files);
    const err = validateOutboundImageFiles(files);
    setFieldErrors((prev) => {
      const n = { ...prev };
      if (err) n.evidence_files = err;
      else delete n.evidence_files;
      return n;
    });
  };

  return (
    <div className="app-page outbound-page out-create-page feature-doc-page">
      <ExcelImportModal
        open={excelImportOpen}
        onClose={() => setExcelImportOpen(false)}
        onApplyLines={applyExcelLines}
        parseCsvFilesToOrderLines={parseOrderLinesFromCsvFiles}
      />
      <ProductPickerModal
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        onApply={applyExcelLines}
      />
      <main className="outbound-main out-create-main">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBack}>
            ← Danh sách lệnh xuất kho
          </button>
        </div>
        {submitError && <div className="banner banner-error">{submitError}</div>}
        {fieldErrorBannerText ? (
          <div className="banner banner-error subtle" role="alert">
            {fieldErrorBannerText}
          </div>
        ) : null}
        <p className="out-create-crumb muted">
          Xuất - nhập với Nội bộ <span className="out-create-crumb-sep">›</span> Tạo mới lệnh xuất kho
        </p>
        <h1 className="out-create-doc-title">Lệnh xuất kho</h1>

        <div className="out-create-toolbar">
          <button type="button" className="out-create-btn-secondary" onClick={() => setProductPickerOpen(true)}>
            + Thêm hàng từ hệ thống
          </button>
          <button
            type="button"
            className="out-create-btn-secondary"
            onClick={() => setExcelImportOpen(true)}
          >
            + Thêm hàng từ file ngoài
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
                  <th className="align-right">Đơn giá</th>
                  <th className="align-right">Số lượng</th>
                  <th className="align-right">Chiết khấu (%)</th>
                  <th className="align-right">Thành tiền</th>
                  <th className="narrow" />
                </tr>
              </thead>
              <tbody>
                {lines.map((row, index) => (
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
                        {fieldErrors[row.key] ? <p className="inline-error">{fieldErrors[row.key]}</p> : null}
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
                        value={row.unitPrice}
                        onChange={(e) => updateLine(row.key, { unitPrice: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="out-create-cell out-create-cell-num"
                        inputMode="decimal"
                        value={row.quantity}
                        onChange={(e) => updateLine(row.key, { quantity: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="out-create-cell out-create-cell-num"
                        inputMode="decimal"
                        value={row.discountPct}
                        onChange={(e) => updateLine(row.key, { discountPct: e.target.value })}
                      />
                    </td>
                    <td className="align-right muted">{formatMoney(lineSubtotal(row))}</td>
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
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className="align-right">
                    <strong>Tổng</strong>
                  </td>
                  <td className="align-right">
                    <strong>{formatMoney(grandTotal)}</strong>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="out-create-add-row">
            <button type="button" className="btn-secondary" onClick={addLine}>
              + Thêm dòng
            </button>
            {fieldErrors.lines ? <p className="inline-error">{fieldErrors.lines}</p> : null}
          </div>
        </section>

        <section className="card out-create-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Thông tin chung</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Bộ phận nhận *</span>
              <input
                value={destDept}
                maxLength={OUTBOUND_ORDER_DEST_DEPT_MAX}
                aria-invalid={Boolean(fieldErrors.dest_dept)}
                onChange={(e) => {
                  setDestDept(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.dest_dept;
                    return n;
                  });
                }}
                placeholder="VD: Chi nhánh Hà Nội"
              />
              {fieldErrors.dest_dept ? <p className="inline-error">{fieldErrors.dest_dept}</p> : null}
            </label>
            <label className="field">
              <span>Mã bộ phận / đích</span>
              <input
                value={destCode}
                maxLength={OUTBOUND_ORDER_DEST_CODE_MAX}
                aria-invalid={Boolean(fieldErrors.dest_code)}
                onChange={(e) => {
                  setDestCode(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.dest_code;
                    return n;
                  });
                }}
                placeholder="VD: BP-HN-01"
              />
              {fieldErrors.dest_code ? <p className="inline-error">{fieldErrors.dest_code}</p> : null}
            </label>
            <label className="field">
              <span>Kho xuất *</span>
              <input
                value={warehouse}
                maxLength={OUTBOUND_ORDER_WAREHOUSE_MAX}
                aria-invalid={Boolean(fieldErrors.warehouse)}
                onChange={(e) => {
                  setWarehouse(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.warehouse;
                    return n;
                  });
                }}
                placeholder="VD: Kho tổng"
              />
              {fieldErrors.warehouse ? <p className="inline-error">{fieldErrors.warehouse}</p> : null}
            </label>
            <label className="field">
              <span>Ngày yêu cầu xuất</span>
              <input
                type="date"
                value={needByDate}
                aria-invalid={Boolean(fieldErrors.need_by_date)}
                onChange={(e) => {
                  setNeedByDate(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.need_by_date;
                    return n;
                  });
                }}
              />
              {fieldErrors.need_by_date ? <p className="inline-error">{fieldErrors.need_by_date}</p> : null}
            </label>
            <label className="field">
              <span>Số điện thoại liên hệ</span>
              <input
                value={phone}
                maxLength={OUTBOUND_PHONE_MAX}
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={Boolean(fieldErrors.phone)}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.phone;
                    return n;
                  });
                }}
              />
              {fieldErrors.phone ? <p className="inline-error">{fieldErrors.phone}</p> : null}
            </label>
            <label className="field span-2">
              <span>Địa chỉ giao / nhận</span>
              <input
                value={address}
                maxLength={8000}
                aria-invalid={Boolean(fieldErrors.address)}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.address;
                    return n;
                  });
                }}
              />
              {fieldErrors.address ? <p className="inline-error">{fieldErrors.address}</p> : null}
            </label>
            <label className="field span-2">
              <span>Lý do xuất *</span>
              <input
                value={reason}
                maxLength={OUTBOUND_NOTE_MAX}
                aria-invalid={Boolean(fieldErrors.reason)}
                onChange={(e) => {
                  setReason(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.reason;
                    return n;
                  });
                }}
              />
              {fieldErrors.reason ? <p className="inline-error">{fieldErrors.reason}</p> : null}
            </label>
            <label className="field">
              <span>Mã lệnh *</span>
              <input
                value={orderCode}
                maxLength={OUTBOUND_ORDER_CODE_MAX}
                aria-invalid={Boolean(fieldErrors.order_code)}
                onChange={(e) => {
                  setOrderCode(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.order_code;
                    return n;
                  });
                }}
                placeholder="VD: LXK-2026-001"
              />
              {fieldErrors.order_code ? <p className="inline-error">{fieldErrors.order_code}</p> : null}
            </label>
          </div>
        </section>

        <section className="card out-create-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Ghi chú phê duyệt</h2>
          </div>
          <label className="field">
            <span>Nội dung</span>
            <textarea
              className="textarea-field"
              rows={2}
              maxLength={OUTBOUND_NOTE_MAX}
              value={approvalNote}
              aria-invalid={Boolean(fieldErrors.approval_note)}
              onChange={(e) => {
                setApprovalNote(e.target.value);
                setFieldErrors((p) => {
                  const n = { ...p };
                  delete n.approval_note;
                  return n;
                });
              }}
            />
            {fieldErrors.approval_note ? <p className="inline-error">{fieldErrors.approval_note}</p> : null}
          </label>
          <ImageFilePickerField
            ariaLabel="Hình ảnh kèm ghi chú phê duyệt"
            files={approvalImageFiles}
            onFilesChange={setApprovalImages}
            error={fieldErrors.approval_files}
          />
        </section>

        <section className="card out-create-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Sở cứ / minh chứng</h2>
          </div>
          <label className="field">
            <span>Nội dung</span>
            <textarea
              className="textarea-field"
              rows={2}
              maxLength={OUTBOUND_NOTE_MAX}
              value={evidenceNote}
              aria-invalid={Boolean(fieldErrors.evidence_note)}
              onChange={(e) => {
                setEvidenceNote(e.target.value);
                setFieldErrors((p) => {
                  const n = { ...p };
                  delete n.evidence_note;
                  return n;
                });
              }}
            />
            {fieldErrors.evidence_note ? <p className="inline-error">{fieldErrors.evidence_note}</p> : null}
          </label>
          <ImageFilePickerField
            ariaLabel="Hình ảnh kèm sở cứ minh chứng"
            files={evidenceImageFiles}
            onFilesChange={setEvidenceImages}
            error={fieldErrors.evidence_files}
          />
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
                const checked = validateOutboundOrderCreateForm({
                  orderCode,
                  destDept,
                  destCode,
                  warehouse,
                  needByDate,
                  phone,
                  address,
                  reason,
                  approvalNote,
                  evidenceNote,
                  approvalImageFiles,
                  evidenceImageFiles,
                  lines,
                });
                if (!checked.ok) {
                  setFieldErrors(checked.errors);
                  return;
                }
                setFieldErrors({});
                setSaving(true);
                try {
                  await createOutboundOrder({
                    orderCode: orderCode.trim(),
                    destDept: destDept.trim(),
                    destCode: destCode.trim(),
                    warehouse: warehouse.trim(),
                    needByDate: needByDate.trim() || null,
                    phone: phone.trim(),
                    address: address.trim(),
                    reason: reason.trim(),
                    approvalNote: checked.approvalPayload,
                    listAt: new Date().toISOString(),
                    createdBy: userDisplayName.trim() || "system",
                    lines: checked.apiLines,
                  });
                  onBack();
                } catch (err) {
                  setSubmitError(getHttpErrorMessage(err, "Không lưu được lệnh xuất."));
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
