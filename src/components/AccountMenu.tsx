"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";

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
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  async function out() {
    setBusy(true);
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
          {liveSlug && <a role="menuitem" href={`/m/${liveSlug}`} target="_blank" rel="noreferrer">View public menu ↗</a>}
          <button role="menuitem" onClick={out} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>
        </div>
      )}
    </div>
  );
}
