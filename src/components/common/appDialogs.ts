/** Cổng gọi hộp thoại hệ thống — được gán bởi `AppDialogsProvider`. */
type DialogSink = {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
};

let sink: DialogSink | null = null;

/** Gọi từ `AppDialogsProvider` (mount/unmount). */
export function registerAppDialogs(next: DialogSink | null): void {
  sink = next;
}

/** Thông báo một nút « Đóng » (giao diện nội bộ, không dùng `window.alert`). */
export function appAlert(message: string, options?: { title?: string }): Promise<void> {
  if (!sink) {
    console.warn("[appDialogs] AppDialogsProvider chưa gắn — bỏ qua thông báo:", message);
    return Promise.resolve();
  }
  return sink.showAlert(message, options?.title);
}

/** Xác nhận hai nút « Đồng ý » / « Hủy » — trả `true` khi đồng ý. */
export function appConfirm(message: string, options?: { title?: string }): Promise<boolean> {
  if (!sink) {
    console.warn("[appDialogs] AppDialogsProvider chưa gắn — coi như Hủy:", message);
    return Promise.resolve(false);
  }
  return sink.showConfirm(message, options?.title);
}
