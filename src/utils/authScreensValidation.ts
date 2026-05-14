/** Giới hạn khớp schema `users.username` (VARCHAR 100) và mật khẩu reset phía BE (tối đa 128). */
export const AUTH_USERNAME_MAX_LEN = 100;
export const AUTH_PASSWORD_MAX_LEN = 128;

export type LoginFormErrors = {
  username?: string;
  password?: string;
};

export type ForgotFormErrors = {
  username?: string;
};

export type ResetFormErrors = {
  token?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/**
 * Tên đăng nhập: không khoảng trắng đầu/cuối, độ dài, ký tự hợp lệ (chữ/số Unicode, `. _ -`).
 * Dùng chung đăng nhập và quên mật khẩu.
 */
export function validateAuthUsername(raw: string): string | undefined {
  if (raw.length === 0) {
    return "Vui lòng nhập tên đăng nhập.";
  }
  if (raw !== raw.trimStart()) {
    return "Không nhập khoảng trắng phía đầu tên đăng nhập.";
  }
  if (raw !== raw.trimEnd()) {
    return "Không nhập khoảng trắng phía cuối tên đăng nhập.";
  }
  const u = raw;
  if (u.length > AUTH_USERNAME_MAX_LEN) {
    return `Tên đăng nhập tối đa ${AUTH_USERNAME_MAX_LEN} ký tự.`;
  }
  if (!/^[\p{L}\p{N}._-]+$/u.test(u)) {
    return "Tên đăng nhập chỉ gồm chữ, số, dấu chấm (.), gạch dưới (_) và gạch ngang (-).";
  }
  return undefined;
}

/** Mật khẩu đăng nhập: bắt buộc + giới hạn độ dài (không trim — tránh đổi ý nghĩa mật khẩu). */
export function validateLoginPassword(password: string): string | undefined {
  if (password.length === 0) {
    return "Vui lòng nhập mật khẩu.";
  }
  if (password.length > AUTH_PASSWORD_MAX_LEN) {
    return `Mật khẩu tối đa ${AUTH_PASSWORD_MAX_LEN} ký tự.`;
  }
  return undefined;
}

export function validateLoginForm(usernameRaw: string, password: string): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const uErr = validateAuthUsername(usernameRaw);
  if (uErr) errors.username = uErr;
  const pErr = validateLoginPassword(password);
  if (pErr) errors.password = pErr;
  return errors;
}

export function validateForgotForm(usernameRaw: string): ForgotFormErrors {
  const errors: ForgotFormErrors = {};
  const uErr = validateAuthUsername(usernameRaw);
  if (uErr) errors.username = uErr;
  return errors;
}

/**
 * Mật khẩu đặt lại — khớp `validateNewPasswordPlain` phía BE (8–128 ký tự).
 */
export function validateResetNewPassword(pw: string): string | undefined {
  if (pw.length === 0) {
    return "Vui lòng nhập mật khẩu mới.";
  }
  if (pw.length < 8) {
    return "Mật khẩu mới tối thiểu 8 ký tự.";
  }
  if (pw.length > AUTH_PASSWORD_MAX_LEN) {
    return `Mật khẩu tối đa ${AUTH_PASSWORD_MAX_LEN} ký tự.`;
  }
  if (/^\s+$/.test(pw)) {
    return "Mật khẩu không được chỉ gồm khoảng trắng.";
  }
  return undefined;
}

export function validateResetConfirm(pw: string, confirm: string): string | undefined {
  if (confirm.length === 0) {
    return "Vui lòng nhập lại mật khẩu.";
  }
  if (pw !== confirm) {
    return "Hai lần nhập mật khẩu không khớp.";
  }
  return undefined;
}

export function validateResetForm(hasToken: boolean, newPw: string, newPw2: string): ResetFormErrors {
  const errors: ResetFormErrors = {};
  if (!hasToken) {
    errors.token = "Thiếu mã từ liên kết. Hãy mở lại đường dẫn trong email hoặc yêu cầu gửi lại.";
  }
  const nErr = validateResetNewPassword(newPw);
  if (nErr) errors.newPassword = nErr;
  const cErr = validateResetConfirm(newPw, newPw2);
  if (cErr) errors.confirmPassword = cErr;
  return errors;
}

export function countFormErrors<T extends Record<string, string | undefined>>(obj: T): number {
  return Object.values(obj).filter((v) => v != null && v.length > 0).length;
}
