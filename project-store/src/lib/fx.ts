import "server-only";
import { cookies, headers } from "next/headers";

/**
 * Approximate prices in the visitor's own currency. All prices are in rupees; a student in
 * the US sees "≈ $210" next to "₹17,500". Rates come from a free API (refreshed twice a day),
 * with built-in fallback rates if it can't be reached. Payment amounts stay in rupees.
 */

export type Fx = { code: string; rate: number; symbol: string } | null;

export const CURRENCIES: { code: string; label: string }[] = [
  { code: "INR", label: "₹ INR" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" },
  { code: "GBP", label: "£ GBP" },
  { code: "CAD", label: "$ CAD" },
  { code: "AUD", label: "$ AUD" },
  { code: "AED", label: "AED" },
  { code: "SGD", label: "$ SGD" },
  { code: "MYR", label: "RM MYR" },
  { code: "NGN", label: "₦ NGN" },
  { code: "PKR", label: "₨ PKR" },
  { code: "BDT", label: "৳ BDT" },
  { code: "LKR", label: "Rs LKR" },
  { code: "NPR", label: "Rs NPR" },
  { code: "PHP", label: "₱ PHP" },
  { code: "IDR", label: "Rp IDR" },
  { code: "ZAR", label: "R ZAR" },
  { code: "KES", label: "KSh KES" },
  { code: "SAR", label: "SAR" },
  { code: "JPY", label: "¥ JPY" },
];

/** Rupees → other currencies, used when the live rates can't be fetched (approximate, late 2026). */
const FALLBACK: Record<string, number> = {
  USD: 0.0114, EUR: 0.0098, GBP: 0.0086, CAD: 0.0158, AUD: 0.0174, AED: 0.0419, SGD: 0.0148, MYR: 0.049,
  NGN: 17.5, PKR: 3.2, BDT: 1.38, LKR: 3.4, NPR: 1.6, PHP: 0.66, IDR: 185, ZAR: 0.2, KES: 1.47, SAR: 0.0428, JPY: 1.72,
};

const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "AUD", AE: "AED", SG: "SGD", MY: "MYR", NG: "NGN", PK: "PKR",
  BD: "BDT", LK: "LKR", NP: "NPR", PH: "PHP", ID: "IDR", ZA: "ZAR", KE: "KES", SA: "SAR", JP: "JPY", IN: "INR",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR", PT: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
};

async function rates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/INR", {
      next: { revalidate: 43_200 },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const json = (await res.json()) as { rates?: Record<string, number> };
      if (json.rates?.USD) return json.rates;
    }
  } catch {
    /* offline or blocked: use the built-in rates */
  }
  return FALLBACK;
}

/** The visitor's currency: their own choice (cookie), else their country (from the host's geo header), else rupees. */
export async function visitorCurrency(): Promise<string> {
  const chosen = (await cookies()).get("cur")?.value;
  if (chosen && CURRENCIES.some((c) => c.code === chosen)) return chosen;
  const h = await headers();
  const country = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").toUpperCase();
  if (COUNTRY_CURRENCY[country]) return COUNTRY_CURRENCY[country];
  const lang = h.get("accept-language") || "";
  const region = /^[a-z]{2}-([A-Z]{2})/.exec(lang)?.[1];
  return (region && COUNTRY_CURRENCY[region]) || "INR";
}

/** What to show next to rupee prices for this visitor, or null when they already see rupees. */
export async function getFx(enabled = true): Promise<Fx> {
  if (!enabled) return null;
  const code = await visitorCurrency();
  if (code === "INR") return null;
  const r = await rates();
  const rate = r[code] ?? FALLBACK[code];
  if (!rate) return null;
  const symbol = new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? code;
  return { code, rate, symbol };
}

/** Currencies PayPal accepts that we'd rather show than dollars, when the visitor uses them. */
const PAYPAL_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "JPY", "MYR", "PHP"];

/** The amount (in a currency PayPal takes) for a rupee amount: the visitor's own if possible, else US dollars. */
export async function paypalAmount(amountINR: number): Promise<{ amount: number; currency: string }> {
  const code = await visitorCurrency();
  const currency = PAYPAL_CURRENCIES.includes(code) ? code : "USD";
  const r = await rates();
  const rate = r[currency] ?? FALLBACK[currency] ?? FALLBACK.USD;
  const raw = amountINR * rate;
  return { amount: currency === "JPY" ? Math.ceil(raw) : Math.ceil(raw * 100) / 100, currency };
}
