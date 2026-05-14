import { type ReactElement } from "react";
import { LoginScreen } from "../../components/auth/LoginScreen";

type Props = {
  onSuccess: (displayName: string) => void;
};

/** Trang đăng nhập — bọc `LoginScreen` theo cấu trúc `pages/Auth`. */
export function LoginPage({ onSuccess }: Props): ReactElement {
  return <LoginScreen onSuccess={onSuccess} />;
}
