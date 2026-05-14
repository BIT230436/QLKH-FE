import { useCallback, useEffect, useState } from "react";
import { clearStoredAuth, readStoredAuth } from "../store/authStorage";
import { fetchMe, logoutRemote } from "../services/authApi";

/** Auth state backed by JWT + optional bootstrap via `/api/auth/me`. */
export function useAuth(): {
  loggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
  logout: () => void;
  bootstrapping: boolean;
  userLabel: string;
  setUserLabel: (v: string) => void;
} {
  const [loggedIn, setLoggedIn] = useState(readStoredAuth);
  const [bootstrapping, setBootstrapping] = useState(readStoredAuth);
  const [userLabel, setUserLabel] = useState("");

  useEffect(() => {
    if (!readStoredAuth()) {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const u = await fetchMe();
        if (!cancelled) {
          setUserLabel(u.displayName || u.username);
          setLoggedIn(true);
        }
      } catch {
        if (!cancelled) {
          clearStoredAuth();
          setLoggedIn(false);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback((): void => {
    void logoutRemote();
    setLoggedIn(false);
    setUserLabel("");
  }, []);

  return { loggedIn, setLoggedIn, logout, bootstrapping, userLabel, setUserLabel };
}
