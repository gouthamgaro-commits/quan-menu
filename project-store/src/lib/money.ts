import { advanceFor } from "./pricing";
import type { Order, Payment } from "./types";

type MoneyInput = Pick<Order, "price" | "advancePercent" | "paid" | "pending" | "status"> & { discount?: number };

/**
 * Where an order stands with money: what's paid, what's due now, and why. `price` here is what the
 * student actually pays: the agreed price minus any discount (friend code, rewards, owner's discount).
 */
export function money(o: MoneyInput) {
  const listed = o.price ?? 0;
  const discount = o.price == null ? 0 : Math.min(listed, Math.max(0, o.discount ?? 0));
  const price = listed - discount;
  const advance = o.price == null ? 0 : advanceFor(price, o.advancePercent);
  const balance = Math.max(0, price - o.paid);
  const advancePaid = o.price != null && o.paid >= advance;
  let dueNow = 0;
  let dueLabel = "";
  if (o.price != null && o.status !== "cancelled" && o.status !== "requested") {
    if (!advancePaid) {
      dueNow = advance - o.paid;
      dueLabel = o.paid > 0 ? "rest of the advance" : `advance to start (${o.advancePercent}%)`;
    } else if (balance > 0) {
      dueNow = balance;
      dueLabel = o.status === "ready" || o.status === "delivered" ? "balance due" : "balance (pay after the demo)";
    }
  }
  return { listed, discount, price, advance, balance, advancePaid, fullyPaid: o.price != null && balance === 0, dueNow, dueLabel };
}

/**
 * Splits an amount between n people so the shares add up exactly: teammates pay a round ₹10
 * figure and the first seat (the student who ordered) takes the few rupees left over.
 */
export function splitShares(total: number, n: number): number[] {
  if (n <= 1) return [total];
  const each = Math.floor(total / n / 10) * 10;
  return [total - each * (n - 1), ...Array<number>(n - 1).fill(each)];
}

/** One teammate's part of a squad order: their share, what they've paid, and what they owe right now. */
export function seatMoney(o: MoneyInput, size: number, seat: number, payments: Payment[]) {
  const m = money(o);
  const i = Math.min(Math.max(seat, 1), size) - 1;
  const share = splitShares(m.price, size)[i] ?? 0;
  const advanceShare = splitShares(m.advance, size)[i] ?? 0;
  const mine = payments.filter((p) => (p.seat ?? 1) === seat);
  const paid = mine.filter((p) => p.status === "verified").reduce((s, p) => s + p.amount, 0);
  const pending = mine.filter((p) => p.status === "submitted").reduce((s, p) => s + p.amount, 0);
  let dueNow = 0;
  let dueLabel = "";
  if (o.price != null && o.status !== "cancelled" && o.status !== "requested" && !m.fullyPaid) {
    if (!m.advancePaid && paid < advanceShare) {
      dueNow = advanceShare - paid;
      dueLabel = paid > 0 ? "rest of your advance share" : "your share of the advance";
    } else if (m.advancePaid && paid < share) {
      dueNow = share - paid;
      dueLabel = o.status === "ready" || o.status === "delivered" ? "rest of your share" : "rest of your share (pay after the demo)";
    }
    // Never ask one person for more than the whole order still needs (someone may have covered for them).
    dueNow = Math.min(dueNow, m.dueNow);
  }
  return { share, advanceShare, paid, pending, dueNow, dueLabel, done: o.price != null && paid >= share };
}
