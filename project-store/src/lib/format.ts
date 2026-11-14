const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹12,500 · ₹1,25,000 (Indian digit grouping). */
export function inr(n: number | null | undefined) {
  return "₹" + inrFmt.format(Math.round(Number(n) || 0));
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function dateIN(d: Date | string | null | undefined) {
  if (!d) return "";
  const v = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00+05:30") : new Date(d);
  return Number.isNaN(v.getTime()) ? "" : dateFmt.format(v);
}

export function dateTimeIN(d: Date | string | null | undefined) {
  if (!d) return "";
  const v = new Date(d);
  return Number.isNaN(v.getTime()) ? "" : dateTimeFmt.format(v);
}

export function timeAgo(d: Date | string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} d ago`;
  return dateIN(d);
}

/** +91 98765 43210 for Indian numbers, +<digits> otherwise. */
export function phonePretty(digits: string) {
  const d = (digits || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return d ? "+" + d : "";
}

export function plural(n: number, one: string, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}
