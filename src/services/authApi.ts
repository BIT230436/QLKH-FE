import { http } from "./http";
import { clearStoredAuth, persistAuthRemember, persistAuthSession, readRefreshToken } from "../store/authStorage";

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  permissions: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
};

export async function login(username: string, password: string, remember: boolean): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>("/api/auth/login", { username, password });
  if (remember) {
    persistAuthRemember(data.accessToken, data.refreshToken);
  } else {
    persistAuthSession(data.accessToken, data.refreshToken);
  }
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await http.get<{ user: AuthUser }>("/api/auth/me");
  return data.user;
}

export async function logoutRemote(): Promise<void> {
  const rt = readRefreshToken();
  try {
    if (rt) {
      await http.post("/api/auth/logout", { refreshToken: rt });
    }
  } catch {
    /* still clear local */
  }
  clearStoredAuth();
}

/** Yêu cầu email đặt lại mật khẩu — thông điệp luôn chung (an toàn). */
export async function requestForgotPassword(username: string): Promise<{ message: string }> {
  const { data } = await http.post<{ message: string }>("/api/auth/forgot-password", { username });
  return data;
}

/** Đặt lại mật khẩu bằng token từ liên kết email. */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ message: string }> {
  const { data } = await http.post<{ message: string; ok?: boolean }>("/api/auth/reset-password", {
    token,
    newPassword,
  });
  return data;
}
