import { Suspense } from "react";
import InvoicingLoginPage from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="inv-login-shell">Loading...</div>}>
      <InvoicingLoginPage />
    </Suspense>
  );
}
