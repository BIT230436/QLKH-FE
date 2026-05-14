import type { ReactElement } from "react";
import { NOTE_MAX_LEN } from "../../utils/receiptFormHelpers";
import {
  INBOUND_VT_ACCOUNT_MAX,
  INBOUND_VT_SOURCE_DOC_NO_MAX,
  INBOUND_VT_TEXT_MAX,
} from "../../utils/inboundReceiptFormValidation";

export type VtFormState = {
  orgUnit: string;
  department: string;
  debitAccount: string;
  creditAccount: string;
  delivererName: string;
  sourceDocNo: string;
  sourceDocDate: string;
  sourceDocNote: string;
  attachedCount: string;
};

type Props = {
  values: VtFormState;
  disabled?: boolean;
  skin?: "default" | "outCreate";
  onChange: (patch: Partial<VtFormState>) => void;
  /** Lỗi validate (key khớp backend / `InboundReceiptScreen`). */
  fieldErrors?: Partial<{
    org_unit: string;
    department: string;
    debit_account: string;
    credit_account: string;
    deliverer_name: string;
    source_doc_no: string;
    source_doc_date: string;
    source_doc_note: string;
    attached_count: string;
  }>;
};

/** Các trường bổ sung theo biểu mẫu 01-VT (tùy chọn) */
export function ReceiptVtFields({
  values,
  disabled,
  skin = "default",
  fieldErrors,
  onChange,
}: Props): ReactElement {
  const isCreate = skin === "outCreate";
  const sectionClass = isCreate ? "card out-create-section" : "card";
  const titleClass = isCreate ? "out-create-section-title" : "card-title";
  const cell = isCreate ? "out-create-cell" : undefined;

  return (
    <section className={sectionClass}>
      <div className="section-head">
        <h2 className={titleClass}>Thông tin bổ sung (theo mẫu 01-VT)</h2>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Đơn vị</span>
          <input
            type="text"
            className={cell}
            maxLength={INBOUND_VT_TEXT_MAX}
            value={values.orgUnit}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.org_unit)}
            onChange={(e) => onChange({ orgUnit: e.target.value })}
          />
          {fieldErrors?.org_unit ? <p className="inline-error">{fieldErrors.org_unit}</p> : null}
        </label>
        <label className="field">
          <span>Bộ phận</span>
          <input
            type="text"
            className={cell}
            maxLength={INBOUND_VT_TEXT_MAX}
            value={values.department}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.department)}
            onChange={(e) => onChange({ department: e.target.value })}
          />
          {fieldErrors?.department ? <p className="inline-error">{fieldErrors.department}</p> : null}
        </label>
        <label className="field">
          <span>TK Nợ</span>
          <input
            type="text"
            className={cell}
            maxLength={INBOUND_VT_ACCOUNT_MAX}
            value={values.debitAccount}
            disabled={disabled}
            placeholder="VD: 156"
            aria-invalid={Boolean(fieldErrors?.debit_account)}
            onChange={(e) => onChange({ debitAccount: e.target.value })}
          />
          {fieldErrors?.debit_account ? <p className="inline-error">{fieldErrors.debit_account}</p> : null}
        </label>
        <label className="field">
          <span>TK Có</span>
          <input
            type="text"
            className={cell}
            maxLength={INBOUND_VT_ACCOUNT_MAX}
            value={values.creditAccount}
            disabled={disabled}
            placeholder="VD: 331"
            aria-invalid={Boolean(fieldErrors?.credit_account)}
            onChange={(e) => onChange({ creditAccount: e.target.value })}
          />
          {fieldErrors?.credit_account ? <p className="inline-error">{fieldErrors.credit_account}</p> : null}
        </label>
        <label className="field span-2">
          <span>Họ tên người giao</span>
          <input
            type="text"
            className={cell}
            maxLength={INBOUND_VT_TEXT_MAX}
            value={values.delivererName}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.deliverer_name)}
            onChange={(e) => onChange({ delivererName: e.target.value })}
          />
          {fieldErrors?.deliverer_name ? <p className="inline-error">{fieldErrors.deliverer_name}</p> : null}
        </label>
      </div>

      <h3 className="detail-lines-title">Theo chứng từ gốc</h3>
      <div className="form-grid">
        <label className="field">
          <span>Số chứng từ gốc</span>
          <input
            type="text"
            className={cell}
            maxLength={INBOUND_VT_SOURCE_DOC_NO_MAX}
            value={values.sourceDocNo}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.source_doc_no)}
            onChange={(e) => onChange({ sourceDocNo: e.target.value })}
          />
          {fieldErrors?.source_doc_no ? <p className="inline-error">{fieldErrors.source_doc_no}</p> : null}
        </label>
        <label className="field">
          <span>Ngày chứng từ gốc</span>
          <input
            type="date"
            className={cell}
            value={values.sourceDocDate}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.source_doc_date)}
            onChange={(e) => onChange({ sourceDocDate: e.target.value })}
          />
          {fieldErrors?.source_doc_date ? <p className="inline-error">{fieldErrors.source_doc_date}</p> : null}
        </label>
        <label className="field span-2">
          <span>Diễn giải / theo hóa đơn, biên bản…</span>
          <textarea
            className={isCreate ? "textarea-field out-create-cell" : "textarea-field"}
            rows={2}
            maxLength={NOTE_MAX_LEN}
            value={values.sourceDocNote}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors?.source_doc_note)}
            onChange={(e) => onChange({ sourceDocNote: e.target.value })}
          />
          {fieldErrors?.source_doc_note ? <p className="inline-error">{fieldErrors.source_doc_note}</p> : null}
        </label>
        <label className="field">
          <span>Số chứng từ gốc kèm theo</span>
          <input
            type="text"
            inputMode="numeric"
            className={cell}
            value={values.attachedCount}
            disabled={disabled}
            placeholder="0"
            aria-invalid={Boolean(fieldErrors?.attached_count)}
            onChange={(e) => onChange({ attachedCount: e.target.value })}
          />
          {fieldErrors?.attached_count ? <p className="inline-error">{fieldErrors.attached_count}</p> : null}
        </label>
      </div>
    </section>
  );
}

export function emptyVtForm(): VtFormState {
  return {
    orgUnit: "",
    department: "",
    debitAccount: "",
    creditAccount: "",
    delivererName: "",
    sourceDocNo: "",
    sourceDocDate: "",
    sourceDocNote: "",
    attachedCount: "0",
  };
}
