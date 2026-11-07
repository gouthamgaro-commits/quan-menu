import { sameLine, type Line } from "./drinks";
import type { Dish, Topping } from "./types";

/**
 * A customer's order on one menu, kept in the browser tab (sessionStorage) so a reload or a phone
 * call doesn't lose it. A new tab, a changed menu or a few hours' wait starts afresh.
 */
export interface SavedCart {
  lines: Line[];
  /** What the vendor has already been shown, so the next order shows only what was added. */
  sent: Line[];
  /** The order number shown to the vendor and put in the bank transfer note. */
  no: string;
  /** Requests for the vendor ("nochili", "takeaway"…, see NOTES in i18n.ts). */
  notes: string[];
}

const KEY = (slug: string) => "quan-cart-" + slug;
const MAX_AGE = 6 * 3600_000;

/** A short fingerprint of the menu: saved lines point at dishes by position, so any change voids them. */
export function menuSig(dishes: Pick<Dish, "vi">[], toppings: Pick<Topping, "vi">[] = []): string {
  let h = 2166136261;
  for (const ch of dishes.map((d) => d.vi).join("|") + "#" + toppings.map((t) => t.vi).join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + "." + dishes.length;
}

const okLine = (l: unknown, n: number): l is Line => {
  if (!l || typeof l !== "object") return false;
  const x = l as Line;
  return Number.isInteger(x.i) && x.i >= 0 && x.i < n && Number.isInteger(x.q) && x.q > 0 && x.q < 100;
};

export function loadCart(slug: string, sig: string, n: number, now = Date.now()): SavedCart | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY(slug)) || "null");
    if (!raw || raw.sig !== sig || !(now - raw.at < MAX_AGE)) return null;
    const lines = (Array.isArray(raw.lines) ? raw.lines : []).filter((l: unknown) => okLine(l, n));
    const sent = (Array.isArray(raw.sent) ? raw.sent : []).filter((l: unknown) => okLine(l, n));
    const notes = (Array.isArray(raw.notes) ? raw.notes : []).filter((x: unknown): x is string => typeof x === "string" && x.length <= 20);
    return lines.length ? { lines, sent, no: /^\d{4}$/.test(raw.no) ? raw.no : "", notes } : null;
  } catch {
    return null;
  }
}

export function saveCart(slug: string, sig: string, cart: SavedCart, now = Date.now()) {
  try {
    if (!cart.lines.length) sessionStorage.removeItem(KEY(slug));
    else sessionStorage.setItem(KEY(slug), JSON.stringify({ ...cart, sig, at: now }));
  } catch {}
}

/** How many of this exact line (same dish and choices) the vendor has already been shown. */
export const sentQty = (line: Line, sent: Line[]) => sent.reduce((a, s) => a + (sameLine(s, line) ? s.q : 0), 0);

/** What was added since the vendor last saw the order. */
export const freshLines = (cart: Line[], sent: Line[]): Line[] =>
  cart.map((l) => ({ ...l, q: l.q - sentQty(l, sent) })).filter((l) => l.q > 0);

/** Quantities per dish (Vietnamese name), for the vendor's order counts. */
export function countByName(lines: Line[], dishes: Pick<Dish, "vi">[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) {
    const vi = dishes[l.i]?.vi;
    if (vi) out[vi] = Math.min(999, (out[vi] ?? 0) + l.q);
  }
  return out;
}
