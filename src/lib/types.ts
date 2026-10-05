import { SUPABASE_URL } from "./config";

export const LANG_KEYS = ["en", "ko", "zh", "ja"] as const;
export type Lang = (typeof LANG_KEYS)[number];
export type ML = Record<Lang, string>;

export const ALLERGEN_KEYS = ["peanut", "shellfish", "fish", "egg", "dairy", "gluten", "soy", "pork", "beef"] as const;
export type Allergen = (typeof ALLERGEN_KEYS)[number];

/** A photo or short video of a dish, stored in the project's "dish-media" storage bucket. */
export interface Media {
  type: "image" | "video";
  url: string;
}

export const MEDIA_BUCKET = "dish-media";
export const MAX_MEDIA = 6;
/** Only files from this project's own storage are shown, so a crafted save can't embed outside content. */
export const MEDIA_PREFIX = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/` : "";

/** Shop type: sets sensible defaults for drink options. */
export const SHOP_KINDS = ["food", "cafe", "tea"] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

export const SIZE_KEYS = ["S", "M", "L"] as const;
export type SizeKey = (typeof SIZE_KEYS)[number];

/** Choices a customer makes for one drink. Prices are the full price of each size. */
export interface DrinkOpts {
  sizes?: { k: SizeKey; price: number }[];
  sugar?: boolean;
  ice?: boolean;
  /** Customers may add the shop's toppings to this drink. */
  tops?: boolean;
}

/** An add-on from the shop-wide topping list (trân châu, thạch…). */
export interface Topping {
  vi: string;
  price: number;
  name?: ML | null;
}

export interface Dish {
  vi: string;
  price: number;
  spice: number;
  alg: Allergen[];
  pron: string;
  name: ML | null;
  desc: ML | null;
  media?: Media[];
  opts?: DrinkOpts | null;
}

export interface Stall {
  name: string;
  area: string;
  slug: string;
  published: boolean;
}

export interface MenuData extends Stall {
  dishes: Dish[];
  kind?: ShopKind;
  toppings?: Topping[];
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function media(v: unknown): Media[] {
  if (!MEDIA_PREFIX || !Array.isArray(v)) return [];
  const out: Media[] = [];
  for (const m of v) {
    if (!m || typeof m !== "object") continue;
    const { type, url } = m as Record<string, unknown>;
    if ((type === "image" || type === "video") && typeof url === "string" && url.startsWith(MEDIA_PREFIX) && !url.includes("..")) {
      out.push({ type, url });
    }
  }
  return out.slice(0, MAX_MEDIA);
}

function ml(v: unknown): ML | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const out = { en: str(o.en), ko: str(o.ko), zh: str(o.zh), ja: str(o.ja) };
  return out.en ? out : null;
}

const price = (v: unknown) => Math.max(0, Math.min(100_000_000, Math.round(Number(v) || 0)));

function opts(v: unknown): DrinkOpts | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const seen = new Set<SizeKey>();
  const sizes = (Array.isArray(o.sizes) ? o.sizes : [])
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
    .filter((x): x is { k: SizeKey; price: unknown } => SIZE_KEYS.includes(x.k as SizeKey) && !seen.has(x.k as SizeKey) && !!seen.add(x.k as SizeKey))
    .map((x) => ({ k: x.k, price: price(x.price) }))
    .sort((a, b) => SIZE_KEYS.indexOf(a.k) - SIZE_KEYS.indexOf(b.k));
  const out: DrinkOpts = { sizes: sizes.length >= 2 ? sizes : undefined, sugar: o.sugar === true, ice: o.ice === true, tops: o.tops === true };
  return out.sizes || out.sugar || out.ice || out.tops ? out : null;
}

export function cleanKind(v: unknown): ShopKind {
  return SHOP_KINDS.includes(v as ShopKind) ? (v as ShopKind) : "food";
}

export function cleanToppings(v: unknown): Topping[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) => (t && typeof t === "object" ? (t as Record<string, unknown>) : {}))
    .map((t) => ({ vi: str(t.vi).slice(0, 60), price: price(t.price), name: ml(t.name) }))
    .filter((t) => t.vi)
    .slice(0, 20);
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
    price: price(o.price),
    spice: Math.max(0, Math.min(3, Math.round(Number(o.spice) || 0))),
    alg: [...new Set(algIn.filter((a): a is Allergen => ALLERGEN_KEYS.includes(a as Allergen)))],
    pron: str(o.pron).slice(0, 120),
    name: ml(o.name),
    desc: ml(o.desc ?? o.descr),
    media: media(o.media),
    opts: opts(o.opts),
  };
}

export const isTranslated = (d: Dish) => !!d.name?.en;
