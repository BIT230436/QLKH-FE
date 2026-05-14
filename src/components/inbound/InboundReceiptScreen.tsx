import { useEffect, useMemo, useState, type ReactElement } from "react";
import { fetchProducts, fetchSuppliers, fetchWarehouses } from "../../services/catalogApi";
import { createReceipt } from "../../services/receiptApi";
import { getHttpErrorMessage } from "../../utils/errors";
import { parseInboundReceiptLinesFromCsvFiles, type ExcelImportOrderLinePayload } from "../../utils/csvImportLines";
import {
  normalizeDecimalInput,
  parseNonNegativeInt,
} from "../../utils/receiptFormHelpers";
import {
  validateInboundReceiptCreateForm,
  isInboundFormValid,
} from "../../utils/inboundReceiptFormValidation";
import { ReceiptDetailModal, type ReceiptDetailModalState } from "../common/ReceiptDetailModal";
import { ExcelImportModal } from "../common/ExcelImportModal";
import { ProductPickerModal } from "../common/ProductPickerModal";
import { ProductLinesTable, type LineRow } from "../common/ProductLinesTable";
import { ReceiptHeader } from "../common/ReceiptHeader";
import { emptyVtForm, ReceiptVtFields, type VtFormState } from "../common/ReceiptVtFields";
import {
  ReceiptAttachmentsInput,
  emptyAttachmentRows,
  type AttachmentRow,
} from "../common/ReceiptAttachmentsInput";

function newLine(): LineRow {
  return {
    key: crypto.randomUUID(),
    productId: "",
    quantityDoc: "1",
    quantityReceived: "1",
    unitPrice: "",
  };
}

function todayISODate(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

type InboundReceiptScreenProps = {
  /** Có thì bọc layout Builder (header, breadcrumb) và nút quay danh sách. */
  onBack?: () => void;
};

/**
 * Tạo / lưu phiếu nhập kho (API).
 * Với `onBack`, giao diện theo Figma « Tạo mới phiếu nhập kho » (Builder).
 */
export function InboundReceiptScreen({ onBack }: InboundReceiptScreenProps): ReactElement {
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof fetchSuppliers>>>([]);
  const [warehouses, setWarehouses] = useState<Awaited<ReturnType<typeof fetchWarehouses>>>([]);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof fetchProducts>>>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [receiptCode, setReceiptCode] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [documentDate, setDocumentDate] = useState(todayISODate);
  const [vt, setVt] = useState<VtFormState>(() => emptyVtForm());
  const [lines, setLines] = useState<LineRow[]>(() => [newLine()]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>(() => emptyAttachmentRows());
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [detailModal, setDetailModal] = useState<ReceiptDetailModalState>({ status: "closed" });
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [s, w, p] = await Promise.all([
          fetchSuppliers(),
          fetchWarehouses(),
          fetchProducts(),
        ]);
        if (!cancelled) {
          setSuppliers(s);
          setWarehouses(w);
          setProducts(p);
        }
      } catch (e) {
        if (!cancelled) setCatalogError(getHttpErrorMessage(e, "Không tải được danh mục."));
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grandTotalPreview = useMemo(() => {
    return lines.reduce((sum, ln) => {
      const qRec = Number(normalizeDecimalInput(ln.quantityReceived));
      const p = Number(normalizeDecimalInput(ln.unitPrice));
      if (!Number.isFinite(qRec) || !Number.isFinite(p) || qRec <= 0 || p <= 0) {
        return sum;
      }
      return sum + parseFloat((qRec * p).toFixed(2));
    }, 0);
  }, [lines]);

  /** Gộp mọi lỗi validate (kể cả theo dòng UUID) để banner không “im lặng” khi lỗi chỉ ở chi tiết hàng. */
  const fieldErrorBannerText = useMemo(() => {
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const [k, msg] of Object.entries(fieldErrors)) {
      if (!msg || seen.has(msg)) continue;
      if (k.startsWith("attachment:")) continue;
      seen.add(msg);
      parts.push(msg);
    }
    return parts.join(" · ");
  }, [fieldErrors]);

  const headerFieldErrors = useMemo(
    () => ({
      receipt_code: fieldErrors.receipt_code,
      supplier: fieldErrors.supplier,
      warehouse: fieldErrors.warehouse,
      document_date: fieldErrors.document_date,
    }),
    [fieldErrors]
  );

  const vtFieldErrors = useMemo(
    () => ({
      org_unit: fieldErrors.org_unit,
      department: fieldErrors.department,
      debit_account: fieldErrors.debit_account,
      credit_account: fieldErrors.credit_account,
      deliverer_name: fieldErrors.deliverer_name,
      source_doc_no: fieldErrors.source_doc_no,
      source_doc_date: fieldErrors.source_doc_date,
      source_doc_note: fieldErrors.source_doc_note,
      attached_count: fieldErrors.attached_count,
    }),
    [fieldErrors]
  );

  const attachmentRowErrors = useMemo(() => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(fieldErrors)) {
      if (k.startsWith("attachment:") && v) o[k] = v;
    }
    return o;
  }, [fieldErrors]);

  const updateLine = (key: string, patch: Partial<LineRow>): void => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const merged = { ...l, ...patch };
        const productSel = merged.productId
          ? products.find((pr) => pr.id === Number(merged.productId))
          : undefined;
        if (patch.productId !== undefined && productSel) {
          merged.unitPrice = productSel.price;
        }
        return merged;
      })
    );
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
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[key];
      delete n.lines;
      return n;
    });
  };

  const applyImportedReceiptLines = (rows: ExcelImportOrderLinePayload[]): void => {
    setLines((prev) => [
      ...prev,
      ...rows.map((r) => {
        const key = crypto.randomUUID();
        const productId = r.code.trim();
        const productSel = productId ? products.find((pr) => pr.id === Number(productId)) : undefined;
        const qtyDoc = r.discountPct.trim() || r.quantity.trim() || "1";
        const qtyRec = r.quantity.trim() || "1";
        const unitPrice = productSel ? productSel.price : r.unitPrice.trim();
        return {
          key,
          productId,
          quantityDoc: qtyDoc,
          quantityReceived: qtyRec,
          unitPrice,
        };
      }),
    ]);
    setFieldErrors((p) => {
      const n = { ...p };
      delete n.lines;
      return n;
    });
  };

  /** Thêm dòng từ modal chọn danh mục — `discountPct` không dùng làm SL chứng từ (khác CSV nhập). */
  const applyProductCatalogLines = (rows: ExcelImportOrderLinePayload[]): void => {
    setLines((prev) => [
      ...prev,
      ...rows.map((r) => {
        const key = crypto.randomUUID();
        const productId = r.code.trim();
        const productSel = productId ? products.find((pr) => pr.id === Number(productId)) : undefined;
        const qty = r.quantity.trim() || "1";
        return {
          key,
          productId,
          quantityDoc: qty,
          quantityReceived: qty,
          unitPrice: productSel ? productSel.price : r.unitPrice.trim(),
        };
      }),
    ]);
    setFieldErrors((p) => {
      const n = { ...p };
      delete n.lines;
      return n;
    });
  };

  const validate = (): boolean => {
    const next = validateInboundReceiptCreateForm({
      receiptCode,
      supplierId,
      warehouseId,
      documentDate,
      vt,
      attachments,
      lines,
    });
    const ok = isInboundFormValid(next);
    setFieldErrors(ok ? {} : next);
    return ok;
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!validate()) return;

    const attached = parseNonNegativeInt(vt.attachedCount) ?? 0;

    const items = lines.map((ln) => ({
      product_id: Number(ln.productId),
      quantity_per_doc: Number(normalizeDecimalInput(ln.quantityDoc)),
      quantity_received: Number(normalizeDecimalInput(ln.quantityReceived)),
      unit_price: Number(normalizeDecimalInput(ln.unitPrice)),
    }));

    const attachmentPayload = attachments
      .map((a) => ({
        label: a.label.trim() || undefined,
        file_url: a.url.trim(),
      }))
      .filter((a) => a.file_url.length > 0);

    const payload = {
      receipt_code: receiptCode.trim(),
      supplier_id: Number(supplierId),
      warehouse_id: Number(warehouseId),
      document_date: documentDate.trim(),
      org_unit: vt.orgUnit.trim() || undefined,
      department: vt.department.trim() || undefined,
      debit_account: vt.debitAccount.trim() || undefined,
      credit_account: vt.creditAccount.trim() || undefined,
      deliverer_name: vt.delivererName.trim() || undefined,
      source_doc_no: vt.sourceDocNo.trim() || undefined,
      source_doc_date: vt.sourceDocDate.trim() || undefined,
      source_doc_note: vt.sourceDocNote.trim() || undefined,
      attached_original_count: attached,
      status: saveAsDraft ? ("draft" as const) : ("posted" as const),
      attachments: attachmentPayload.length ? attachmentPayload : undefined,
      items,
    };

    setSubmitLoading(true);
    try {
      const created = await createReceipt(payload);
      /** Luồng từ menu (có `onBack`): giống phiếu xuất — quay về danh sách sau khi lưu thành công. */
      if (onBack) {
        onBack();
        return;
      }
      setSubmitSuccess(
        saveAsDraft
          ? "Đã lưu phiếu nháp. Có thể xác nhận sau trong danh sách hoặc chi tiết."
          : "Đã lưu và xác nhận phiếu nhập."
      );
      setDetailModal({ status: "ready", data: created });
      setReceiptCode("");
      setSupplierId("");
      setWarehouseId("");
      setDocumentDate(todayISODate());
      setVt(emptyVtForm());
      setLines([newLine()]);
      setAttachments(emptyAttachmentRows());
      setSaveAsDraft(false);
    } catch (err) {
      setSubmitError(getHttpErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  };

  const busy = catalogLoading || submitLoading;

  const closeDetailModal = (): void => {
    setDetailModal({ status: "closed" });
  };

  const skin = onBack ? "outCreate" : "default";

  const formInner = (
    <>
      <ReceiptHeader
        receiptCode={receiptCode}
        supplierId={supplierId}
        warehouseId={warehouseId}
        documentDate={documentDate}
        suppliers={suppliers}
        warehouses={warehouses}
        disabled={busy}
        skin={skin}
        fieldErrors={headerFieldErrors}
        onReceiptCodeChange={(v) => {
          setReceiptCode(v);
          setFieldErrors((p) => {
            const n = { ...p };
            delete n.receipt_code;
            return n;
          });
        }}
        onSupplierIdChange={(v) => {
          setSupplierId(v);
          setFieldErrors((p) => {
            const n = { ...p };
            delete n.supplier;
            return n;
          });
        }}
        onWarehouseIdChange={(v) => {
          setWarehouseId(v);
          setFieldErrors((p) => {
            const n = { ...p };
            delete n.warehouse;
            return n;
          });
        }}
        onDocumentDateChange={(v) => {
          setDocumentDate(v);
          setFieldErrors((p) => {
            const n = { ...p };
            delete n.document_date;
            delete n.source_doc_date;
            return n;
          });
        }}
      />
      <ReceiptVtFields
        values={vt}
        disabled={busy}
        skin={skin}
        fieldErrors={vtFieldErrors}
        onChange={(patch) => {
          setVt((v) => ({ ...v, ...patch }));
          setFieldErrors((p) => {
            const n = { ...p };
            if (patch.orgUnit !== undefined) delete n.org_unit;
            if (patch.department !== undefined) delete n.department;
            if (patch.debitAccount !== undefined) delete n.debit_account;
            if (patch.creditAccount !== undefined) delete n.credit_account;
            if (patch.delivererName !== undefined) delete n.deliverer_name;
            if (patch.sourceDocNo !== undefined) delete n.source_doc_no;
            if (patch.sourceDocDate !== undefined) {
              delete n.source_doc_date;
            }
            if (patch.sourceDocNote !== undefined) delete n.source_doc_note;
            if (patch.attachedCount !== undefined) delete n.attached_count;
            return n;
          });
        }}
      />
      <ReceiptAttachmentsInput
        rows={attachments}
        disabled={busy}
        skin={skin}
        attachmentsError={fieldErrors.attachments}
        rowErrors={attachmentRowErrors}
        onChange={(rows) => {
          setAttachments(rows);
          setFieldErrors((p) => {
            const n = { ...p };
            delete n.attachments;
            for (const k of Object.keys(n)) {
              if (k.startsWith("attachment:")) delete n[k];
            }
            return n;
          });
        }}
      />

      {onBack && (
        <div className="out-create-toolbar">
          <button type="button" className="out-create-btn-secondary" onClick={() => setProductPickerOpen(true)}>
            + Thêm hàng từ hệ thống
          </button>
          <button
            type="button"
            className="out-create-btn-secondary"
            onClick={() => {
              setExcelImportOpen(true);
            }}
          >
            + Thêm hàng từ file ngoài
          </button>
        </div>
      )}

      <ProductLinesTable
        lines={lines}
        products={products}
        validationErrors={fieldErrors}
        disabled={busy}
        skin={skin}
        onChangeLine={updateLine}
        onAddLine={addLine}
        onRemoveLine={removeLine}
      />

      {onBack ? (
        <div className="out-create-actions out-create-actions-inbound">
          <label className="checkbox-field inbound-draft-inline">
            <input
              type="checkbox"
              checked={saveAsDraft}
              disabled={busy}
              onChange={(e) => setSaveAsDraft(e.target.checked)}
            />
            <span>Lưu nháp (chưa xác nhận nhập kho)</span>
          </label>
          <div className="out-create-actions-buttons">
            <button type="button" className="btn-secondary" onClick={onBack}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={busy || catalogLoading}>
              {submitLoading ? "Đang gửi…" : catalogLoading ? "Đang tải…" : "Lưu phiếu"}
            </button>
          </div>
        </div>
      ) : (
        <div className="form-actions form-actions-split">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={saveAsDraft}
              disabled={busy}
              onChange={(e) => setSaveAsDraft(e.target.checked)}
            />
            <span>Lưu nháp (chưa xác nhận nhập kho)</span>
          </label>
          <button type="submit" className="btn-primary" disabled={busy || catalogLoading}>
            {submitLoading ? "Đang gửi…" : catalogLoading ? "Đang tải…" : "Lưu phiếu"}
          </button>
        </div>
      )}
    </>
  );

  if (onBack) {
    return (
      <div className="app-page outbound-page out-create-page feature-doc-page">
        <ReceiptDetailModal
          state={detailModal}
          onClose={closeDetailModal}
          onAfterConfirm={(d) => {
            setDetailModal({ status: "ready", data: d });
          }}
        />
        <ExcelImportModal
          open={excelImportOpen}
          onClose={() => setExcelImportOpen(false)}
          onApplyLines={applyImportedReceiptLines}
          parseCsvFilesToOrderLines={parseInboundReceiptLinesFromCsvFiles}
          csvProfile="receipt"
        />
        <ProductPickerModal
          open={productPickerOpen}
          onClose={() => setProductPickerOpen(false)}
          onApply={applyProductCatalogLines}
        />

        <main className="outbound-main out-create-main">
          <div className="out-detail-toolbar">
            <button type="button" className="app-inbound-back" onClick={onBack}>
              ← Danh sách phiếu nhập
            </button>
          </div>
          <p className="out-create-crumb muted">
            Xuất - nhập với NCC <span className="out-create-crumb-sep">›</span> Tạo mới phiếu nhập kho
          </p>
          <h1 className="out-create-doc-title">Phiếu nhập kho</h1>

          {catalogError && <div className="banner banner-error">{catalogError}</div>}
          {fieldErrorBannerText ? (
            <div className="banner banner-error subtle">{fieldErrorBannerText}</div>
          ) : null}
          {submitError && <div className="banner banner-error">{submitError}</div>}
          {submitSuccess && <div className="banner banner-success">{submitSuccess}</div>}

          <form onSubmit={(e) => void submit(e)} className="stack">
            {formInner}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <ReceiptDetailModal
        state={detailModal}
        onClose={closeDetailModal}
        onAfterConfirm={(d) => {
          setDetailModal({ status: "ready", data: d });
        }}
      />

      <header className="page-header">
        <div>
          <h1>Nhập kho</h1>
          <p className="subtitle">Phiếu nhập kho — REST API localhost:3000</p>
        </div>
        {grandTotalPreview > 0 && (
          <div className="pill">
            Ước tính tổng (theo SL thực nhập):{" "}
            <strong>{new Intl.NumberFormat("vi-VN").format(grandTotalPreview)}</strong>
          </div>
        )}
      </header>

      {catalogError && <div className="banner banner-error">{catalogError}</div>}
      {fieldErrorBannerText ? (
        <div className="banner banner-error subtle">{fieldErrorBannerText}</div>
      ) : null}
      {submitError && <div className="banner banner-error">{submitError}</div>}
      {submitSuccess && <div className="banner banner-success">{submitSuccess}</div>}

      <form onSubmit={(e) => void submit(e)} className="stack">
        {formInner}
      </form>
    </div>
  );
}
