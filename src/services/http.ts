import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { readAccessToken, readRefreshToken, clearStoredAuth, persistAuthRemember, persistAuthSession } from "../store/authStorage";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

/** Shared Axios instance — in dev prefer empty baseURL so Vite proxy handles `/api`. */
export const http = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Client dùng cho upload multipart (ảnh đính kèm, v.v.) — timeout dài hơn gọi JSON thông thường.
 * Chưa có API multipart thì module gọi JSON vẫn dùng `http`.
 */
export const httpUpload = axios.create({
  baseURL,
  timeout: 120_000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const rt = readRefreshToken();
  if (!rt) return null;
  const remember =
    typeof window !== "undefined" &&
    (() => {
      try {
        return localStorage.getItem("inventory_refresh_token") === rt;
      } catch {
        return false;
      }
    })();
  const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
    `${baseURL}/api/auth/refresh`,
    { refreshToken: rt },
    { headers: { "Content-Type": "application/json" }, timeout: 30_000 }
  );
  if (remember) {
    persistAuthRemember(data.accessToken, data.refreshToken);
  } else {
    persistAuthSession(data.accessToken, data.refreshToken);
  }
  return data.accessToken;
}

function attachHttpInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const token = readAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const orig = error.config as RetryConfig | undefined;
      if (!orig || orig._retry || status !== 401) {
        return Promise.reject(error);
      }
      const url = orig.url ?? "";
      if (url.includes("/api/auth/login") || url.includes("/api/auth/refresh") || url.includes("/api/auth/forgot-password") || url.includes("/api/auth/reset-password")) {
        return Promise.reject(error);
      }
      orig._retry = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshAccessToken().finally(() => {
            refreshInFlight = null;
          });
        }
        const newAccess = await refreshInFlight;
        if (!newAccess) {
          clearStoredAuth();
          return Promise.reject(error);
        }
        orig.headers.Authorization = `Bearer ${newAccess}`;
        return instance(orig);
      } catch {
        clearStoredAuth();
        return Promise.reject(error);
      }
    }
  );
}

attachHttpInterceptors(http);
attachHttpInterceptors(httpUpload);
