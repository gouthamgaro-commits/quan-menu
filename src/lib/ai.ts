import Anthropic from "@anthropic-ai/sdk";
import { cleanDish, type Dish } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const DISH_SCHEMA = `Each dish object has these fields:
- "vi": the Vietnamese name exactly as written, with diacritics
- "price": integer price in VND (expand shorthand: "45k" or "45" on a street menu means 45000)
- "spice": 0-3
- "alg": array using ONLY these keys: peanut, shellfish, fish, egg, dairy, gluten, soy, pork, beef. List what the usual Saigon street version contains; use "fish" for fish sauce.
- "pron": a simple respelling an English speaker can read aloud, e.g. "fuh baw tie"
- "name": {"en","ko","zh","ja"} short, natural dish names in each language
- "desc": {"en","ko","zh","ja"} one plain sentence each saying what is in the dish`;

export class AiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiError("Photo reading isn't set up yet: add ANTHROPIC_API_KEY to the server environment.", 501);
  }
  return new Anthropic();
}

/** Pulls one JSON value out of a model reply (bare, fenced, or surrounded by a sentence). */
export function parseJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [text, fence?.[1]];
  const first = text.search(/[[{]/);
  const last = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c.trim());
    } catch {}
  }
  throw new AiError("The menu came back in a broken format. Try again.");
}

async function ask(content: Anthropic.MessageParam["content"]): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: "user", content }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  if (res.stop_reason === "max_tokens") throw new AiError("That menu is too long to read in one photo. Try photographing half at a time.");
  return text;
}

type ImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export async function extractMenu(base64: string, mediaType: ImageType): Promise<{ stall: string; dishes: Dish[] }> {
  const text = await ask([
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    {
      type: "text",
      text: `This photo is a menu from a street-food stall in Ho Chi Minh City, Vietnam. Extract every dish and drink with its price. If a price is unreadable use 0. Ignore anything that is not a menu item.

Reply with only a JSON object: {"stall": the stall's name if visible else "", "dishes": [ ... ]}
${DISH_SCHEMA}`,
    },
  ]);
  const out = parseJson(text) as { stall?: unknown; dishes?: unknown };
  const dishes = (Array.isArray(out?.dishes) ? out.dishes : []).map(cleanDish).filter((d): d is Dish => !!d);
  if (!dishes.length) throw new AiError("No dishes found in that photo. Try a clearer, straighter shot.", 422);
  return { stall: typeof out.stall === "string" ? out.stall.trim() : "", dishes };
}

export async function translateDishes(names: string[]): Promise<(Dish | null)[]> {
  const text = await ask(
    `These are dish names from a Ho Chi Minh City street-food stall: ${JSON.stringify(names)}
Reply with only a JSON array with one object per dish, in the same order.
${DISH_SCHEMA}`,
  );
  const arr = parseJson(text);
  if (!Array.isArray(arr)) throw new AiError("The translation came back in a broken format. Try again.");
  return names.map((_, i) => cleanDish(arr[i]));
}
