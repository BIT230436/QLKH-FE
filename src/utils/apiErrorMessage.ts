import { isAxiosError } from "axios";

/** Thông báo lỗi thân thiện cho UI (phân biệt timeout / mạng / HTTP). */
export function getHttpErrorMessage(err: unknown, fallback = "Đã xảy ra lỗi."): string {
  if (!isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback;
  }
  const code = err.code;
  if (code === "ECONNABORTED") {
    return "Hết thời gian chờ phản hồi. Kiểm tra kết nối hoặc thử lại.";
  }
  if (code === "ERR_NETWORK" || err.message === "Network Error") {
    return "Không kết nối được máy chủ. Kiểm tra API đang chạy và mạng.";
  }
  const msg = err.response?.data;
  if (msg && typeof msg === "object" && "message" in msg && typeof (msg as { message: unknown }).message === "string") {
    return (msg as { message: string }).message;
  }
  if (typeof err.response?.status === "number") {
    return `Lỗi máy chủ (${err.response.status}).`;
  }
  return fallback;
}
