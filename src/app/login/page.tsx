"use client";
import { useState } from "react";
import { DEMO } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  if (DEMO) {
    return (
      <main className="page">
        <div className="card">
          <h1>Demo mode</h1>
          <p>Login is off because Supabase isn&apos;t configured. Your menu is kept in this browser.</p>
          <a className="btn primary" href="/dashboard">Open the menu editor</a>
        </div>
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
      setMsg(error.message.includes("rate") ? "Too many tries. Wait a minute and try again." : "Couldn't send the link. Check the email address.");
    } else setState("sent");
  }

  return (
    <main className="page">
      <form className="card" onSubmit={submit}>
        <a className="logo" href="/">Quán<span>.</span></a>
        <h1>Sign in to your stall</h1>
        {state === "sent" ? (
          <p>Check <b>{email}</b> for a sign-in link. You can close this tab.</p>
        ) : (
          <>
            <p>We&apos;ll email you a link. No password needed.</p>
            <label className="f" htmlFor="email">Email
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button className="btn primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a sign-in link"}</button>
            {state === "error" && <p className="status err">{msg}</p>}
          </>
        )}
      </form>
    </main>
  );
}
