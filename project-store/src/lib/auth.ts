/**
 * Owner sign-in for /admin. One password (ADMIN_PASSWORD); a signed cookie keeps the owner
 * signed in for 30 days. Uses Web Crypto so the same code runs in middleware and on the server.
 * Changing ADMIN_PASSWORD signs every device out.
 */

export const ADMIN_COOKIE = "ps_admin";
export const SESSION_DAYS = 30;

/** In development a missing password falls back to "admin"; in production the owner screens stay locked. */
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== "production" ? "admin" : "");
}

function key() {
  const p = adminPassword();
  return p ? `session:${p}:${process.env.SESSION_SECRET || ""}` : "";
}

function base64url(bytes: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

function sameString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function passwordMatches(input: string) {
  const p = adminPassword();
  if (!p || !input) return false;
  // Compare fixed-length digests so the check takes the same time whatever was typed.
  const [a, b] = await Promise.all([hmac("pw", input), hmac("pw", p)]);
  return sameString(a, b);
}

export async function newSession() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400;
  return `${exp}.${await hmac(key(), "admin." + exp)}`;
}

export async function validSession(value: string | undefined) {
  const k = key();
  if (!k || !value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) * 1000 < Date.now()) return false;
  return sameString(sig, await hmac(k, "admin." + exp));
}
