"use client";
import { startTransition, useActionState, useEffect, useState } from "react";
import { submitReview } from "@/app/(store)/actions";

type Existing = { rating: number; body: string; name: string; status: "pending" | "approved" | "hidden" } | null;

const LABELS = ["", "meh 😕", "okay 😐", "good 🙂", "great 😄", "goated 🐐"];
const STATUS = {
  pending: "Thanks! We'll post it on the site soon 👀",
  approved: "It's live on the site 🔥 Thank you!",
  hidden: "Thanks for the feedback 🙏 We read every word.",
};

/** "How did we do?": 1–5 stars, a few words, and the name to show. Only on delivered orders. */
export default function ReviewForm({
  token,
  defaultName,
  hasCollege,
  existing,
}: {
  token: string;
  defaultName: string;
  hasCollege: boolean;
  existing: Existing;
}) {
  const [state, dispatch, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [editing, setEditing] = useState(!existing);
  // Close the form once the save worked; keep it open (with the error) when it didn't.
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing && existing) {
    return (
      <div className="stack-sm">
        <p className="notice ok" role="status">
          {state?.ok ?? STATUS[existing.status]}
        </p>
        <div>
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
            edit my review
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="stack-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <input type="hidden" name="token" value={token} />
      <fieldset className="star-input">
        <legend className="small strong">your rating</legend>
        <div className="row" style={{ gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={n <= rating ? "on" : ""}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
              <span aria-hidden>★</span>
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""}
              </span>
            </label>
          ))}
          <span className="small muted" aria-live="polite">
            {LABELS[rating]}
          </span>
        </div>
      </fieldset>
      <label className="field">
        <span>how did it go?</span>
        <textarea
          className="textarea"
          name="body"
          rows={3}
          maxLength={1500}
          required
          minLength={10}
          defaultValue={existing?.body}
          placeholder="e.g. got it 3 days early, the walkthrough call saved my viva fr"
        />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>show my name as</span>
          <input className="input" name="name" maxLength={40} defaultValue={existing?.name || defaultName} />
        </label>
        {hasCollege && (
          <label className="check-plain small" style={{ alignSelf: "end", paddingBottom: 10 }}>
            <input type="checkbox" name="showCollege" value="1" defaultChecked />
            <span>show my college</span>
          </label>
        )}
      </div>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <button className="btn btn-primary" type="submit" disabled={pending || !rating}>
          {pending ? "sending…" : existing ? "update my review" : "post my review ⭐"}
        </button>
      </div>
    </form>
  );
}
