"use client";
import { Check, Hourglass, Users } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { setupSquad } from "@/app/(store)/actions";
import { inr } from "@/lib/format";
import { waLink } from "@/lib/links";
import CopyButton from "./CopyButton";
import { WhatsAppIcon } from "./Icons";

export type SeatView = {
  seat: number;
  name: string;
  link: string;
  share: number;
  paid: number;
  pending: number;
  done: boolean;
};

type Props = {
  token: string;
  title: string;
  seats: SeatView[];
  /** Price still being agreed: shares show once it's set. */
  priced: boolean;
  /** A teammate has paid, so the split can't change. */
  locked: boolean;
  /** Order finished or cancelled: show the squad, no editing. */
  closed: boolean;
};

/** "Split with your squad": pick how many people, name them, and send everyone their own pay link. */
export default function SquadPanel({ token, title, seats, priced, locked, closed }: Props) {
  const [state, dispatch, pending] = useActionState(setupSquad, null);
  const [editing, setEditing] = useState(seats.length === 0);
  // Close the form once the save worked; keep it open (with the error) when it didn't.
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);
  const [size, setSize] = useState(Math.max(2, seats.length || 3));
  const canEdit = !locked && !closed;

  return (
    <section className="card card-pad stack" id="squad">
      <div className="stack-xs">
        <h2 className="card-title">
          <Users size={20} aria-hidden /> split with your squad 👯
        </h2>
        <p className="small muted">
          {seats.length
            ? "Each teammate pays their own share from their own link. Shares update by themselves if the price changes."
            : "Doing this project as a team? Split the price: everyone gets their own link to pay their share."}
        </p>
      </div>

      {seats.length > 0 && !editing && (
        <ul className="squad-list">
          {seats.map((m) => {
            const msg = `Hey ${m.name}! Here's your share for our project “${title}”: ${priced ? inr(m.share) : "price coming soon"}. Pay it here 👉 ${m.link}`;
            return (
              <li key={m.seat} className={m.done ? "paid" : ""}>
                <span className="squad-who">
                  <span className="seat-dot" aria-hidden>
                    {m.done ? <Check size={14} /> : m.seat}
                  </span>
                  <span className="stack-xs">
                    <b>{m.seat === 1 ? `${m.name} (you)` : m.name}</b>
                    <span className="tiny muted">
                      {priced ? (
                        <>
                          share {inr(m.share)} · paid {inr(m.paid)}
                          {m.pending > 0 && (
                            <>
                              {" "}
                              · <Hourglass size={11} aria-hidden /> checking {inr(m.pending)}
                            </>
                          )}
                        </>
                      ) : (
                        "share shows once the price is agreed"
                      )}
                    </span>
                  </span>
                </span>
                {m.seat > 1 && (
                  <span className="row" style={{ gap: 6 }}>
                    <CopyButton text={m.link} label="copy link" />
                    <a className="btn btn-wa btn-sm" href={waLink("", msg)} target="_blank" rel="noopener noreferrer" aria-label={`Send ${m.name} their link on WhatsApp`}>
                      <WhatsAppIcon size={15} />
                    </a>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (editing || seats.length === 0) && (
        <form
          className="stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => dispatch(fd));
          }}
        >
          <input type="hidden" name="token" value={token} />
          <label className="field" style={{ maxWidth: 260 }}>
            <span>how many of you? (you included)</span>
            <select className="select" name="size" value={size} onChange={(e) => setSize(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} people
                </option>
              ))}
            </select>
          </label>
          <div className="grid-2">
            {Array.from({ length: size - 1 }, (_, i) => i + 2).map((seat) => (
              <label key={seat} className="field">
                <span>teammate {seat - 1}</span>
                <input className="input" name={`name${seat}`} maxLength={40} placeholder="first name" defaultValue={seats.find((m) => m.seat === seat)?.name ?? ""} />
              </label>
            ))}
          </div>
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "saving…" : seats.length ? "save the squad" : "split it 👯"}
            </button>
            {seats.length > 0 && (
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>
                cancel
              </button>
            )}
          </div>
        </form>
      )}

      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && !editing && (
        <p className="notice ok" role="status">
          {state.ok}
        </p>
      )}

      {canEdit && !editing && seats.length > 0 && (
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
            change the squad
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(() => dispatch(fd));
            }}
          >
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="size" value="1" />
            <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
              pay it all myself
            </button>
          </form>
        </div>
      )}
      {locked && !closed && <p className="tiny muted">A teammate has paid, so the split is locked. Need a change? Message us.</p>}
    </section>
  );
}
