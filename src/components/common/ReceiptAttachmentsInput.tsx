import type { ReactElement } from "react";
import { inboundAttachmentErrorKey, INBOUND_ATTACH_LABEL_MAX, INBOUND_ATTACH_URL_MAX } from "../../utils/inboundReceiptFormValidation";

export type AttachmentRow = { key: string; label: string; url: string };

type Props = {
  rows: AttachmentRow[];
  disabled?: boolean;
  skin?: "default" | "outCreate";
  onChange: (rows: AttachmentRow[]) => void;
  /** Lỗi chung (ví dụ vượt quá 20 URL). */
  attachmentsError?: string;
  /** Lỗi theo từng dòng — key = `attachment:${row.key}`. */
  rowErrors?: Record<string, string>;
};

function newRow(): AttachmentRow {
  return { key: crypto.randomUUID(), label: "", url: "" };
}

/** Liên kết file chứng từ (URL https) — không upload binary trong MVP */
export function ReceiptAttachmentsInput({
  rows,
  disabled,
  skin = "default",
  attachmentsError,
  rowErrors,
  onChange,
}: Props): ReactElement {
  const update = (key: string, patch: Partial<AttachmentRow>): void => {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const remove = (key: string): void => {
    onChange(rows.filter((r) => r.key !== key));
  };

  const isCreate = skin === "outCreate";
  const sectionClass = isCreate ? "card out-create-section" : "card";
  const titleClass = isCreate ? "out-create-section-title" : "card-title";
  const attachClass = isCreate ? "attach-input out-create-cell" : "attach-input";
  const attachGrow = isCreate ? "attach-input grow out-create-cell" : "attach-input grow";

  return (
    <section className={sectionClass}>
      <div className="section-head">
        <h2 className={titleClass}>Đính kèm (URL)</h2>
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled || rows.length >= 20}
          onClick={() => onChange([...rows, newRow()])}
        >
          Thêm liên kết
        </button>
      </div>
      <p className="muted small-hint">Dán link https tới PDF/ảnh chứng từ (tối đa 20).</p>
      {attachmentsError ? <p className="inline-error">{attachmentsError}</p> : null}
      {!rows.length && <p className="muted">Chưa có liên kết.</p>}
      <div className="attach-list">
        {rows.map((r) => (
          <div key={r.key} className="attach-row">
            <div className="attach-row-fields">
              <input
                type="text"
                className={attachClass}
                placeholder="Nhãn (VD: Hóa đơn)"
                maxLength={INBOUND_ATTACH_LABEL_MAX}
                value={r.label}
                disabled={disabled}
                onChange={(e) => update(r.key, { label: e.target.value })}
              />
              <input
                type="url"
                className={attachGrow}
                placeholder="https://..."
                maxLength={INBOUND_ATTACH_URL_MAX}
                value={r.url}
                disabled={disabled}
                onChange={(e) => update(r.key, { url: e.target.value })}
              />
              <button
                type="button"
                className="btn-ghost-danger"
                disabled={disabled}
                onClick={() => remove(r.key)}
              >
                Xóa
              </button>
            </div>
            {rowErrors?.[inboundAttachmentErrorKey(r.key)] ? (
              <p className="inline-error">{rowErrors[inboundAttachmentErrorKey(r.key)]}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function emptyAttachmentRows(): AttachmentRow[] {
  return [];
}
