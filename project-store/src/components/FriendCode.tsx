"use client";
import { useState } from "react";
import { inr } from "@/lib/format";

/**
 * "Got a friend's code?" on the order forms. Filled in and open when the visitor came from an
 * invite link; otherwise a small toggle so it doesn't get in the way.
 */
export default function FriendCode({
  code = "",
  friend = "",
  discount,
  onChange,
}: {
  code?: string;
  friend?: string;
  discount: number;
  /** Lets the order form show the discount as soon as a code is typed. */
  onChange?: (code: string) => void;
}) {
  const [open, setOpen] = useState(!!code);
  if (discount <= 0) return null;
  if (!open) {
    return (
      <button type="button" className="link-btn small" onClick={() => setOpen(true)}>
        got a friend&apos;s code? 🎁
      </button>
    );
  }
  return (
    <label className="field friend-code">
      <span>
        friend code 🎁 <em>(first order only)</em>
      </span>
      <input
        className="input mono"
        name="ref"
        defaultValue={code}
        maxLength={20}
        placeholder="e.g. RAHUL-K7QM"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <span className="hint">
        {code && friend ? `${friend}'s code: ` : ""}
        {inr(discount)} comes off your price once we check the code.
      </span>
    </label>
  );
}
