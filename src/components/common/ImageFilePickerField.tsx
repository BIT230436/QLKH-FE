import { useEffect, useState, useRef, type ReactElement } from "react";

type Props = {
  /** Phân biệt các ô khi cùng màn hình (trình đọc màn hình). */
  ariaLabel: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Lỗi validate (dung lượng, loại file, số lượng…). */
  error?: string | null;
  /** `null` = ẩn gợi ý dưới ô chọn file. */
  hintText?: string | null;
};

/**
 * Chọn ảnh trên máy người dùng (chưa gửi server — tích hợp API lưu kèm lệnh/phiếu sau).
 * Hiển thị xem trước thumbnail qua object URL; revoke khi đổi danh sách / unmount.
 */
export function ImageFilePickerField({
  ariaLabel,
  files,
  onFilesChange,
  error,
  hintText,
}: Props): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      for (const u of urls) {
        URL.revokeObjectURL(u);
      }
    };
  }, [files]);

  return (
    <div className="field image-file-picker-wrap">
      <span>Hình ảnh</span>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        className="image-file-picker-input"
        aria-label={ariaLabel}
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          if (picked.length > 0) onFilesChange(picked);
          e.target.value = "";
        }}
      />
      {files.length > 0 ? (
        <div className="image-file-picker-previews" role="list" aria-label="Ảnh đã chọn — xem trước">
          {files.map((f, i) => (
            <figure key={`${f.name}-${i}-${f.size}`} className="image-file-picker-thumb" role="listitem">
              {previewUrls[i] ? (
                <img
                  src={previewUrls[i]}
                  alt=""
                  className="image-file-picker-thumb-img"
                  loading="lazy"
                />
              ) : (
                <div className="image-file-picker-thumb-skeleton" aria-hidden />
              )}
              <figcaption className="image-file-picker-thumb-caption muted">{f.name}</figcaption>
            </figure>
          ))}
        </div>
      ) : hintText === null ? null : (
        <p className="image-file-picker-hint muted">
          {hintText ?? "PNG, JPG, WebP — tối đa 20 ảnh, 5 MB/ảnh."}
        </p>
      )}
      {error ? <p className="inline-error">{error}</p> : null}
      <div className="image-file-picker-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={files.length === 0}
          onClick={() => {
            onFilesChange([]);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          Xóa danh sách đã chọn
        </button>
      </div>
    </div>
  );
}
