/** Helpers for reading form fields safely on the server. */

export function text(fd: FormData, key: string, max = 200) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Multi-line text: trims each line, keeps line breaks, collapses runs of blank lines. */
export function longText(fd: FormData, key: string, max = 5000) {
  return text(fd, key, max * 2)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, max);
}

export function int(fd: FormData, key: string, min: number, max: number): number | null {
  const raw = text(fd, key, 30).replace(/[,₹\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function num(fd: FormData, key: string, min: number, max: number, fallback: number): number {
  const n = Number(text(fd, key, 30).replace(/[,₹\s%×x]/g, ""));
  return Number.isFinite(n) && text(fd, key) !== "" ? Math.min(max, Math.max(min, n)) : fallback;
}

export function list(fd: FormData, key: string, max = 30, maxLen = 80): string[] {
  return fd
    .getAll(key)
    .map((v) => (typeof v === "string" ? v.trim().slice(0, maxLen) : ""))
    .filter(Boolean)
    .slice(0, max);
}

/** Splits "a, b, c" or one-per-line text into a clean list. */
export function splitList(s: string, max = 30, maxLen = 120) {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim().replace(/^[-•*]\s*/, "").slice(0, maxLen))
    .filter(Boolean)
    .slice(0, max);
}

/** One item per line (commas inside an item are kept). */
export function splitLines(s: string, max = 30, maxLen = 200) {
  return s
    .split("\n")
    .map((x) => x.trim().replace(/^[-•*]\s*/, "").slice(0, maxLen))
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Phone number → digits with country code. A 10-digit Indian mobile (with or without +91 / 0)
 * becomes 91XXXXXXXXXX. Other countries are accepted with their country code.
 */
export function normalizePhone(input: string): string | null {
  let d = (input || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) return /^[6-9]/.test(d) ? "91" + d : null;
  if (d.length === 12 && d.startsWith("91")) return /^[6-9]/.test(d.slice(2)) ? d : null;
  if (d.length >= 11 && d.length <= 15 && !d.startsWith("91")) return d;
  return null;
}

export function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/** Only http(s) links, so nothing typed into a form can become a javascript: link. */
export function safeUrl(s: string): string {
  if (!s) return "";
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(s) ? s : "https://" + s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function slugify(s: string) {
  return (
    (s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "project"
  );
}
