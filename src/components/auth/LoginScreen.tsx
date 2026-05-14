import { useState, type FormEvent, type ReactElement } from "react";
import { IconBell, IconPackage } from "../icons/NavIcons";
import { login, requestForgotPassword, resetPasswordWithToken } from "../../services/authApi";
import { getHttpErrorMessage } from "../../utils/errors";
import {
  AUTH_PASSWORD_MAX_LEN,
  AUTH_USERNAME_MAX_LEN,
  countFormErrors,
  validateForgotForm,
  validateLoginForm,
  validateResetForm,
  type ForgotFormErrors,
  type LoginFormErrors,
  type ResetFormErrors,
} from "../../utils/authScreensValidation";

type View = "login" | "forgot" | "reset";

/** Ảnh minh họa kho — đặt tại `public/images/login-hero.png`. */
const LOGIN_HERO_URL = `${import.meta.env.BASE_URL}images/login-hero.png`;

type Props = {
  onSuccess: (displayName: string) => void;
};

function readResetTokenFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get("resetToken")?.trim() ?? "";
  } catch {
    return "";
  }
}

function clearResetTokenFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("resetToken");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
}

function initialAuthScreenState(): { view: View; token: string } {
  if (typeof window === "undefined") {
    return { view: "login", token: "" };
  }
  const token = readResetTokenFromUrl();
  return token ? { view: "reset", token } : { view: "login", token: "" };
}

function IconUserOutline(): ReactElement {
  return (
    <svg className="login-topbar-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.65" />
      <path
        d="M6 19.5v-.5a4 4 0 014-4h4a4 4 0 014 4v.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Giao diện đăng nhập — gọi API `/api/auth/login`.
 * Quên mật khẩu: `/api/auth/forgot-password`; đặt lại: `/api/auth/reset-password` + `?resetToken=…` trên SPA.
 * Validate theo trường (a11y: aria-invalid, aria-describedby) + giới hạn độ dài khớp BE/DB.
 */
export function LoginScreen({ onSuccess }: Props): ReactElement {
  const init = initialAuthScreenState();
  const [view, setView] = useState<View>(init.view);
  const [resetToken, setResetToken] = useState<string>(init.token);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginFieldErrors, setLoginFieldErrors] = useState<LoginFormErrors>({});
  const [forgotFieldErrors, setForgotFieldErrors] = useState<ForgotFormErrors>({});
  const [resetFieldErrors, setResetFieldErrors] = useState<ResetFormErrors>({});

  const [forgotUser, setForgotUser] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const loginErrCount = countFormErrors(loginFieldErrors);
  const resetErrCount = countFormErrors(resetFieldErrors);

  const submitLogin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fe = validateLoginForm(username, password);
    setLoginFieldErrors(fe);
    if (countFormErrors(fe) > 0) {
      return;
    }
    setLoading(true);
    try {
      const res = await login(username.trim(), password, remember);
      onSuccess(res.user.displayName || res.user.username);
    } catch {
      setError("Đăng nhập thất bại. Kiểm tra tài khoản hoặc kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fe = validateForgotForm(forgotUser);
    setForgotFieldErrors(fe);
    if (countFormErrors(fe) > 0) {
      return;
    }
    setLoading(true);
    try {
      const out = await requestForgotPassword(forgotUser.trim());
      setInfo(out.message);
      setForgotFieldErrors({});
    } catch (err) {
      setError(getHttpErrorMessage(err, "Không gửi được yêu cầu. Thử lại sau."));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fe = validateResetForm(Boolean(resetToken?.trim()), newPw, newPw2);
    setResetFieldErrors(fe);
    if (countFormErrors(fe) > 0) {
      return;
    }
    setLoading(true);
    try {
      const out = await resetPasswordWithToken(resetToken, newPw);
      setInfo(out.message);
      clearResetTokenFromUrl();
      setResetToken("");
      setNewPw("");
      setNewPw2("");
      setResetFieldErrors({});
      setView("login");
    } catch (err) {
      setError(getHttpErrorMessage(err, "Không đặt lại được mật khẩu."));
    } finally {
      setLoading(false);
    }
  };

  const title =
    view === "login"
      ? "Đăng nhập vào tài khoản"
      : view === "forgot"
        ? "Quên mật khẩu"
        : "Đặt lại mật khẩu";

  const titleSub =
    view === "login"
      ? "Đăng nhập để tiếp tục làm việc trên hệ thống."
      : view === "forgot"
        ? "Nhận liên kết đặt lại qua email đã gắn với tài khoản."
        : "Đặt mật khẩu mới an toàn, sau đó đăng nhập lại.";

  return (
    <div className="login-page">
      <header className="login-topbar">
        <div className="login-topbar-brand">
          <IconPackage className="login-topbar-brand-svg" />
          <span className="login-topbar-name">Công ty ABC</span>
        </div>
        <div className="login-topbar-actions">
          <span className="login-topbar-icon-btn" aria-hidden>
            <IconBell className="login-topbar-svg" />
          </span>
          <span className="login-topbar-icon-btn" aria-hidden>
            <IconUserOutline />
          </span>
        </div>
      </header>

      <div className="login-body">
        <div className="login-split-card">
          <div className="login-visual" aria-hidden>
            <div className="login-visual-hero-wrap">
              <img
                className="login-visual-hero-img"
                src={LOGIN_HERO_URL}
                alt=""
                width={800}
                height={520}
                decoding="async"
                fetchPriority="high"
              />
            </div>
            <div className="login-visual-top">
              <p className="login-visual-kicker">QLKH · Nội bộ</p>
              <p className="login-visual-headline">
                Kho &amp; xuất nhập
                <span className="login-visual-headline-accent"> trong một nền tảng</span>
              </p>
            </div>
            <div className="login-visual-bottom">
              <div className="login-visual-badge">ABC</div>
              <p className="login-visual-caption">Quản lý kho &amp; xuất nhập</p>
            </div>
          </div>

          <div className="login-form-panel">
            <div className="login-title-block">
              <h2 className="login-title">{title}</h2>
              <p className="login-title-sub">{titleSub}</p>
            </div>

            {error ? (
              <div className="login-banner" role="alert">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="login-banner login-banner--success" role="status">
                {info}
              </div>
            ) : null}

            {view === "login" ? (
              <form className="login-form" onSubmit={(ev) => void submitLogin(ev)} noValidate>
                {loginErrCount > 1 ? (
                  <p className="login-validation-summary" role="status">
                    Vui lòng sửa các trường được đánh dấu bên dưới.
                  </p>
                ) : null}
                <label
                  className={`login-field${loginFieldErrors.username ? " login-field--invalid" : ""}`}
                >
                  <span>Tên đăng nhập</span>
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    maxLength={AUTH_USERNAME_MAX_LEN}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setLoginFieldErrors((p) => ({ ...p, username: undefined }));
                    }}
                    placeholder="Nhập tên đăng nhập"
                    aria-invalid={loginFieldErrors.username ? true : undefined}
                    aria-describedby={loginFieldErrors.username ? "login-username-err" : undefined}
                  />
                  {loginFieldErrors.username ? (
                    <span id="login-username-err" className="login-field-error" role="alert">
                      {loginFieldErrors.username}
                    </span>
                  ) : null}
                </label>
                <label
                  className={`login-field${loginFieldErrors.password ? " login-field--invalid" : ""}`}
                >
                  <span>Mật khẩu</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    maxLength={AUTH_PASSWORD_MAX_LEN}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginFieldErrors((p) => ({ ...p, password: undefined }));
                    }}
                    placeholder="Nhập mật khẩu"
                    aria-invalid={loginFieldErrors.password ? true : undefined}
                    aria-describedby={loginFieldErrors.password ? "login-password-err" : undefined}
                  />
                  {loginFieldErrors.password ? (
                    <span id="login-password-err" className="login-field-error" role="alert">
                      {loginFieldErrors.password}
                    </span>
                  ) : null}
                </label>

                <div className="login-row">
                  <label className="login-check">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    <span>Ghi nhớ tôi</span>
                  </label>
                  <button
                    type="button"
                    className="login-link-btn"
                    onClick={() => {
                      setForgotUser(username);
                      setView("forgot");
                      setError(null);
                      setInfo(null);
                      setForgotFieldErrors({});
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? "Đang đăng nhập…" : "Đăng nhập"}
                </button>
              </form>
            ) : null}

            {view === "forgot" ? (
              <form className="login-form" onSubmit={(ev) => void submitForgot(ev)} noValidate>
                <p className="login-help">
                  Nhập tên đăng nhập. Nếu tài khoản có email đã đăng ký trên hệ thống, bạn sẽ nhận liên kết đặt lại mật
                  khẩu (hiệu lực 60 phút). Liên hệ quản trị nếu tài khoản chưa có email.
                </p>
                <label
                  className={`login-field${forgotFieldErrors.username ? " login-field--invalid" : ""}`}
                >
                  <span>Tên đăng nhập</span>
                  <input
                    type="text"
                    name="forgot-username"
                    autoComplete="username"
                    maxLength={AUTH_USERNAME_MAX_LEN}
                    value={forgotUser}
                    onChange={(e) => {
                      setForgotUser(e.target.value);
                      setForgotFieldErrors((p) => ({ ...p, username: undefined }));
                    }}
                    placeholder="Nhập tên đăng nhập"
                    aria-invalid={forgotFieldErrors.username ? true : undefined}
                    aria-describedby={forgotFieldErrors.username ? "forgot-username-err" : undefined}
                  />
                  {forgotFieldErrors.username ? (
                    <span id="forgot-username-err" className="login-field-error" role="alert">
                      {forgotFieldErrors.username}
                    </span>
                  ) : null}
                </label>
                <div className="login-row login-row--start">
                  <button
                    type="button"
                    className="login-text-btn"
                    onClick={() => {
                      setView("login");
                      setError(null);
                      setInfo(null);
                      setForgotFieldErrors({});
                    }}
                  >
                    ← Quay lại đăng nhập
                  </button>
                </div>
                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? "Đang gửi…" : "Gửi hướng dẫn"}
                </button>
              </form>
            ) : null}

            {view === "reset" ? (
              <form className="login-form" onSubmit={(ev) => void submitReset(ev)} noValidate>
                {resetErrCount > 1 ? (
                  <p className="login-validation-summary" role="status">
                    Vui lòng sửa các trường được đánh dấu bên dưới.
                  </p>
                ) : null}
                {resetFieldErrors.token ? (
                  <p id="reset-token-err" className="login-field-error login-field-error--banner" role="alert">
                    {resetFieldErrors.token}
                  </p>
                ) : null}
                <p className="login-help">Chọn mật khẩu mới (tối thiểu 8 ký tự, tối đa 128). Sau khi xong, đăng nhập lại.</p>
                <label
                  className={`login-field${resetFieldErrors.newPassword ? " login-field--invalid" : ""}`}
                >
                  <span>Mật khẩu mới</span>
                  <input
                    type="password"
                    name="new-password"
                    autoComplete="new-password"
                    maxLength={AUTH_PASSWORD_MAX_LEN}
                    value={newPw}
                    onChange={(e) => {
                      setNewPw(e.target.value);
                      setResetFieldErrors((p) => ({ ...p, newPassword: undefined }));
                    }}
                    placeholder="Nhập mật khẩu mới"
                    aria-invalid={resetFieldErrors.newPassword ? true : undefined}
                    aria-describedby={resetFieldErrors.newPassword ? "reset-new-err" : undefined}
                  />
                  {resetFieldErrors.newPassword ? (
                    <span id="reset-new-err" className="login-field-error" role="alert">
                      {resetFieldErrors.newPassword}
                    </span>
                  ) : null}
                </label>
                <label
                  className={`login-field${resetFieldErrors.confirmPassword ? " login-field--invalid" : ""}`}
                >
                  <span>Nhập lại mật khẩu</span>
                  <input
                    type="password"
                    name="new-password-confirm"
                    autoComplete="new-password"
                    maxLength={AUTH_PASSWORD_MAX_LEN}
                    value={newPw2}
                    onChange={(e) => {
                      setNewPw2(e.target.value);
                      setResetFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                    }}
                    placeholder="Nhập lại mật khẩu"
                    aria-invalid={resetFieldErrors.confirmPassword ? true : undefined}
                    aria-describedby={resetFieldErrors.confirmPassword ? "reset-confirm-err" : undefined}
                  />
                  {resetFieldErrors.confirmPassword ? (
                    <span id="reset-confirm-err" className="login-field-error" role="alert">
                      {resetFieldErrors.confirmPassword}
                    </span>
                  ) : null}
                </label>
                <div className="login-row login-row--start">
                  <button
                    type="button"
                    className="login-text-btn"
                    onClick={() => {
                      clearResetTokenFromUrl();
                      setResetToken("");
                      setView("login");
                      setError(null);
                      setInfo(null);
                      setResetFieldErrors({});
                    }}
                  >
                    ← Quay lại đăng nhập
                  </button>
                </div>
                <button type="submit" className="login-submit" disabled={loading || !resetToken}>
                  {loading ? "Đang cập nhật…" : "Đặt lại mật khẩu"}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
