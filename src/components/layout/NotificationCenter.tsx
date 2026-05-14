import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { IconBell } from "../icons/NavIcons";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationRow,
} from "../../services/notificationsApi";
import { getHttpErrorMessage } from "../../utils/errors";
import type { AppPage } from "../../layout/appPages";
import { NOTIFICATION_NAVIGABLE_PAGES } from "../../layout/appPages";

const POLL_MS = 45_000;

function isNavigableAppPage(path: string): path is AppPage {
  return (NOTIFICATION_NAVIGABLE_PAGES as readonly string[]).includes(path);
}

function kindClass(kind: string): string {
  switch (kind) {
    case "success":
      return "notif-item notif-item--success";
    case "warning":
      return "notif-item notif-item--warn";
    case "danger":
      return "notif-item notif-item--danger";
    default:
      return "notif-item notif-item--info";
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hiển thị ngắn kiểu GitHub/Slack; tooltip vẫn dùng `formatTime`. */
function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diffMs = Date.now() - t;
  if (Number.isNaN(diffMs) || diffMs < 0) return formatTime(iso);
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return formatTime(iso);
}

function NotifKindIcon({ kind }: { kind: string }): ReactElement {
  const cls =
    kind === "success"
      ? "notif-kind-ico notif-kind-ico--success"
      : kind === "warning"
        ? "notif-kind-ico notif-kind-ico--warn"
        : kind === "danger"
          ? "notif-kind-ico notif-kind-ico--danger"
          : "notif-kind-ico notif-kind-ico--info";
  let path: ReactNode;
  switch (kind) {
    case "success":
      path = <path d="M5 12l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />;
      break;
    case "warning":
      path = (
        <path
          d="M12 7v5M12 16h.01M10.3 4.6L3.2 17A1 1 0 004 19h16a1 1 0 00.8-2L13.7 4.6a1 1 0 00-1.8 0z"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          strokeLinejoin="round"
        />
      );
      break;
    case "danger":
      path = (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
      break;
    default:
      path = (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <path d="M12 10v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
  }
  return (
    <svg className={cls} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      {path}
    </svg>
  );
}

type Props = {
  onNavigate?: (page: AppPage) => void;
};

/**
 * Chuông thông báo topbar: panel danh sách, đánh dấu đọc, polling định kỳ.
 * Deep-link: `link_path` trùng một `AppPage` thì gọi `onNavigate`.
 */
export function NotificationCenter({ onNavigate }: Props): ReactElement {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<UserNotificationRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await fetchNotifications(50);
      setRows(data);
      setLoadError(null);
    } catch (e) {
      setLoadError(getHttpErrorMessage(e, "Không tải được thông báo."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        setOpen(false);
        window.setTimeout(() => bellRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unreadCount = useMemo(() => rows.filter((r) => r.readAt == null).length, [rows]);

  const onToggle = (): void => {
    setOpen((o) => !o);
    if (!open) void load();
  };

  const onItemActivate = async (n: UserNotificationRow): Promise<void> => {
    if (n.readAt == null) {
      try {
        await markNotificationRead(n.id);
        setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, readAt: new Date().toISOString() } : r)));
      } catch {
        /* ignore */
      }
    }
    const p = n.linkPath?.trim();
    if (p && isNavigableAppPage(p)) {
      onNavigate?.(p);
      setOpen(false);
    }
  };

  const onMarkAll = async (): Promise<void> => {
    try {
      await markAllNotificationsRead();
      setRows((prev) => prev.map((r) => ({ ...r, readAt: r.readAt ?? new Date().toISOString() })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="notif-center-wrap" ref={wrapRef}>
      <button
        ref={bellRef}
        type="button"
        className={`app-shell-icon-btn${open ? " is-active" : ""}`}
        aria-label={
          unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onToggle}
      >
        <IconBell className="app-shell-top-ico" title="Thông báo" />
        {unreadCount > 0 ? (
          <span className="app-shell-notify-badge" aria-hidden>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          ref={panelRef}
          className="notif-panel card"
          role="dialog"
          aria-label="Thông báo"
          tabIndex={-1}
        >
          <div className="notif-panel-head">
            <span className="notif-panel-title">Thông báo</span>
            <span className="notif-panel-head-actions">
              <button
                type="button"
                className="notif-panel-icon-btn"
                aria-label="Làm mới danh sách"
                disabled={loading}
                onClick={() => void load()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M4 12a8 8 0 0113.657-5.657M20 12a8 8 0 01-13.657 5.657M20 12H14M4 12h6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {unreadCount > 0 ? (
                <button type="button" className="notif-panel-link" onClick={() => void onMarkAll()}>
                  Đánh dấu đã đọc tất cả
                </button>
              ) : null}
            </span>
          </div>
          {loadError ? <p className="notif-panel-error">{loadError}</p> : null}
          {loading && !rows.length ? <p className="muted notif-panel-empty">Đang tải…</p> : null}
          {!loading && !rows.length && !loadError ? (
            <p className="muted notif-panel-empty">Chưa có thông báo.</p>
          ) : null}
          <ul className="notif-list">
            {rows.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={kindClass(n.kind)}
                  data-read={n.readAt ? "1" : "0"}
                  onClick={() => void onItemActivate(n)}
                >
                  <span className="notif-item-title-row">
                    <NotifKindIcon kind={n.kind} />
                    {n.readAt == null ? (
                      <span className="notif-item-unread-pip" title="Chưa đọc" aria-hidden />
                    ) : null}
                    <span className="notif-item-title">{n.title}</span>
                  </span>
                  {n.body ? <span className="notif-item-body">{n.body}</span> : null}
                  <span className="notif-item-meta" title={formatTime(n.createdAt)}>
                    {formatRelativeTime(n.createdAt)}
                  </span>
                  {n.linkPath?.trim() && isNavigableAppPage(n.linkPath.trim()) ? (
                    <span className="notif-item-link-hint">Mở màn hình liên quan</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
