import Anthropic from "@anthropic-ai/sdk";
import type { AiCode } from "./strings";
import { ALLERGEN_KEYS, LANG_KEYS, cleanDish, type Dish } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

/**
 * Reading a menu and translating dish names are perception and writing, not hard
 * reasoning, so "low" effort keeps calls fast (they must finish inside the 60 s
 * function limit) and cheap. Raise it with ANTHROPIC_EFFORT if quality suffers.
 */
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];
const EFFORT: Effort = EFFORTS.find((e) => e === process.env.ANTHROPIC_EFFORT) ?? "low";

/** Whole-request budget: the routes declare maxDuration = 60, so stop the call before the platform does. */
const BUDGET_MS = 55_000;

const DISH_RULES = `Each dish object has these fields:
- "vi": the Vietnamese name exactly as written, with diacritics
- "price": integer price in VND (expand shorthand: "45k" or "45" on a street menu means 45000)
- "spice": 0-3
- "alg": array using ONLY these keys: peanut, shellfish, fish, egg, dairy, gluten, soy, pork, beef. List what the usual Saigon street version contains; use "fish" for fish sauce.
- "pron": a simple respelling an English speaker can read aloud, e.g. "fuh baw tie"
- "name": {"en","ko","zh","ja"} short, natural dish names in each language
- "desc": {"en","ko","zh","ja"} one plain sentence each saying what is in the dish`;

/* JSON schemas for structured outputs: the API guarantees replies that parse and match them. */
const ML_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(LANG_KEYS.map((k) => [k, { type: "string" }])),
  required: [...LANG_KEYS],
  additionalProperties: false,
};
const DISH_SCHEMA = {
  type: "object",
  properties: {
    vi: { type: "string" },
    price: { type: "integer" },
    spice: { type: "integer", enum: [0, 1, 2, 3] },
    alg: { type: "array", items: { type: "string", enum: [...ALLERGEN_KEYS] } },
    pron: { type: "string" },
    name: ML_SCHEMA,
    desc: ML_SCHEMA,
  },
  required: ["vi", "price", "spice", "alg", "pron", "name", "desc"],
  additionalProperties: false,
};
const EXTRACT_SCHEMA = {
  type: "object",
  properties: { stall: { type: "string" }, dishes: { type: "array", items: DISH_SCHEMA } },
  required: ["stall", "dishes"],
  additionalProperties: false,
};
const TRANSLATE_SCHEMA = {
  type: "object",
  properties: { dishes: { type: "array", items: DISH_SCHEMA } },
  required: ["dishes"],
  additionalProperties: false,
};

/** A failure the vendor can act on. `code` picks the message in their screen language (strings.ts → ai). */
export class AiError extends Error {
  constructor(public code: AiCode, public status = 502) {
    super(code);
  }
}

let cached: Anthropic | null = null;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiError("off", 501);
  }
  // Retries are handled in ask(), where the time budget is known.
  return (cached ??= new Anthropic({ maxRetries: 0 }));
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
  throw new AiError("format");
}

/** Turns SDK failures into messages a vendor can act on; logs the ones only the owner can fix. */
function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.APIConnectionTimeoutError) {
    return new AiError("timeout", 504);
  }
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    console.error("[ai] Anthropic rejected the API key:", e.message);
    return new AiError("key", 501);
  }
  if (e instanceof Anthropic.NotFoundError) {
    console.error(`[ai] Model "${MODEL}" not found. Check ANTHROPIC_MODEL:`, e.message);
    return new AiError("model", 501);
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new AiError("busy", 503);
  }
  if (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500) {
    return new AiError("down", 503);
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new AiError("conn", 503);
  }
  console.error("[ai] unexpected error:", e);
  return new AiError("unknown");
}

const retryable = (e: unknown) =>
  e instanceof Anthropic.RateLimitError ||
  (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500) ||
  (e instanceof Anthropic.APIConnectionError && !(e instanceof Anthropic.APIConnectionTimeoutError));

/** A 400 that names the response format: the API rejected the schema itself, not the request. */
const schemaRejected = (e: unknown) =>
  e instanceof Anthropic.BadRequestError && /output_config|json_schema|schema|format/i.test(e.message);

async function ask(content: Anthropic.MessageParam["content"], schema: Record<string, unknown>): Promise<unknown> {
  const started = Date.now();
  const remaining = () => BUDGET_MS - (Date.now() - started);
  let useSchema = true;
  let retried = false;

  for (;;) {
    try {
      const res = await client().messages.create(
        {
          model: MODEL,
          max_tokens: 16000,
          messages: [{ role: "user", content }],
          output_config: { effort: EFFORT, ...(useSchema ? { format: { type: "json_schema" as const, schema } } : {}) },
        },
        { timeout: Math.max(5_000, remaining()) },
      );
      if (res.stop_reason === "refusal") {
        throw new AiError("refusal", 422);
      }
      if (res.stop_reason === "max_tokens") {
        throw new AiError("tooLong", 422);
      }
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      return parseJson(text);
    } catch (e) {
      if (useSchema && schemaRejected(e)) {
        // Never break photo reading over the schema: fall back to the prompt's JSON instructions.
        console.error("[ai] structured output rejected, retrying without it:", (e as Error).message);
        useSchema = false;
        continue;
      }
      if (!retried && retryable(e) && remaining() > 25_000) {
        retried = true;
        await new Promise((r) => setTimeout(r, 1_000));
        continue;
      }
      throw toAiError(e);
    }
  }
}

type ImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export async function extractMenu(base64: string, mediaType: ImageType): Promise<{ stall: string; dishes: Dish[] }> {
  const out = (await ask(
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      {
        type: "text",
        text: `This photo is a menu from a street-food stall in Ho Chi Minh City, Vietnam. Extract every dish and drink with its price. If a price is unreadable use 0. Ignore anything that is not a menu item.

Reply with only a JSON object: {"stall": the stall's name if visible else "", "dishes": [ ... ]}
${DISH_RULES}`,
      },
    ],
    EXTRACT_SCHEMA,
  )) as { stall?: unknown; dishes?: unknown };
  const dishes = (Array.isArray(out?.dishes) ? out.dishes : []).map(cleanDish).filter((d): d is Dish => !!d);
  if (!dishes.length) throw new AiError("noDishes", 422);
  return { stall: typeof out.stall === "string" ? out.stall.trim() : "", dishes };
}

export async function translateDishes(names: string[]): Promise<(Dish | null)[]> {
  const out = await ask(
    `These are dish names from a Ho Chi Minh City street-food stall: ${JSON.stringify(names)}
Reply with only a JSON object {"dishes": [ ... ]} with one dish object per name, in the same order.
${DISH_RULES}`,
    TRANSLATE_SCHEMA,
  );
  // The schema asks for {"dishes": [...]}; a bare array is also accepted from the no-schema fallback.
  const arr = Array.isArray(out) ? out : (out as { dishes?: unknown } | null)?.dishes;
  if (!Array.isArray(arr)) throw new AiError("format");
  return names.map((_, i) => cleanDish(arr[i]));
}
