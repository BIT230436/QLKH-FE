import type { ReactElement } from "react";

type IconProps = { className?: string; title?: string };

function wrap(
  children: ReactElement,
  { className, title }: IconProps,
  viewBox: string
): ReactElement {
  return (
    <svg
      className={className}
      width="1.1em"
      height="1.1em"
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

/** Icon monoline dùng cho AppShell — thay emoji, đồng bộ enterprise. */
export function IconOverview(props: IconProps): ReactElement {
  return wrap(
    <path
      d="M4 14V10M10 14V4M16 14V8M22 14V12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />,
    props,
    "0 0 24 24"
  );
}

export function IconPackage(props: IconProps): ReactElement {
  return wrap(
    <g>
      <path d="M4 8L12 4L20 8V16L12 20L4 16V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 8L12 12L20 8M12 12V20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </g>,
    props,
    "0 0 24 24"
  );
}

export function IconClipboard(props: IconProps): ReactElement {
  return wrap(
    <g>
      <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8H15M9 12H15M9 16H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>,
    props,
    "0 0 24 24"
  );
}

/** NVBH / kênh bán hàng — túi mua hàng (phân biệt NCC = thùng hàng, nội bộ = clipboard). */
export function IconRetail(props: IconProps): ReactElement {
  return wrap(
    <g>
      <path
        d="M8 9V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 9H19L17.5 20H6.5L5 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 13H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>,
    props,
    "0 0 24 24"
  );
}

export function IconAudit(props: IconProps): ReactElement {
  return wrap(
    <g>
      <path d="M6 4H18V20H6V4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8H15M9 12H15M9 16H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>,
    props,
    "0 0 24 24"
  );
}

export function IconChart(props: IconProps): ReactElement {
  return wrap(
    <g>
      <path d="M4 20H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 16V12M12 16V8M17 16V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>,
    props,
    "0 0 24 24"
  );
}

export function IconFolder(props: IconProps): ReactElement {
  return wrap(
    <path
      d="M4 8L8 6H14L16 8H20V18H4V8Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />,
    props,
    "0 0 24 24"
  );
}

export function IconBell(props: IconProps): ReactElement {
  return wrap(
    <g>
      <path
        d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"
        fill="currentColor"
      />
      <path
        d="M6 16V11C6 8 8 6 11 6V5C11 4 11.5 3.5 12 3.5C12.5 3.5 13 4 13 5V6C16 6 18 8 18 11V16L20 18H4L6 16Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </g>,
    props,
    "0 0 24 24"
  );
}

export function IconLogout(props: IconProps): ReactElement {
  return wrap(
    <g>
      <path d="M10 5H6C5 5 4 6 4 7V17C4 18 5 19 6 19H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 8L20 12L14 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>,
    props,
    "0 0 24 24"
  );
}

export function IconChevron({ open, className, title }: IconProps & { open?: boolean }): ReactElement {
  return wrap(
    <path
      d={open ? "M6 9L12 15L18 9" : "M9 6L15 12L9 18"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
    { className, title },
    "0 0 24 24"
  );
}
