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

export interface Dish {
  vi: string;
  price: number;
  spice: number;
  alg: Allergen[];
  pron: string;
  name: ML | null;
  desc: ML | null;
  media?: Media[];
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
    media: media(o.media),
  };
}

export const isTranslated = (d: Dish) => !!d.name?.en;
