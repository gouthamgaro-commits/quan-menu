"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";
import { supabaseBrowser } from "@/lib/supabase/client";

interface Props {
  email: string;
  /** The vendor's public menu address, when it is live. */
  liveSlug?: string;
  /** Hide the "My menu" link on the dashboard itself. */
  onDashboard?: boolean;
}

/** Signed-in badge with the vendor's email, quick links and sign-out. */
export default function AccountMenu({ email, liveSlug, onDashboard }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ a: "", b: "" });
  const [pwMsg, setPwMsg] = useState<{ text: string; err?: boolean }>({ text: "" });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.a.length < 8) return setPwMsg({ text: "Use at least 8 characters.", err: true });
    if (pw.a !== pw.b) return setPwMsg({ text: "The two passwords don't match.", err: true });
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw.a });
    setBusy(false);
    if (error) {
      setPwMsg({
        text: /same|different from the old/i.test(error.message) ? "That's already your password." : /weak|short|characters/i.test(error.message) ? error.message : "Couldn't save the password. Sign out, sign in with the email link, and try again.",
        err: true,
      });
    } else {
      setPw({ a: "", b: "" });
      setPwMsg({ text: "Password saved. Next time, sign in with your email and password." });
    }
  }

  async function out() {
    setLeaving(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  const initial = (email.trim()[0] || "?").toUpperCase();
  return (
    <div className="acct" ref={box}>
      <button className="acct-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} title={email}>
        <span className="acct-dot" aria-hidden>{initial}</span>
        <span className="acct-mail">{email}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="acct-pop" role="menu">
          <div className="acct-head">
            <small>Signed in as</small>
            <b>{email}</b>
          </div>
          {!onDashboard && <a role="menuitem" href="/dashboard">My menu editor</a>}
          <button role="menuitem" aria-expanded={pwOpen} onClick={() => { setPwOpen(!pwOpen); setPwMsg({ text: "" }); }}>Set or change password</button>
          {pwOpen && (
            <form className="acct-pw" onSubmit={savePassword}>
              <input type="email" value={email} autoComplete="username" readOnly hidden />
              <input type="password" placeholder="New password (8+ characters)" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} />
              <input type="password" placeholder="Type it again" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
              <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
              {pwMsg.text && <small className={"status" + (pwMsg.err ? " err" : " good")}>{pwMsg.text}</small>}
            </form>
          )}
          {liveSlug && <a role="menuitem" href={`/m/${liveSlug}`} target="_blank" rel="noreferrer">View public menu ↗</a>}
          <button role="menuitem" onClick={out} disabled={leaving}>{leaving ? "Signing out…" : "Sign out"}</button>
        </div>
      )}
    </div>
  );
}
