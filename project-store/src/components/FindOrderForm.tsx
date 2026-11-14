"use client";
import { startTransition, useActionState } from "react";
import { findOrder } from "@/app/(store)/actions";

export default function FindOrderForm() {
  const [state, dispatch, pending] = useActionState(findOrder, null);
  return (
    <form
      className="card card-pad stack"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <div className="grid-2">
        <label className="field">
          <span>Order code</span>
          <input className="input mono" name="code" required maxLength={12} placeholder="K7Q3MZ" autoCapitalize="characters" autoComplete="off" />
        </label>
        <label className="field">
          <span>WhatsApp number</span>
          <input className="input" name="phone" type="tel" inputMode="tel" required maxLength={18} autoComplete="tel" placeholder="98765 43210" />
        </label>
      </div>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Looking…" : "Find my order"}
        </button>
      </div>
    </form>
  );
}
