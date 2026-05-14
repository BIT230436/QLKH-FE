import { useState, type ReactElement } from "react";
import { AppDialogsProvider } from "./components/common/AppDialogsProvider";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/Auth/LoginPage";
import { InventoryPages, type AppPage } from "./pages/inventory/InventoryPages";

export default function App(): ReactElement {
  const { loggedIn, setLoggedIn, logout: clearAuth, bootstrapping, userLabel, setUserLabel } = useAuth();
  const [page, setPage] = useState<AppPage>("home");

  const handleLoginSuccess = (displayName: string): void => {
    setUserLabel(displayName);
    setLoggedIn(true);
    setPage("home");
  };

  const handleLogout = (): void => {
    clearAuth();
    setPage("home");
  };

  if (bootstrapping) {
    return (
      <AppDialogsProvider>
        <div className="login-page" style={{ alignItems: "center", justifyContent: "center" }}>
          <p className="login-brand-sub">Đang tải phiên đăng nhập…</p>
        </div>
      </AppDialogsProvider>
    );
  }

  if (!loggedIn) {
    return (
      <AppDialogsProvider>
        <LoginPage onSuccess={handleLoginSuccess} />
      </AppDialogsProvider>
    );
  }

  return (
    <AppDialogsProvider>
      <InventoryPages page={page} setPage={setPage} onLogout={handleLogout} userLabel={userLabel} />
    </AppDialogsProvider>
  );
}
