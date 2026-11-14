"use client";
import { startTransition, useActionState } from "react";

type State = { error?: string; ok?: string } | null;

/**
 * A form that runs a server action and shows its message. Fields keep what was typed
 * (React would otherwise clear them after every save).
 */
export default function ActionForm({
  action,
  children,
  submit,
  pendingLabel = "Saving…",
  className = "stack",
  buttonClass = "btn btn-primary",
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  children: React.ReactNode;
  submit: string;
  pendingLabel?: string;
  className?: string;
  buttonClass?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {children}
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && !pending && (
        <p className="notice ok" role="status">
          {state.ok}
        </p>
      )}
      <div>
        <button className={buttonClass} type="submit" disabled={pending}>
          {pending ? pendingLabel : submit}
        </button>
      </div>
    </form>
  );
}
