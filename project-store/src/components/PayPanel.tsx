"use client";
import { CreditCard, ExternalLink, Smartphone } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { submitPayment } from "@/app/(store)/actions";
import { inr } from "@/lib/format";
import { paypalLink, upiLink } from "@/lib/links";
import CopyButton from "./CopyButton";

type Method = "upi" | "paypal" | "card";
type Props = {
  token: string;
  code: string;
  amount: number;
  label: string;
  upi?: { id: string; name: string } | null;
  paypal?: { user: string; amount: number; currency: string } | null;
  card?: { link: string; text: string } | null;
  approxText?: string;
  preferAbroad?: boolean;
};

/**
 * How to pay the amount due: UPI (QR code + app button) for India, PayPal or a card link for
 * everyone else. Then the student types the transaction reference so the owner can check it.
 */
export default function PayPanel({ token, code, amount, label, upi, paypal, card, approxText, preferAbroad }: Props) {
  const methods = [upi && "upi", paypal && "paypal", card && "card"].filter(Boolean) as Method[];
  const [tab, setTab] = useState<Method>(preferAbroad ? (methods.find((m) => m !== "upi") ?? methods[0]) : methods[0]);
  const [qr, setQr] = useState("");
  const [state, dispatch, pending] = useActionState(submitPayment, null);
  const link = upi ? upiLink({ upiId: upi.id, name: upi.name, amount, note: `Order ${code}` }) : "";

  useEffect(() => {
    if (!link || tab !== "upi") return;
    let live = true;
    import("qrcode")
      .then((QR) => QR.toDataURL(link, { width: 392, margin: 1, errorCorrectionLevel: "M" }))
      .then((url) => live && setQr(url))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [link, tab]);

  const names: Record<Method, string> = { upi: "UPI 🇮🇳", paypal: "PayPal 🌍", card: "card / other 💳" };

  return (
    <div className="stack">
      <div className="amount-due">
        <span className="small muted">{label}</span>
        <b>{inr(amount)}</b>
        {approxText && <span className="approx">{approxText}</span>}
      </div>
      {methods.length > 1 && (
        <div className="pay-tabs" role="tablist" aria-label="Payment method">
          {methods.map((m) => (
            <button key={m} type="button" role="tab" aria-selected={tab === m} className="pay-tab" onClick={() => setTab(m)}>
              {names[m]}
            </button>
          ))}
        </div>
      )}

      {tab === "upi" && upi && (
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
            <a href={link} className="btn btn-primary btn-lg">
              <Smartphone size={18} aria-hidden /> pay with a UPI app
            </a>
            <p className="small muted">On your phone, tap to open GPay, PhonePe, Paytm or your bank app. On a laptop, scan the QR with your phone.</p>
            <div className="row small">
              <span>
                UPI ID <b className="mono">{upi.id}</b>
              </span>
              <CopyButton text={upi.id} />
            </div>
            <p className="small muted">
              Paying by UPI ID? Enter {inr(amount)} and write <b className="mono">Order {code}</b> as the note.
            </p>
          </div>
        </div>
      )}

      {tab === "paypal" && paypal && (
        <div className="stack-sm">
          <a href={paypalLink(paypal.user, paypal.amount, paypal.currency)} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
            pay {paypal.amount.toLocaleString("en", { maximumFractionDigits: 2 })} {paypal.currency} with PayPal <ExternalLink size={16} aria-hidden />
          </a>
          <p className="small muted">
            That&apos;s {inr(amount)} converted at today&apos;s rate. Small differences from exchange rates are totally fine. Add “Order {code}” as the note.
          </p>
        </div>
      )}

      {tab === "card" && card && (
        <div className="stack-sm">
          {card.link && (
            <a href={card.link} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
              <CreditCard size={18} aria-hidden /> pay by card <ExternalLink size={16} aria-hidden />
            </a>
          )}
          {card.text && (
            <p className="small" style={{ whiteSpace: "pre-line" }}>
              {card.text}
            </p>
          )}
          <p className="small muted">
            Pay {inr(amount)}
            {approxText ? ` (${approxText})` : ""} and mention order <b className="mono">{code}</b>.
          </p>
        </div>
      )}

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
        <input type="hidden" name="method" value={tab === "card" ? "card" : tab} />
        <b>paid? drop the transaction ID 👇</b>
        <div className="grid-2">
          <label className="field">
            <span>Amount paid (₹)</span>
            <input className="input" name="amount" inputMode="numeric" required defaultValue={amount} maxLength={10} />
          </label>
          <label className="field">
            <span>{tab === "upi" ? "UPI transaction ID (UTR)" : "Transaction / reference ID"}</span>
            <input className="input mono" name="utr" required minLength={6} maxLength={40} placeholder={tab === "upi" ? "12-digit number" : "from your receipt"} autoComplete="off" />
          </label>
        </div>
        <span className="hint">
          {tab === "upi" ? "In your UPI app, open the payment: it's called “UPI Ref No.” or “UTR”." : "It's on the payment receipt or confirmation email."}
        </span>
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
            {pending ? "sending…" : "i've paid ✅"}
          </button>
        </div>
      </form>
    </div>
  );
}
