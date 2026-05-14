import { useMemo, useState, type ReactElement } from "react";
import { ExcelImportModal, type ExcelImportOrderLinePayload } from "../common/ExcelImportModal";
import { ProductPickerModal } from "../common/ProductPickerModal";
import { ImageFilePickerField } from "../common/ImageFilePickerField";
import { createOutboundReceipt } from "../../services/outboundReceiptApi";
import { getHttpErrorMessage } from "../../utils/errors";
import { parseOrderLinesFromCsvFiles } from "../../utils/csvImportLines";
import {
  OUTBOUND_COUNTERPARTY_MAX,
  OUTBOUND_LINE_CODE_MAX,
  OUTBOUND_LINE_NAME_MAX,
  OUTBOUND_LINE_UNIT_MAX,
  OUTBOUND_NOTE_MAX,
  OUTBOUND_PHONE_MAX,
  OUTBOUND_RECEIPT_CODE_MAX,
  OUTBOUND_SOURCE_CODE_MAX,
  parseOutboundDiscountPct,
  parseOutboundPositiveDecimal,
  validateOutboundImageFiles,
  validateOutboundReceiptCreateForm,
  type OutboundValidateErrors,
} from "../../utils/outboundReceiptFormValidation";

export type OutboundLineRow = {
  key: string;
  name: string;
  code: string;
  unit: string;
  unitPrice: string;
  quantity: string;
  discountPct: string;
};

type Props = {
  onBack: () => void;
  backLabel?: string;
  crumbSection?: string;
  crumbAction?: string;
  receiptScope: "ncc" | "internal" | "nvbh";
  userDisplayName?: string;
};

function newLine(): OutboundLineRow {
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

function lineSubtotal(row: OutboundLineRow): number {
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

/** Tạo mới phiếu xuất kho — lưu qua API `/api/outbound-receipts`. */
export function OutboundReceiptCreateScreen({
  onBack,
  backLabel = "← Danh sách phiếu xuất",
  crumbSection = "Xuất - nhập với NCC",
  crumbAction = "Tạo mới phiếu xuất kho",
  receiptScope,
  userDisplayName = "Người dùng",
}: Props): ReactElement {
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<OutboundLineRow[]>(() => [newLine()]);
  const [sourceName, setSourceName] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [receiptCode, setReceiptCode] = useState("");
  const [contractNote, setContractNote] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [contractImageFiles, setContractImageFiles] = useState<File[]>([]);
  const [evidenceImageFiles, setEvidenceImageFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<OutboundValidateErrors>({});

  const grandTotal = useMemo(
    () => lines.reduce((s, row) => s + lineSubtotal(row), 0),
    [lines]
  );

  const updateLine = (key: string, patch: Partial<OutboundLineRow>): void => {
    setLines((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
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
    setFieldErrors((e) => {
      const next = { ...e };
      delete next.lines;
      return next;
    });
  };

  const fieldErrorBannerText = useMemo(() => {
    const lineKeys = new Set(lines.map((l) => l.key));
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const [k, msg] of Object.entries(fieldErrors)) {
      if (!msg || seen.has(msg)) continue;
      if (lineKeys.has(k)) continue;
      seen.add(msg);
      parts.push(msg);
    }
    return parts.join(" · ");
  }, [fieldErrors, lines]);

  const setContractImages = (files: File[]): void => {
    setContractImageFiles(files);
    const err = validateOutboundImageFiles(files);
    setFieldErrors((prev) => {
      const n = { ...prev };
      if (err) n.contract_files = err;
      else delete n.contract_files;
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

  const sourceNameFieldLabel = receiptScope === "ncc" ? "Nguồn nhận *" : "Người nhận *";

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
            {backLabel}
          </button>
        </div>
        {submitError && <div className="banner banner-error">{submitError}</div>}
        {fieldErrorBannerText ? (
          <div className="banner banner-error subtle" role="alert">
            {fieldErrorBannerText}
          </div>
        ) : null}
        <p className="out-create-crumb muted">
          {crumbSection} <span className="out-create-crumb-sep">&gt;</span> {crumbAction}
        </p>
        <h1 className="out-create-doc-title">Phiếu xuất kho</h1>
        <div className="out-create-toolbar">
          <button type="button" className="out-create-btn-secondary" onClick={() => setProductPickerOpen(true)}>
            + Thêm hàng từ hệ thống
          </button>
          <button type="button" className="out-create-btn-secondary" onClick={() => setExcelImportOpen(true)}>
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
                          onChange={(e) => {
                            updateLine(row.key, { name: e.target.value });
                            setFieldErrors((prev) => {
                              const n = { ...prev };
                              delete n[row.key];
                              delete n.lines;
                              return n;
                            });
                          }}
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
                        onChange={(e) => {
                          updateLine(row.key, { code: e.target.value });
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n[row.key];
                            return n;
                          });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="out-create-cell out-create-cell-narrow"
                        maxLength={OUTBOUND_LINE_UNIT_MAX}
                        value={row.unit}
                        onChange={(e) => {
                          updateLine(row.key, { unit: e.target.value });
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n[row.key];
                            return n;
                          });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="out-create-cell out-create-cell-num"
                        inputMode="decimal"
                        value={row.unitPrice}
                        onChange={(e) => {
                          updateLine(row.key, { unitPrice: e.target.value });
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n[row.key];
                            return n;
                          });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="out-create-cell out-create-cell-num"
                        inputMode="decimal"
                        value={row.quantity}
                        onChange={(e) => {
                          updateLine(row.key, { quantity: e.target.value });
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n[row.key];
                            return n;
                          });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="out-create-cell out-create-cell-num"
                        inputMode="decimal"
                        value={row.discountPct}
                        onChange={(e) => {
                          updateLine(row.key, { discountPct: e.target.value });
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n[row.key];
                            return n;
                          });
                        }}
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
              <span>{sourceNameFieldLabel}</span>
              <input
                value={sourceName}
                maxLength={OUTBOUND_COUNTERPARTY_MAX}
                aria-invalid={Boolean(fieldErrors.source_name)}
                onChange={(e) => {
                  setSourceName(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.source_name;
                    return n;
                  });
                }}
              />
              {fieldErrors.source_name ? <p className="inline-error">{fieldErrors.source_name}</p> : null}
            </label>
            <label className="field">
              <span>Mã nguồn</span>
              <input
                value={sourceCode}
                maxLength={OUTBOUND_SOURCE_CODE_MAX}
                aria-invalid={Boolean(fieldErrors.source_code)}
                onChange={(e) => {
                  setSourceCode(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.source_code;
                    return n;
                  });
                }}
              />
              {fieldErrors.source_code ? <p className="inline-error">{fieldErrors.source_code}</p> : null}
            </label>
            <label className="field">
              <span>Số điện thoại</span>
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
              <span>Địa chỉ</span>
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
              <span>Mã phiếu *</span>
              <input
                value={receiptCode}
                maxLength={OUTBOUND_RECEIPT_CODE_MAX}
                aria-invalid={Boolean(fieldErrors.receipt_code)}
                onChange={(e) => {
                  setReceiptCode(e.target.value);
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.receipt_code;
                    return n;
                  });
                }}
              />
              {fieldErrors.receipt_code ? <p className="inline-error">{fieldErrors.receipt_code}</p> : null}
            </label>
          </div>
        </section>

        <section className="card out-create-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Hợp đồng</h2>
          </div>
          <label className="field">
            <span>Nội dung</span>
            <textarea
              className="textarea-field"
              rows={2}
              maxLength={OUTBOUND_NOTE_MAX}
              value={contractNote}
              aria-invalid={Boolean(fieldErrors.contract_note)}
              onChange={(e) => {
                setContractNote(e.target.value);
                setFieldErrors((p) => {
                  const n = { ...p };
                  delete n.contract_note;
                  return n;
                });
              }}
            />
            {fieldErrors.contract_note ? <p className="inline-error">{fieldErrors.contract_note}</p> : null}
          </label>
          <ImageFilePickerField
            ariaLabel="Hình ảnh kèm thông tin hợp đồng"
            files={contractImageFiles}
            onFilesChange={setContractImages}
            error={fieldErrors.contract_files}
          />
        </section>

        <section className="card out-create-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Sở cứ</h2>
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
            ariaLabel="Hình ảnh kèm sở cứ"
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
                const checked = validateOutboundReceiptCreateForm(
                  {
                    receiptCode,
                    sourceName,
                    sourceCode,
                    phone,
                    address,
                    reason,
                    contractNote,
                    evidenceNote,
                    contractImageFiles,
                    evidenceImageFiles,
                    lines,
                  },
                  { receiptScope }
                );
                if (!checked.ok) {
                  setFieldErrors(checked.errors);
                  return;
                }
                setFieldErrors({});
                setSaving(true);
                try {
                  await createOutboundReceipt({
                    receiptCode: receiptCode.trim(),
                    scope: receiptScope,
                    counterpartyLabel: sourceName.trim(),
                    occurredAt: new Date().toISOString(),
                    sourceCode: sourceCode.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    inboundReceiptRef: "",
                    warehouseName: "",
                    warehouseCode: "",
                    reason: reason.trim(),
                    contractSummary: checked.contractSummary,
                    createdBy: userDisplayName.trim() || "system",
                    lines: checked.apiLines,
                  });
                  onBack();
                } catch (err) {
                  setSubmitError(getHttpErrorMessage(err, "Không lưu được phiếu."));
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
