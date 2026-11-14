import type { CategoryId } from "./catalog";
import type { Addon, Settings } from "./settings";

/** Rounds to the nearest step (₹100 by default), the way prices are quoted. */
export function roundTo(n: number, step = 100) {
  return Math.max(0, Math.round(n / step) * step);
}

/** Today's date in India as YYYY-MM-DD, whatever time zone the server runs in. */
export function todayIST(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Whole days from `today` to `deadline` (both YYYY-MM-DD). Null when there is no valid deadline. */
export function daysUntil(deadline: string | null | undefined, today: string) {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const d = Date.parse(deadline + "T00:00:00Z");
  const t = Date.parse(today + "T00:00:00Z");
  if (!Number.isFinite(d) || !Number.isFinite(t)) return null;
  return Math.round((d - t) / 86_400_000);
}

/** The rush charge (percent) for a deadline this many days away. */
export function rushPercent(s: Settings, daysLeft: number | null) {
  if (daysLeft == null) return 0;
  const rule = s.rush.find((r) => daysLeft <= r.days);
  return rule ? rule.percent : 0;
}

/** What a custom idea of this difficulty and domain costs before add-ons and rush. */
export function basePrice(s: Settings, difficulty: number, category: string) {
  const tier = s.tierPrices[Math.min(4, Math.max(1, Math.round(difficulty))) - 1];
  const factor = s.factors[category as CategoryId] ?? 1;
  return roundTo(tier * factor);
}

export function pickAddons(s: Settings, ids: string[]): Addon[] {
  return s.addons.filter((a) => ids.includes(a.id));
}

export type Estimate = {
  base: number;
  rushPercent: number;
  rush: number;
  addons: Addon[];
  addonsTotal: number;
  total: number;
  low: number;
  high: number;
  daysLeft: number | null;
};

/**
 * Instant price estimate for a custom idea: base price for the difficulty × domain factor,
 * plus a rush charge for close deadlines, plus add-ons. Shown as a range because the final
 * quote depends on the details; the owner confirms it.
 */
export function estimateIdea(
  s: Settings,
  input: { difficulty: number; category: string; deadline?: string | null; addons: string[] },
  today: string,
): Estimate {
  const base = basePrice(s, input.difficulty, input.category);
  const daysLeft = daysUntil(input.deadline, today);
  const pct = rushPercent(s, daysLeft);
  const rush = roundTo((base * pct) / 100);
  const addons = pickAddons(s, input.addons);
  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
  const total = base + rush + addonsTotal;
  return {
    base,
    rushPercent: pct,
    rush,
    addons,
    addonsTotal,
    total,
    low: roundTo(base * 0.9 + rush + addonsTotal),
    high: roundTo(base * 1.2 + rush + addonsTotal),
    daysLeft,
  };
}

/** Advance due before work starts, for a given price. */
export function advanceFor(price: number, percent: number) {
  return Math.round((price * percent) / 100);
}
