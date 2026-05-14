/** Token storage for API auth — session vs local based on "remember me". */

const ACCESS = "inventory_access_token";
const REFRESH = "inventory_refresh_token";

function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function localGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readAccessToken(): string | null {
  return sessionGet(ACCESS) ?? localGet(ACCESS);
}

export function readRefreshToken(): string | null {
  return sessionGet(REFRESH) ?? localGet(REFRESH);
}

export function clearStoredAuth(): void {
  try {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  } catch {
    /* ignore */
  }
}

export function persistAuthSession(accessToken: string, refreshToken: string): void {
  try {
    sessionStorage.setItem(ACCESS, accessToken);
    sessionStorage.setItem(REFRESH, refreshToken);
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  } catch {
    /* ignore */
  }
}

export function persistAuthRemember(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(ACCESS, accessToken);
    localStorage.setItem(REFRESH, refreshToken);
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
  } catch {
    /* ignore */
  }
}

export function readStoredAuth(): boolean {
  return Boolean(readAccessToken()?.trim());
}
