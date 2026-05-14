import type { ReactElement } from "react";
import type { Supplier, Warehouse } from "../../services/types";
import { RECEIPT_CODE_MAX_LEN } from "../../utils/receiptFormHelpers";

type Props = {
  receiptCode: string;
  supplierId: string;
  warehouseId: string;
  documentDate: string;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  disabled?: boolean;
  /** `outCreate`: card kiểu màn tạo phiếu (Figma / Builder). */
  skin?: "default" | "outCreate";
  /** Lỗi validate theo trường (optional). */
  fieldErrors?: Partial<{
    receipt_code: string;
    supplier: string;
    warehouse: string;
    document_date: string;
  }>;
  onReceiptCodeChange: (v: string) => void;
  onSupplierIdChange: (v: string) => void;
  onWarehouseIdChange: (v: string) => void;
  onDocumentDateChange: (v: string) => void;
};

/** Thông tin phiếu: mã, NCC, kho, ngày chứng từ */
export function ReceiptHeader({
  receiptCode,
  supplierId,
  warehouseId,
  documentDate,
  suppliers,
  warehouses,
  disabled,
  skin = "default",
  fieldErrors,
  onReceiptCodeChange,
  onSupplierIdChange,
  onWarehouseIdChange,
  onDocumentDateChange,
}: Props): ReactElement {
  const isCreate = skin === "outCreate";
  const sectionClass = isCreate ? "card out-create-section" : "card";
  const titleClass = isCreate ? "out-create-section-title" : "card-title";
  const cell = isCreate ? "out-create-cell" : undefined;

  return (
    <section className={sectionClass}>
      <div className="section-head">
        <h2 className={titleClass}>Thông tin phiếu nhập</h2>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Mã phiếu *</span>
          <input
            type="text"
            autoComplete="off"
            maxLength={RECEIPT_CODE_MAX_LEN}
            placeholder="VD: NK-2026-001"
            className={cell}
            value={receiptCode}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.receipt_code)}
            onChange={(e) => onReceiptCodeChange(e.target.value)}
          />
          {fieldErrors?.receipt_code ? <p className="inline-error">{fieldErrors.receipt_code}</p> : null}
        </label>
        <label className="field">
          <span>Nhà cung cấp *</span>
          <select
            className={cell}
            value={supplierId}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.supplier)}
            onChange={(e) => onSupplierIdChange(e.target.value)}
          >
            <option value="">— Chọn —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
          {fieldErrors?.supplier ? <p className="inline-error">{fieldErrors.supplier}</p> : null}
        </label>
        <label className="field">
          <span>Kho nhập *</span>
          <select
            className={cell}
            value={warehouseId}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.warehouse)}
            onChange={(e) => onWarehouseIdChange(e.target.value)}
          >
            <option value="">— Chọn —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name}
                {w.address ? ` — ${w.address}` : ""}
              </option>
            ))}
          </select>
          {fieldErrors?.warehouse ? <p className="inline-error">{fieldErrors.warehouse}</p> : null}
        </label>
        <label className="field">
          <span>Ngày chứng từ *</span>
          <input
            type="date"
            className={cell}
            value={documentDate}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.document_date)}
            onChange={(e) => onDocumentDateChange(e.target.value)}
          />
          {fieldErrors?.document_date ? <p className="inline-error">{fieldErrors.document_date}</p> : null}
        </label>
      </div>
    </section>
  );
}
