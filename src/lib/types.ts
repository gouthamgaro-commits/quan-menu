export const LANG_KEYS = ["en", "ko", "zh", "ja"] as const;
export type Lang = (typeof LANG_KEYS)[number];
export type ML = Record<Lang, string>;

export const ALLERGEN_KEYS = ["peanut", "shellfish", "fish", "egg", "dairy", "gluten", "soy", "pork", "beef"] as const;
export type Allergen = (typeof ALLERGEN_KEYS)[number];

export interface Dish {
  vi: string;
  price: number;
  spice: number;
  alg: Allergen[];
  pron: string;
  name: ML | null;
  desc: ML | null;
}

export interface Stall {
  name: string;
  area: string;
  slug: string;
  published: boolean;
}

export interface MenuData extends Stall {
  dishes: Dish[];
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function ml(v: unknown): ML | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const out = { en: str(o.en), ko: str(o.ko), zh: str(o.zh), ja: str(o.ja) };
  return out.en ? out : null;
}

/** Turns untrusted input (AI output, request bodies, DB rows) into a valid Dish. */
export function cleanDish(d: unknown): Dish | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  const vi = str(o.vi).slice(0, 200);
  if (!vi) return null;
  const algIn = Array.isArray(o.alg) ? o.alg : Array.isArray(o.allergens) ? o.allergens : [];
  return {
    vi,
    price: Math.max(0, Math.min(100_000_000, Math.round(Number(o.price) || 0))),
    spice: Math.max(0, Math.min(3, Math.round(Number(o.spice) || 0))),
    alg: [...new Set(algIn.filter((a): a is Allergen => ALLERGEN_KEYS.includes(a as Allergen)))],
    pron: str(o.pron).slice(0, 120),
    name: ml(o.name),
    desc: ml(o.desc ?? o.descr),
  };
}

export const isTranslated = (d: Dish) => !!d.name?.en;
