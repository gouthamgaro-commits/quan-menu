"use client";
import { useEffect, useState } from "react";
import { DEMO } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LangSwitch, useUi } from "./Ui";

/**
 * The email only contains a code once its template includes {{ .Token }}, and Supabase only
 * allows template edits with custom SMTP. Set NEXT_PUBLIC_LOGIN_CODE=1 after doing that.
 */
const CODE_LOGIN = process.env.NEXT_PUBLIC_LOGIN_CODE === "1";

const goToEditor = () => window.location.assign("/dashboard");

export default function LoginForm() {
  const { t } = useUi();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "checking">("idle");
  const [msg, setMsg] = useState<{ text: string; err?: boolean }>({ text: "" });

  // Came back from an expired or already-used email link.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "link") {
      setMsg({ text: t.errLinkExpired, err: true });
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
          <h1>{t.demoTitle}</h1>
          <p>{t.demoText}</p>
          <a className="btn primary" href="/dashboard">{t.demoOpen}</a>
        </div>
      </main>
    );
  }

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return send();
    setState("sending");
    setMsg({ text: "" });
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return goToEditor();
    setState("idle");
    setMsg({
      text: /invalid login/i.test(error.message)
        ? t.errWrongPw
        : /rate|too many/i.test(error.message) ? t.errTooManyTries : t.errSignIn,
      err: true,
    });
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim()) return setMsg({ text: t.errNeedEmail, err: true });
    setState("sending");
    setMsg({ text: "" });
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("idle");
      setMsg({ text: /rate|security purposes/i.test(error.message) ? t.errTooManyEmails : t.errSendEmail, err: true });
    } else setState("sent");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setMsg({ text: t.errNeedCode, err: true });
    setState("checking");
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token, type: "email" });
    if (error) {
      setState("sent");
      setMsg({ text: t.errBadCode, err: true });
    } else goToEditor();
  }

  return (
    <main className="page">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}><a className="logo" href="/">Quán<span>.</span></a><LangSwitch /></div>
        <h1>{t.loginTitle}</h1>
        {state === "sent" || state === "checking" ? (
          <>
            <p>{t.sentTo(email)}</p>
            <p><b>{t.clickLink}</b> {t.clickLinkMore}</p>
            {CODE_LOGIN && <form className="code-form" onSubmit={verify}>
              <label className="f" htmlFor="code">{t.orCode}
                <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={10}
                  value={code} onChange={(e) => setCode(e.target.value)} />
              </label>
              <button className="btn primary" disabled={state === "checking"}>{state === "checking" ? t.checking : t.signInCode}</button>
            </form>}
            <div className="row">
              <button className="btn" type="button" onClick={() => send()}>{t.sendAgain}</button>
              <button className="btn" type="button" onClick={() => { setState("idle"); setCode(""); setMsg({ text: "" }); }}>{t.otherEmail}</button>
            </div>
          </>
        ) : (
          <form className="code-form" onSubmit={withPassword}>
            <label className="f" htmlFor="email">{t.email}
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="f" htmlFor="password">{t.password}
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button className="btn primary" disabled={state === "sending" || !password}>{state === "sending" ? t.signingIn : t.signIn}</button>
            <div className="or"><span>{t.orLink}</span></div>
            <button className="btn" type="button" disabled={state === "sending"} onClick={() => send()}>{t.emailLink}</button>
            <small className="status">{t.loginTip}</small>
          </form>
        )}
        {msg.text && <p className={"status" + (msg.err ? " err" : "")} aria-live="polite">{msg.text}</p>}
      </div>
    </main>
  );
}
