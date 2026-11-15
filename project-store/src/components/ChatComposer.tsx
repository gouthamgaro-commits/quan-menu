"use client";
import { HandCoins, Send } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

type State = { error?: string; ok?: string } | null;

/** Message box under a conversation, with an optional price offer. */
export default function ChatComposer({
  action,
  hidden,
  allowOffer,
  offerHint,
  placeholder = "Write a message…",
  quickReplies = [],
  startWithOffer = false,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  hidden: Record<string, string | number>;
  allowOffer: boolean;
  offerHint?: string;
  placeholder?: string;
  quickReplies?: string[];
  startWithOffer?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const [withOffer, setWithOffer] = useState(startWithOffer && allowOffer);
  const form = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      setWithOffer(false);
    }
  }, [state]);

  return (
    <form
      ref={form}
      id="chat"
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {quickReplies.length > 0 && (
        <div className="quick">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              className="chip-btn"
              onClick={() => {
                if (box.current) {
                  box.current.value = q;
                  box.current.focus();
                }
              }}
            >
              {q.length > 42 ? q.slice(0, 40) + "…" : q}
            </button>
          ))}
        </div>
      )}
      <textarea ref={box} className="textarea" name="body" rows={2} maxLength={2000} placeholder={placeholder} aria-label="Message" />
      {allowOffer && (
        <div className="offer-row">
          <label className="check-plain">
            <input type="checkbox" name="withOffer" value="1" checked={withOffer} onChange={(e) => setWithOffer(e.target.checked)} />
            <HandCoins size={17} aria-hidden /> Add a price offer
          </label>
          {withOffer && (
            <label className="offer-input">
              <span>₹</span>
              <input name="offer" inputMode="numeric" required maxLength={9} placeholder="Amount" aria-label="Offer amount in rupees" autoFocus />
            </label>
          )}
          {withOffer && offerHint && <span className="hint">{offerHint}</span>}
        </div>
      )}
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && !pending && (
        <p className="small" role="status" style={{ color: "var(--ok)" }}>
          {state.ok}
        </p>
      )}
      <div className="row end">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          <Send size={16} aria-hidden /> {pending ? "Sending…" : withOffer ? "Send offer" : "Send"}
        </button>
      </div>
    </form>
  );
}
