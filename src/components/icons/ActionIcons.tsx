import type { ReactElement } from "react";

/**
 * Bộ thao tác bảng — chỉ 3 icon: Xem (mắt), Sửa (bút), Xóa (thùng + màu danger qua `.table-action-btn.danger`).
 * Stroke 2px, `currentColor`, đồng bộ tone hệ thống.
 */

type IconProps = { className?: string; title?: string };

function wrap(children: ReactElement, { className, title }: IconProps, viewBox: string): ReactElement {
  return (
    <svg
      className={className}
      width="1.125rem"
      height="1.125rem"
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Xem / mở chi tiết / danh sách (một icon cho mọi hành động “xem”). */
export function IconActionView(props: IconProps): ReactElement {
  return wrap(
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5C7 5 3.5 8.5 2 12c1.5 3.5 5 7 10 7s8.5-3.5 10-7c-1.5-3.5-5-7-10-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </g>,
    props,
    "0 0 24 24"
  );
}

/** Sửa */
export function IconActionEdit(props: IconProps): ReactElement {
  return wrap(
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5l4 4L9 19H5v-4L16.5 3.5Z" />
    </g>,
    props,
    "0 0 24 24"
  );
}

/** Xóa — dùng với `className="table-action-btn danger"` để tô đỏ như chuẩn UI. */
export function IconActionDelete(props: IconProps): ReactElement {
  return wrap(
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V5a2 2 0 012-2h4a2 2 0 012 2v1" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </g>,
    props,
    "0 0 24 24"
  );
}

/** Tiêu đề / nút « Xác nhận » — vòng tròn + dấu tích (dialog, phiếu nhập). */
export function IconDialogConfirm(props: IconProps): ReactElement {
  return wrap(
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </g>,
    props,
    "0 0 24 24"
  );
}

/** Tiêu đề thông báo (variant alert) — vòng tròn chữ i. */
export function IconDialogInfo(props: IconProps): ReactElement {
  return wrap(
    <g>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 15.5V9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.25" r="1.25" fill="currentColor" />
    </g>,
    props,
    "0 0 24 24"
  );
}
