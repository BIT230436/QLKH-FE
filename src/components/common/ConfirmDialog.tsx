import { useEffect, useId, type ReactElement } from "react";
import { IconDialogConfirm, IconDialogInfo } from "../icons/ActionIcons";

export type ConfirmDialogProps = {
  open: boolean;
  /** Tiêu đề phía trên nội dung (tùy chọn). */
  title?: string;
  /** Nội dung chính. */
  message: string;
  /** `confirm`: Đồng ý (xanh) + Hủy (đỏ). `alert`: một nút Đóng (xanh). */
  variant?: "confirm" | "alert";
  onConfirm: () => void;
  onCancel: () => void;
  /** Nhãn nút xác nhận (mặc định: Đồng ý / Đóng khi variant=alert). */
  confirmLabel?: string;
  /** Nhãn nút hủy (chỉ variant confirm). */
  cancelLabel?: string;
};

/**
 * Hộp thoại xác nhận / thông báo — giao diện nội bộ (nền mờ + panel trắng, nút xanh-đỏ).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  variant = "confirm",
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel = "Hủy",
}: ConfirmDialogProps): ReactElement | null {
  const titleId = useId();
  const messageId = useId();
  const resolvedConfirm = confirmLabel ?? (variant === "alert" ? "Đóng" : "Đồng ý");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const labelledBy = title?.trim() ? `${titleId} ${messageId}` : messageId;

  return (
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="confirm-dialog-panel frame-363 feature-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {title?.trim() ? (
          <h2 id={titleId} className="confirm-dialog-title">
            <span className="confirm-dialog-title-inner">
              {variant === "confirm" ? (
                <IconDialogConfirm className="confirm-dialog-title-ico" />
              ) : (
                <IconDialogInfo className="confirm-dialog-title-ico confirm-dialog-title-ico--alert" />
              )}
              <span className="confirm-dialog-title-text">{title.trim()}</span>
            </span>
          </h2>
        ) : null}
        <p id={messageId} className="confirm-dialog-message">
          {message}
        </p>
        {variant === "alert" ? (
          <div className="confirm-dialog-actions confirm-dialog-actions--system">
            <button type="button" className="confirm-dialog-btn confirm-dialog-btn-agree" onClick={onConfirm}>
              {resolvedConfirm}
            </button>
          </div>
        ) : (
          <div className="confirm-dialog-actions confirm-dialog-actions--system confirm-dialog-actions--confirm">
            <button type="button" className="confirm-dialog-btn confirm-dialog-btn-agree" onClick={onConfirm}>
              {resolvedConfirm}
            </button>
            <button type="button" className="confirm-dialog-btn confirm-dialog-btn-dismiss" onClick={onCancel}>
              {cancelLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
