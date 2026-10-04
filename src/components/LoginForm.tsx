"use client";
import { useEffect, useState } from "react";
import { DEMO } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * The email only contains a code once its template includes {{ .Token }}, and Supabase only
 * allows template edits with custom SMTP. Set NEXT_PUBLIC_LOGIN_CODE=1 after doing that.
 */
const CODE_LOGIN = process.env.NEXT_PUBLIC_LOGIN_CODE === "1";

const goToEditor = () => window.location.assign("/dashboard");

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "checking">("idle");
  const [msg, setMsg] = useState<{ text: string; err?: boolean }>({ text: "" });

  // Came back from an expired or already-used email link.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "link") {
      setMsg({ text: "That sign-in link has expired or was already used, or it opened in a different browser. Send a new one below.", err: true });
    }
  }, []);

  // While waiting, notice when the email link signs this browser in from another tab, and move on by ourselves.
  useEffect(() => {
    if (state !== "sent" && state !== "checking") return;
    const sb = supabaseBrowser();
    let done = false;
    const check = async () => {
      if (done) return;
      const { data } = await sb.auth.getSession();
      if (data.session && !done) { done = true; goToEditor(); }
    };
    const timer = setInterval(check, 2500);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      done = true;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [state]);

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

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setState("sending");
    setMsg({ text: "" });
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("idle");
      setMsg({ text: /rate|security purposes/i.test(error.message) ? "Too many emails sent. Wait a few minutes and try again." : "Couldn't send the email. Check the address.", err: true });
    } else setState("sent");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setMsg({ text: "Enter the code from the email.", err: true });
    setState("checking");
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token, type: "email" });
    if (error) {
      setState("sent");
      setMsg({ text: "That code didn't work. It may have expired: send a new email and use the newest code.", err: true });
    } else goToEditor();
  }

  return (
    <main className="page">
      <div className="card">
        <a className="logo" href="/">Quán<span>.</span></a>
        <h1>Sign in to your stall</h1>
        {state === "sent" || state === "checking" ? (
          <>
            <p>We sent an email to <b>{email}</b>.</p>
            <p><b>Click the link in it.</b> This page will open your menu by itself once you&apos;re signed in, so you can keep it open.</p>
            {CODE_LOGIN && <form className="code-form" onSubmit={verify}>
              <label className="f" htmlFor="code">Or type the code from the email
                <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={10}
                  value={code} onChange={(e) => setCode(e.target.value)} />
              </label>
              <button className="btn primary" disabled={state === "checking"}>{state === "checking" ? "Checking…" : "Sign in with code"}</button>
            </form>}
            <div className="row">
              <button className="btn" type="button" onClick={() => send()}>Send again</button>
              <button className="btn" type="button" onClick={() => { setState("idle"); setCode(""); setMsg({ text: "" }); }}>Use a different email</button>
            </div>
          </>
        ) : (
          <form className="code-form" onSubmit={send}>
            <p>We&apos;ll email you a sign-in link. No password needed.</p>
            <label className="f" htmlFor="email">Email
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button className="btn primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a sign-in link"}</button>
          </form>
        )}
        {msg.text && <p className={"status" + (msg.err ? " err" : "")} aria-live="polite">{msg.text}</p>}
      </div>
    </main>
  );
}
