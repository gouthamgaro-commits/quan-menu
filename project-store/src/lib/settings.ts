import { CATEGORIES, type CategoryId } from "./catalog";

export type Addon = { id: string; name: string; price: number };
export type RushRule = { days: number; percent: number };

/** Everything the owner can change in Admin → Settings. Stored as one JSON row; missing keys fall back to DEFAULTS. */
export type Settings = {
  brandName: string;
  tagline: string;
  /** WhatsApp number with country code, digits only: 919876543210 */
  whatsapp: string;
  email: string;
  city: string;
  /** Optional strip at the top of every page, e.g. an offer. */
  announcement: string;
  upiId: string;
  upiName: string;
  /** Share of the price paid before work starts. */
  advancePercent: number;
  /** Base price of a custom idea for each difficulty (1 Easy … 4 Expert), in rupees. */
  tierPrices: [number, number, number, number];
  /** Price multiplier per project domain. */
  factors: Record<CategoryId, number>;
  /** Extra charge when the deadline is close. Checked in order of days; the first match applies. */
  rush: RushRule[];
  addons: Addon[];
  /** Plain text. "## " starts a heading, "- " a bullet, a blank line a new paragraph. */
  policies: string;
};

export const DEFAULT_POLICIES = `## Ordering
- Pick a project from the catalogue or send us your own idea. For your own idea we confirm the final price on WhatsApp, usually within a few hours.
- Work starts once the advance is paid. You pay the rest after you have seen the working demo.

## Delivery
- Delivery times start from the day the advance is received.
- You get the full source code or design files, the report and the slides as a download link on your order page.
- Setup help on your own laptop is included for software projects.

## Changes
- Small changes after delivery (titles, names, screenshots in the report) are free for 15 days.
- New features or a change of topic are quoted separately.

## Refunds
- If we can't start your project, the advance is refunded in full.
- Once work has started, the advance is not refundable, but you can switch to another project of the same price.

## Use of the projects
- Projects are delivered as reference implementations and learning material, with an explanation of how they work.
- Check your college's rules on outside help before you submit work.`;

export const DEFAULTS: Settings = {
  brandName: "ProjectMitra",
  tagline: "Engineering projects, built for you",
  whatsapp: "",
  email: "",
  city: "",
  announcement: "",
  upiId: "",
  upiName: "",
  advancePercent: 50,
  tierPrices: [2000, 4000, 7500, 12000],
  factors: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.factor])) as Record<CategoryId, number>,
  rush: [
    { days: 7, percent: 40 },
    { days: 14, percent: 20 },
  ],
  addons: [
    { id: "viva", name: "1-on-1 explanation & viva prep call (1 hour)", price: 500 },
    { id: "walkthrough", name: "Recorded code walkthrough video", price: 600 },
    { id: "paper", name: "Conference paper write-up (IEEE format)", price: 1500 },
    { id: "priority", name: "Priority delivery (we start the same day)", price: 1000 },
  ],
  policies: DEFAULT_POLICIES,
};

const num = (v: unknown, fallback: number, min = 0, max = 10_000_000) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const str = (v: unknown, fallback: string, max = 5000) => (typeof v === "string" ? v.slice(0, max) : fallback);

/** Merges stored JSON with the defaults and clamps every number, so a bad save can't break pricing. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const d = DEFAULTS;
  const tiers = Array.isArray(r.tierPrices) ? r.tierPrices : d.tierPrices;
  const factorsRaw = (r.factors && typeof r.factors === "object" ? r.factors : {}) as Record<string, unknown>;
  const rush = Array.isArray(r.rush)
    ? (r.rush as Partial<RushRule>[])
        .map((x) => ({ days: Math.round(num(x?.days, 0, 0, 365)), percent: num(x?.percent, 0, 0, 300) }))
        .filter((x) => x.days > 0 && x.percent > 0)
        .sort((a, b) => a.days - b.days)
    : d.rush;
  const addons = Array.isArray(r.addons)
    ? (r.addons as Partial<Addon>[])
        .map((a) => ({ id: str(a?.id, "", 40), name: str(a?.name, "", 120).trim(), price: Math.round(num(a?.price, 0)) }))
        .filter((a) => a.id && a.name)
    : d.addons;
  return {
    brandName: str(r.brandName, d.brandName, 60).trim() || d.brandName,
    tagline: str(r.tagline, d.tagline, 120),
    whatsapp: str(r.whatsapp, d.whatsapp, 20).replace(/\D/g, ""),
    email: str(r.email, d.email, 120).trim(),
    city: str(r.city, d.city, 80).trim(),
    announcement: str(r.announcement, d.announcement, 200).trim(),
    upiId: str(r.upiId, d.upiId, 80).trim(),
    upiName: str(r.upiName, d.upiName, 80).trim(),
    advancePercent: Math.round(num(r.advancePercent, d.advancePercent, 0, 100)),
    tierPrices: [0, 1, 2, 3].map((i) => Math.round(num(tiers[i], d.tierPrices[i]))) as Settings["tierPrices"],
    factors: Object.fromEntries(
      CATEGORIES.map((c) => [c.id, num(factorsRaw[c.id], d.factors[c.id], 0.1, 20)]),
    ) as Record<CategoryId, number>,
    rush,
    addons,
    policies: str(r.policies, d.policies, 20000),
  };
}

/** True once the owner has added the details students need to pay and get in touch. */
export function setupMissing(s: Settings) {
  return [
    !s.whatsapp && "WhatsApp number",
    !s.upiId && "UPI ID for payments",
  ].filter(Boolean) as string[];
}
