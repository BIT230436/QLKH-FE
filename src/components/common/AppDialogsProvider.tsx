import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { registerAppDialogs } from "./appDialogs";

type AlertJob = { kind: "alert"; title?: string; message: string; resolve: () => void };
type ConfirmJob = { kind: "confirm"; title?: string; message: string; resolve: (ok: boolean) => void };
type DialogJob = AlertJob | ConfirmJob;

type Props = { children: ReactNode };

/**
 * Host toàn cục cho `appAlert` / `appConfirm` — hàng đợi tuần tự, không dùng `window.alert` / `window.confirm`.
 */
export function AppDialogsProvider({ children }: Props): ReactElement {
  const [active, setActive] = useState<DialogJob | null>(null);
  const queueRef = useRef<DialogJob[]>([]);
  /** Luôn trùng với `active` trong handler (tránh closure `active` cũ → không resolve / không đóng dialog). */
  const activeRef = useRef<DialogJob | null>(null);
  activeRef.current = active;

  const bump = useCallback(() => {
    setActive((cur) => cur ?? queueRef.current.shift() ?? null);
  }, []);

  const enqueue = useCallback(
    (job: DialogJob) => {
      queueRef.current.push(job);
      bump();
    },
    [bump],
  );

  useEffect(() => {
    if (active !== null) return;
    const next = queueRef.current.shift();
    if (next) setActive(next);
  }, [active]);

  const showAlert = useCallback(
    (message: string, title?: string) =>
      new Promise<void>((resolve) => {
        enqueue({ kind: "alert", message, title, resolve });
      }),
    [enqueue],
  );

  const showConfirm = useCallback(
    (message: string, title?: string) =>
      new Promise<boolean>((resolve) => {
        enqueue({ kind: "confirm", message, title, resolve });
      }),
    [enqueue],
  );

  useEffect(() => {
    registerAppDialogs({ showAlert, showConfirm });
    return () => registerAppDialogs(null);
  }, [showAlert, showConfirm]);

  const closeAlert = useCallback((): void => {
    const job = activeRef.current;
    if (job?.kind !== "alert") return;
    try {
      job.resolve();
    } finally {
      activeRef.current = null;
      setActive(null);
    }
  }, []);

  const finishConfirm = useCallback((ok: boolean): void => {
    const job = activeRef.current;
    if (job?.kind !== "confirm") return;
    try {
      job.resolve(ok);
    } finally {
      activeRef.current = null;
      setActive(null);
    }
  }, []);

  const onConfirmDialogYes = useCallback(() => finishConfirm(true), [finishConfirm]);
  const onConfirmDialogNo = useCallback(() => finishConfirm(false), [finishConfirm]);

  return (
    <>
      {children}
      {active?.kind === "alert" ? (
        <ConfirmDialog
          open
          variant="alert"
          title={active.title}
          message={active.message}
          onConfirm={closeAlert}
          onCancel={closeAlert}
        />
      ) : null}
      {active?.kind === "confirm" ? (
        <ConfirmDialog
          open
          variant="confirm"
          title={active.title}
          message={active.message}
          onConfirm={onConfirmDialogYes}
          onCancel={onConfirmDialogNo}
        />
      ) : null}
    </>
  );
}
