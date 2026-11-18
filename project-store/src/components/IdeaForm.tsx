"use client";
import { CircleAlert, Timer } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import { submitIdea } from "@/app/(store)/actions";
import { CATEGORIES, DIFFICULTIES } from "@/lib/catalog";
import { approx, inr } from "@/lib/format";
import { advanceFor, basePrice, estimateIdea, minOffer } from "@/lib/pricing";
import type { Settings } from "@/lib/settings";
import ContactFields from "./ContactFields";
import FriendCode from "./FriendCode";
import { Meter } from "./Ui";

type Props = {
  settings: Settings;
  today: string;
  initialCategory?: string;
  initialBranch?: string;
  fx?: { code: string; rate: number } | null;
  invite?: { code: string; friend: string } | null;
};

export default function IdeaForm({ settings: s, today, initialCategory = "web", initialBranch = "", fx = null, invite = null }: Props) {
  const referralDiscount = s.referralOn ? s.referralDiscount : 0;
  const [state, dispatch, pending] = useActionState(submitIdea, null);
  const [category, setCategory] = useState(initialCategory);
  const [difficulty, setDifficulty] = useState(2);
  const [deadline, setDeadline] = useState("");
  const [addons, setAddons] = useState<string[]>([]);

  const est = useMemo(
    () => estimateIdea(s, { difficulty, category, deadline, addons }, today),
    [s, difficulty, category, deadline, addons, today],
  );
  const range = `${inr(est.low)} – ${inr(est.high)}`;

  return (
    <form
      id="idea-form"
      className="form-layout"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <div className="stack">
        <section className="card form-card">
          <h2>
            <span className="n">1</span> your idea 💡
          </h2>
          <label className="field">
            <span>project title</span>
            <input
              className="input"
              name="title"
              required
              minLength={5}
              maxLength={140}
              placeholder="e.g. AI app that roasts your code 🔥"
            />
          </label>
          <label className="field">
            <span>describe it</span>
            <textarea
              className="textarea"
              name="idea"
              required
              minLength={20}
              maxLength={4000}
              rows={5}
              placeholder={"What should it do? Must-have features, tech stack, anything your guide or bootcamp asked for?\n\ne.g. Paste a GitHub repo, the app reviews the code, gives a score and roasts the worst function. React frontend, Python backend."}
            />
          </label>
          <label className="field">
            <span>
              reference link <em>(optional: base paper, synopsis, Figma, repo…)</em>
            </span>
            <input className="input" name="reference" type="url" inputMode="url" maxLength={500} placeholder="https://…" />
          </label>
        </section>

        <section className="card form-card">
          <h2>
            <span className="n">2</span> track &amp; difficulty 🎚️
          </h2>
          <fieldset>
            <legend className="legend">what track is it?</legend>
            <div className="choices three">
              {CATEGORIES.map((c) => (
                <label key={c.id} className={`choice cat-${c.id}`} style={{ gridTemplateColumns: "auto 1fr", alignItems: "center", gap: 10 }}>
                  <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} />
                  <span aria-hidden style={{ fontSize: 22, lineHeight: 1 }}>
                    {c.emoji}
                  </span>
                  <b style={{ fontSize: 13.5 }}>{c.name}</b>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="legend">how hard is it?</legend>
            <div className="choices four">
              {DIFFICULTIES.map((d) => (
                <label key={d.level} className="choice">
                  <input type="radio" name="difficulty" value={d.level} checked={difficulty === d.level} onChange={() => setDifficulty(d.level)} />
                  <Meter level={d.level} />
                  <small>{d.hint}</small>
                  <span className="small strong">from {inr(basePrice(s, d.level, category))}</span>
                </label>
              ))}
            </div>
            <span className="hint">Not sure? Best guess is fine. We check it and agree the price before you pay anything.</span>
          </fieldset>
        </section>

        <section className="card form-card">
          <h2>
            <span className="n">3</span> deadline &amp; extras ⏰
          </h2>
          <label className="field" style={{ maxWidth: 260 }}>
            <span>
              submission date <em>(optional)</em>
            </span>
            <input className="input" type="date" name="deadline" min={today} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
          {est.rushPercent > 0 && (
            <div className="notice warn" role="status">
              <Timer size={18} aria-hidden />
              <span>
                Needed in {est.daysLeft === 0 ? "less than a day" : `${est.daysLeft} day${est.daysLeft === 1 ? "" : "s"}`}? That&apos;s a {est.rushPercent}% rush
                charge. A later date costs less 😉
              </span>
            </div>
          )}
          {est.daysLeft != null && est.daysLeft < 3 && (
            <div className="notice err" role="status">
              <CircleAlert size={18} aria-hidden />
              <span>That&apos;s cutting it close 😬 DM us on WhatsApp right after sending so we can confirm we can make it.</span>
            </div>
          )}
          {s.addons.length > 0 && (
            <div className="choices">
              {s.addons.map((a) => (
                <label key={a.id} className="check">
                  <input
                    type="checkbox"
                    name="addons"
                    value={a.id}
                    checked={addons.includes(a.id)}
                    onChange={(e) => setAddons((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))}
                  />
                  <span className="grow">
                    <b>{a.name}</b>
                  </span>
                  <b className="nowrap">+{inr(a.price)}</b>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="card form-card">
          <h2>
            <span className="n">4</span> your budget 💸
          </h2>
          <div className="grid-2">
            <label className="field">
              <span>
                {s.negotiable ? "what can you pay? (₹)" : "budget (₹)"} <em>(optional)</em>
              </span>
              <span className="money-input">
                <span>₹</span>
                <input className="input" name="budget" inputMode="numeric" maxLength={9} placeholder={String(est.low)} />
              </span>
              <span className="hint">
                {s.negotiable
                  ? `We treat it as your offer: we accept it or reply with a price that works.${s.minOfferPercent ? ` Budgets from ${inr(minOffer(est.low, s.minOfferPercent))} are considered.` : ""}`
                  : "Helps us suggest the right scope."}
              </span>
            </label>
            <label className="field">
              <span>
                a note for us <em>(optional)</em>
              </span>
              <textarea className="textarea" name="message" rows={3} maxLength={1000} placeholder="e.g. it needs to be deployed live, and our demo is on the 20th" style={{ minHeight: 0 }} />
            </label>
          </div>
        </section>

        <section className="card form-card">
          <h2>
            <span className="n">5</span> about you 👋
          </h2>
          <ContactFields defaultBranch={initialBranch} />
        </section>
      </div>

      <aside className="form-side stack">
        <div className="card form-card">
          <div className="estimate">
            <span className="sticker white" style={{ fontSize: 12 }}>
              instant estimate ⚡
            </span>
            <span className="range" aria-live="polite">
              {range}
            </span>
            {fx && (
              <span className="approx">
                {approx(est.low, fx)} – {approx(est.high, fx).replace("≈ ", "")}
              </span>
            )}
            <span className="small muted">
              {s.negotiable
                ? "Tell us your budget below. We agree the final price with you before you pay anything."
                : "We confirm the final price on your order page, usually within a few hours."}
            </span>
          </div>
          <div className="lines">
            <div className="line">
              <span>
                {DIFFICULTIES[difficulty - 1].name} · {CATEGORIES.find((c) => c.id === category)?.name}
              </span>
              <span>{inr(est.base)}</span>
            </div>
            {est.rush > 0 && (
              <div className="line">
                <span>rush charge ({est.rushPercent}%)</span>
                <span>+{inr(est.rush)}</span>
              </div>
            )}
            {est.addons.map((a) => (
              <div key={a.id} className="line">
                <span>{a.name}</span>
                <span>+{inr(a.price)}</span>
              </div>
            ))}
            <div className="line total">
              <span>typical price</span>
              <span>{inr(est.total)}</span>
            </div>
            <div className="line small muted">
              <span>advance once agreed ({s.advancePercent}%)</span>
              <span>≈ {inr(advanceFor(est.total, s.advancePercent))}</span>
            </div>
          </div>
          <FriendCode code={invite?.code} friend={invite?.friend} discount={referralDiscount} />
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
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>
            {pending ? "sending…" : "send my idea 🚀"}
          </button>
          <p className="tiny muted center">Free to ask. You only pay after you accept the price.</p>
        </div>
      </aside>

      <div className="mobile-total">
        <span className="stack-xs">
          <span className="tiny muted">instant estimate ⚡</span>
          <b>{range}</b>
        </span>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "sending…" : "send idea 🚀"}
        </button>
      </div>
    </form>
  );
}
