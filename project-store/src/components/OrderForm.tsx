"use client";
import { CircleAlert, Clock } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import { placeOrder } from "@/app/(store)/actions";
import { inr } from "@/lib/format";
import { advanceFor, daysUntil } from "@/lib/pricing";
import type { Addon } from "@/lib/settings";
import ContactFields from "./ContactFields";

type Props = {
  project: { slug: string; title: string; price: number; deliveryDays: number; branch: string };
  addons: Addon[];
  advancePercent: number;
  today: string;
};

export default function OrderForm({ project, addons, advancePercent, today }: Props) {
  const [state, dispatch, pending] = useActionState(placeOrder, null);
  const [picked, setPicked] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");

  const chosen = addons.filter((a) => picked.includes(a.id));
  const total = project.price + chosen.reduce((s, a) => s + a.price, 0);
  const advance = advanceFor(total, advancePercent);
  const days = useMemo(() => daysUntil(deadline, today), [deadline, today]);
  const tight = days != null && days < project.deliveryDays;

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
      <div className="stack">
        {addons.length > 0 && (
          <section className="card form-card">
            <h2>
              <span className="n">1</span> Extras <span className="muted small">(optional)</span>
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
            <span className="n">{addons.length ? 2 : 1}</span> When do you need it?
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
                That's sooner than our usual {project.deliveryDays} days. We'll tell you on WhatsApp if we can make it
                {addons.some((a) => a.id === "priority") ? ", or add priority delivery above" : ""}.
              </span>
            </div>
          )}
        </section>

        <section className="card form-card">
          <h2>
            <span className="n">{addons.length ? 3 : 2}</span> Your details
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
            <span className="hint">Changes beyond the listed features may change the price. We'll confirm on WhatsApp first.</span>
          </label>
        </section>
      </div>

      <aside className="form-side stack">
        <div className="card form-card">
          <div className="stack-xs">
            <span className="eyebrow">Your order</span>
            <b>{project.title}</b>
          </div>
          <div className="lines">
            <div className="line">
              <span>Project</span>
              <span>{inr(project.price)}</span>
            </div>
            {chosen.map((a) => (
              <div key={a.id} className="line">
                <span>{a.name}</span>
                <span>+{inr(a.price)}</span>
              </div>
            ))}
            <div className="line total">
              <span>Total</span>
              <span>{inr(total)}</span>
            </div>
            <div className="line due">
              <span>Pay now to start ({advancePercent}%)</span>
              <span>{inr(advance)}</span>
            </div>
            <div className="line small muted">
              <span>After you see the demo</span>
              <span>{inr(total - advance)}</span>
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
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>
            {pending ? "Placing order…" : "Place order"}
          </button>
          <p className="tiny muted center">You'll see the UPI payment details on the next screen.</p>
        </div>
      </aside>

      <div className="mobile-total">
        <span className="stack-xs">
          <span className="tiny muted">Total · pay {inr(advance)} now</span>
          <b>{inr(total)}</b>
        </span>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Placing…" : "Place order"}
        </button>
      </div>
    </form>
  );
}
