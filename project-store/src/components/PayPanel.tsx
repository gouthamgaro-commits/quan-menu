"use client";
import { Smartphone } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { submitPayment } from "@/app/(store)/actions";
import { inr } from "@/lib/format";
import { upiLink } from "@/lib/links";
import CopyButton from "./CopyButton";

type Props = { token: string; code: string; upiId: string; upiName: string; amount: number; label: string };

/** UPI QR code + "open my UPI app" button for the exact amount due, then the box to report the payment. */
export default function PayPanel({ token, code, upiId, upiName, amount, label }: Props) {
  const link = upiLink({ upiId, name: upiName, amount, note: `Order ${code}` });
  const [qr, setQr] = useState("");
  const [state, dispatch, pending] = useActionState(submitPayment, null);

  useEffect(() => {
    let live = true;
    import("qrcode")
      .then((QR) => QR.toDataURL(link, { width: 392, margin: 1, errorCorrectionLevel: "M" }))
      .then((url) => live && setQr(url))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [link]);

  return (
    <div className="stack">
      <div className="pay-grid">
        <div className="qr">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} width={196} height={196} alt={`UPI QR code to pay ${inr(amount)}`} />
          ) : (
            <div className="qr-blank" role="img" aria-label="UPI QR code loading" />
          )}
        </div>
        <div className="stack-sm">
          <div className="amount-due">
            <span className="small muted">{label}</span>
            <b>{inr(amount)}</b>
          </div>
          <a href={link} className="btn btn-primary btn-lg">
            <Smartphone size={18} aria-hidden /> Pay with a UPI app
          </a>
          <p className="small muted">
            On your phone, tap the button to open GPay, PhonePe, Paytm or your bank app. On a computer, scan the QR code with your
            phone.
          </p>
          <div className="row small">
            <span>
              UPI ID <b className="mono">{upiId}</b>
            </span>
            <CopyButton text={upiId} />
          </div>
          <p className="small muted">
            Paying by UPI ID? Enter {inr(amount)} and write <b className="mono">Order {code}</b> as the note.
          </p>
        </div>
      </div>

      <form
        className="card card-pad stack-sm"
        style={{ boxShadow: "none", background: "var(--surface-2)" }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
      >
        <input type="hidden" name="token" value={token} />
        <b>Paid? Tell us the transaction ID</b>
        <div className="grid-2">
          <label className="field">
            <span>Amount paid</span>
            <input className="input" name="amount" inputMode="numeric" required defaultValue={amount} maxLength={10} />
          </label>
          <label className="field">
            <span>UPI transaction ID (UTR)</span>
            <input className="input mono" name="utr" required minLength={6} maxLength={40} placeholder="12-digit number" autoComplete="off" />
          </label>
        </div>
        <span className="hint">Find it in your UPI app under the payment's details, often called “UPI Ref No.” or “UTR”.</span>
        {state?.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="notice ok" role="status">
            {state.ok}
          </p>
        )}
        <div>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Sending…" : "I've paid"}
          </button>
        </div>
      </form>
    </div>
  );
}
