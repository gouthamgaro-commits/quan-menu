import { LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import ActionForm from "@/components/admin/ActionForm";
import { login } from "../actions";

export const metadata: Metadata = { title: "Owner sign-in", robots: { index: false, follow: false } };

export default function Login() {
  const configured = !!process.env.ADMIN_PASSWORD;
  const dev = process.env.NODE_ENV !== "production";
  return (
    <main className="login-wrap">
      <div className="card login-card">
        <span className="logo-mark" style={{ width: 44, height: 44, borderRadius: 12 }}>
          <LockKeyhole size={20} aria-hidden />
        </span>
        <div className="stack-xs">
          <h1 style={{ fontSize: 24 }}>Owner sign-in</h1>
          <p className="muted small">Manage orders, projects and prices.</p>
        </div>
        {!configured && !dev ? (
          <p className="notice warn">Set ADMIN_PASSWORD in your hosting settings (Vercel → Settings → Environment Variables), then redeploy.</p>
        ) : (
          <ActionForm action={login} submit="Sign in" pendingLabel="Signing in…" buttonClass="btn btn-primary btn-block">
            <label className="field">
              <span>Password</span>
              <input className="input" type="password" name="password" required autoFocus autoComplete="current-password" />
            </label>
            {!configured && <p className="hint">Development: the password is “admin” until you set ADMIN_PASSWORD.</p>}
          </ActionForm>
        )}
      </div>
    </main>
  );
}
