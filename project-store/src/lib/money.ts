import { advanceFor } from "./pricing";
import type { Order } from "./types";

/** Where an order stands with money: what's paid, what's due now, and why. */
export function money(o: Pick<Order, "price" | "advancePercent" | "paid" | "pending" | "status">) {
  const price = o.price ?? 0;
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
  return { price, advance, balance, advancePaid, fullyPaid: o.price != null && balance === 0, dueNow, dueLabel };
}
