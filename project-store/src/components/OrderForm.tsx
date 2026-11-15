"use client";
import { CircleAlert, Clock, HandCoins, Rocket } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import { placeOrder } from "@/app/(store)/actions";
import { inr } from "@/lib/format";
import { advanceFor, daysUntil, minOffer } from "@/lib/pricing";
import type { Addon } from "@/lib/settings";
import ContactFields from "./ContactFields";

type Props = {
  project: { slug: string; title: string; price: number; deliveryDays: number; branch: string };
  addons: Addon[];
  advancePercent: number;
  today: string;
  negotiable: boolean;
  minOfferPercent: number;
  startWithOffer: boolean;
};

export default function OrderForm({ project, addons, advancePercent, today, negotiable, minOfferPercent, startWithOffer }: Props) {
  const [state, dispatch, pending] = useActionState(placeOrder, null);
  const [picked, setPicked] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [mode, setMode] = useState<"list" | "offer">(negotiable && startWithOffer ? "offer" : "list");
  const [offerText, setOfferText] = useState("");

  const chosen = addons.filter((a) => picked.includes(a.id));
  const total = project.price + chosen.reduce((s, a) => s + a.price, 0);
  const offer = Number(offerText.replace(/[^\d]/g, "")) || 0;
  const offering = mode === "offer";
  const floor = minOffer(total, minOfferPercent);
  const agreed = offering && offer > 0 ? Math.min(offer, total) : total;
  const advance = advanceFor(agreed, advancePercent);
  const days = useMemo(() => daysUntil(deadline, today), [deadline, today]);
  const tight = days != null && days < project.deliveryDays;
  let n = 0;

  return (
    <form
      id="order-form"
      className="form-layout"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <input type="hidden" name="slug" value={project.slug} />
      <input type="hidden" name="mode" value={mode} />
      <div className="stack">
        {negotiable && (
          <section className="card form-card">
            <h2>
              <span className="n">{++n}</span> Your price
            </h2>
            <div className="mode-choice">
              <label className="choice">
                <input type="radio" name="pricing" checked={!offering} onChange={() => setMode("list")} />
                <span className="row" style={{ gap: 8 }}>
                  <Rocket size={18} aria-hidden /> <b>Order at the listed price</b>
                </span>
                <span className="big">{inr(total)}</span>
                <small>We start as soon as the advance is paid.</small>
              </label>
              <label className="choice offer">
                <input type="radio" name="pricing" checked={offering} onChange={() => setMode("offer")} />
                <span className="row" style={{ gap: 8 }}>
                  <HandCoins size={18} aria-hidden /> <b>Make an offer</b>
                </span>
                <span className="big warm-text">Your price</span>
                <small>Tell us what you can pay. We reply on your order page, usually within a few hours.</small>
              </label>
            </div>
            {offering && (
              <div className="grid-2">
                <label className="field">
                  <span>Your offer</span>
                  <span className="money-input">
                    <span>₹</span>
                    <input
                      className="input"
                      name="offer"
                      inputMode="numeric"
                      required
                      maxLength={9}
                      value={offerText}
                      onChange={(e) => setOfferText(e.target.value)}
                      placeholder={String(Math.round((total * 0.85) / 500) * 500)}
                      autoFocus={startWithOffer}
                    />
                  </span>
                  <span className="hint">
                    Listed at {inr(total)}.{floor ? ` We consider offers from ${inr(floor)}.` : ""}
                  </span>
                </label>
                <label className="field">
                  <span>
                    A note with your offer <em>(optional)</em>
                  </span>
                  <textarea className="textarea" name="message" rows={3} maxLength={1000} placeholder="E.g. We're a team of 3 and this is our combined budget." style={{ minHeight: 0 }} />
                </label>
              </div>
            )}
            {offering && offer > 0 && floor > 0 && offer < floor && (
              <div className="notice warn" role="status">
                <CircleAlert size={18} aria-hidden />
                <span>That's below what we can do for this project. Offers from {inr(floor)} are considered.</span>
              </div>
            )}
          </section>
        )}

        {addons.length > 0 && (
          <section className="card form-card">
            <h2>
              <span className="n">{++n}</span> Extras <span className="muted small">(optional)</span>
            </h2>
            <div className="choices">
              {addons.map((a) => (
                <label key={a.id} className="check">
                  <input
                    type="checkbox"
                    name="addons"
                    value={a.id}
                    checked={picked.includes(a.id)}
                    onChange={(e) => setPicked((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))}
                  />
                  <span className="grow">
                    <b>{a.name}</b>
                  </span>
                  <b className="nowrap">+{inr(a.price)}</b>
                </label>
              ))}
            </div>
          </section>
        )}

        <section className="card form-card">
          <h2>
            <span className="n">{++n}</span> When do you need it?
          </h2>
          <label className="field" style={{ maxWidth: 260 }}>
            <span>
              Submission date <em>(optional)</em>
            </span>
            <input className="input" type="date" name="deadline" min={today} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
          <p className="small muted row" style={{ gap: 6 }}>
            <Clock size={15} aria-hidden /> Usually ready {project.deliveryDays} days after the advance.
          </p>
          {tight && (
            <div className="notice warn" role="status">
              <CircleAlert size={18} aria-hidden />
              <span>
                That's sooner than our usual {project.deliveryDays} days. We'll tell you if we can make it
                {addons.some((a) => a.id === "priority") ? ", or add priority delivery above" : ""}.
              </span>
            </div>
          )}
        </section>

        <section className="card form-card">
          <h2>
            <span className="n">{++n}</span> Your details
          </h2>
          <ContactFields defaultBranch={project.branch} />
          <label className="field">
            <span>
              Anything to change? <em>(optional)</em>
            </span>
            <textarea
              className="textarea"
              name="notes"
              maxLength={2000}
              placeholder="E.g. add an admin login, use MySQL instead of SQLite, our college needs a 60-page report…"
            />
            <span className="hint">Changes beyond the listed features may change the price. We'll agree it with you first.</span>
          </label>
        </section>
      </div>

      <aside className="form-side stack">
        <div className="card form-card glow">
          <div className="stack-xs">
            <span className="eyebrow">Your order</span>
            <b>{project.title}</b>
          </div>
          <div className="lines">
            <div className={`line ${offering && offer > 0 && offer < total ? "strike" : ""}`}>
              <span>Listed price</span>
              <span>{inr(project.price)}</span>
            </div>
            {chosen.map((a) => (
              <div key={a.id} className={`line ${offering && offer > 0 && offer < total ? "strike" : ""}`}>
                <span>{a.name}</span>
                <span>+{inr(a.price)}</span>
              </div>
            ))}
            {offering ? (
              <div className="line total">
                <span>Your offer</span>
                <span className="warm-text">{offer > 0 ? inr(Math.min(offer, total)) : "—"}</span>
              </div>
            ) : (
              <div className="line total">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
            )}
            <div className="line due">
              <span>{offering ? "If accepted, pay to start" : "Pay now to start"} ({advancePercent}%)</span>
              <span>{offering && !offer ? "—" : inr(advance)}</span>
            </div>
          </div>
          <label className="check-plain small">
            <input type="checkbox" name="agree" value="1" required />
            <span>
              I accept the{" "}
              <Link href="/policies" target="_blank">
                payment & refund policy
              </Link>
            </span>
          </label>
          {state?.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
          <button className={`btn btn-lg btn-block ${offering ? "btn-offer" : "btn-primary"}`} type="submit" disabled={pending}>
            {pending ? "Sending…" : offering ? "Send my offer" : "Place order"}
          </button>
          <p className="tiny muted center">
            {offering ? "No payment now. You pay only after we agree on the price." : "You'll see the UPI payment details on the next screen."}
          </p>
        </div>
      </aside>

      <div className="mobile-total">
        <span className="stack-xs">
          <span className="tiny muted">{offering ? "Your offer" : `Total · pay ${inr(advance)} now`}</span>
          <b>{offering ? (offer > 0 ? inr(Math.min(offer, total)) : "—") : inr(total)}</b>
        </span>
        <button className={`btn ${offering ? "btn-offer" : "btn-primary"}`} type="submit" disabled={pending}>
          {pending ? "Sending…" : offering ? "Send offer" : "Place order"}
        </button>
      </div>
    </form>
  );
}
