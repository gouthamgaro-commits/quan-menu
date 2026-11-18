"use client";
import { CircleAlert, Clock, HandCoins, Rocket } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import { placeOrder } from "@/app/(store)/actions";
import { approx, inr } from "@/lib/format";
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
  fx?: { code: string; rate: number } | null;
};

export default function OrderForm({ project, addons, advancePercent, today, negotiable, minOfferPercent, startWithOffer, fx = null }: Props) {
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
              <span className="n">{++n}</span> your price 💸
            </h2>
            <div className="mode-choice">
              <label className="choice">
                <input type="radio" name="pricing" checked={!offering} onChange={() => setMode("list")} />
                <span className="row" style={{ gap: 8 }}>
                  <Rocket size={18} aria-hidden /> <b>lock it in at the listed price</b>
                </span>
                <span className="big">{inr(total)}</span>
                {fx && <span className="approx">{approx(total, fx)}</span>}
                <small>We start cooking as soon as the advance lands.</small>
              </label>
              <label className="choice offer">
                <input type="radio" name="pricing" checked={offering} onChange={() => setMode("offer")} />
                <span className="row" style={{ gap: 8 }}>
                  <HandCoins size={18} aria-hidden /> <b>shoot your shot 🎯</b>
                </span>
                <span className="big">your price</span>
                <small>Tell us what you can pay. We reply in your order chat, usually within a few hours.</small>
              </label>
            </div>
            {offering && (
              <div className="grid-2">
                <label className="field">
                  <span>your offer (₹)</span>
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
                    {fx && offer > 0 ? ` Your offer ${approx(offer, fx)}.` : ""}
                  </span>
                </label>
                <label className="field">
                  <span>
                    a note with your offer <em>(optional)</em>
                  </span>
                  <textarea className="textarea" name="message" rows={3} maxLength={1000} placeholder="e.g. we're 3 broke students and this is our combined budget 😭" style={{ minHeight: 0 }} />
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
              <span className="n">{++n}</span> extras ✨ <span className="muted small">(optional)</span>
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
            <span className="n">{++n}</span> deadline? ⏰
          </h2>
          <label className="field" style={{ maxWidth: 260 }}>
            <span>
              submission date <em>(optional)</em>
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
            <span className="n">{++n}</span> about you 👋
          </h2>
          <ContactFields defaultBranch={project.branch} />
          <label className="field">
            <span>
              any changes? <em>(optional)</em>
            </span>
            <textarea
              className="textarea"
              name="notes"
              maxLength={2000}
              placeholder="e.g. add an admin login, use MySQL instead of SQLite, my college needs a 60-page report…"
            />
            <span className="hint">Changes beyond the listed features may change the price. We'll agree it with you first.</span>
          </label>
        </section>
      </div>

      <aside className="form-side stack">
        <div className="card form-card" style={{ background: "#fffbe9" }}>
          <div className="stack-xs">
            <span className="sticker lime" style={{ fontSize: 12 }}>your order 🧾</span>
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
                <span>your offer 🎯</span>
                <span>{offer > 0 ? inr(Math.min(offer, total)) : "—"}</span>
              </div>
            ) : (
              <div className="line total">
                <span>total</span>
                <span>
                  {inr(total)}
                  {fx && <span className="approx" style={{ display: "block", textAlign: "right" }}>{approx(total, fx)}</span>}
                </span>
              </div>
            )}
            <div className="line due">
              <span>{offering ? "if accepted, pay to start" : "pay now to start"} ({advancePercent}%)</span>
              <span>{offering && !offer ? "—" : inr(advance)}</span>
            </div>
          </div>
          <label className="check-plain small">
            <input type="checkbox" name="agree" value="1" required />
            <span>
              I&apos;m cool with the{" "}
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
            {pending ? "sending…" : offering ? "send my offer 🎯" : "lock it in 🔒"}
          </button>
          <p className="tiny muted center">
            {offering ? "No payment now. You only pay once we agree on the price." : "You'll see how to pay (UPI, PayPal or card) on the next screen."}
          </p>
        </div>
      </aside>

      <div className="mobile-total">
        <span className="stack-xs">
          <span className="tiny muted">{offering ? "your offer 🎯" : `total · pay ${inr(advance)} now`}</span>
          <b>{offering ? (offer > 0 ? inr(Math.min(offer, total)) : "—") : inr(total)}</b>
        </span>
        <button className={`btn ${offering ? "btn-offer" : "btn-primary"}`} type="submit" disabled={pending}>
          {pending ? "sending…" : offering ? "send offer 🎯" : "lock it in 🔒"}
        </button>
      </div>
    </form>
  );
}
