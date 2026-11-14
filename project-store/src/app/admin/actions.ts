"use server";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { ADMIN_COOKIE, adminPassword, newSession, passwordMatches, SESSION_DAYS } from "@/lib/auth";
import { BRANCHES, CATEGORIES, INCLUDES, LEVELS, isStatus, type IncludeId } from "@/lib/catalog";
import {
  addPayment,
  decidePayment,
  deleteOrder,
  deletePayment,
  deleteProject,
  getOrder,
  getProject,
  getSettings,
  recentLoginFailures,
  recordLoginFailure,
  saveProject,
  saveSettings,
  setOrderStatus,
  setProjectActive,
  slugTaken,
  updateOrder,
} from "@/lib/data";
import { normalizeSettings, type Addon, type RushRule } from "@/lib/settings";
import { int, list, longText, normalizePhone, num, safeUrl, slugify, splitLines, splitList, text } from "@/lib/validate";

export type FormState = { error?: string; ok?: string } | null;

function refresh(token?: string) {
  revalidatePath("/admin", "layout");
  if (token) revalidatePath(`/track/${token}`);
}

// ── Sign in ────────────────────────────────────────────────────────────────────────────

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!adminPassword()) return { error: "Set ADMIN_PASSWORD in your hosting settings first, then redeploy." };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if ((await recentLoginFailures(ip)) >= 10) return { error: "Too many wrong passwords. Try again in 15 minutes." };
  if (!(await passwordMatches(text(fd, "password", 200)))) {
    await recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 700)); // slows down guessing
    return { error: "Wrong password." };
  }
  (await cookies()).set(ADMIN_COOKIE, await newSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ── Orders ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const order = await getOrder(int(fd, "id", 1, 2_000_000_000) ?? 0);
  if (!order) return { error: "Order not found." };
  const status = text(fd, "status", 20);
  if (!isStatus(status)) return { error: "Pick a status." };
  const priceText = text(fd, "price", 20);
  const price = priceText ? int(fd, "price", 0, 10_000_000) : null;
  if (priceText && price == null) return { error: "The price must be a number." };
  if (price == null && !["requested", "cancelled"].includes(status)) return { error: "Set the price before moving the order on." };
  const deliveryText = text(fd, "delivery", 1000);
  const deliveryLink = safeUrl(deliveryText);
  if (deliveryText && !deliveryLink) return { error: "The download link must be a web address (https://…)." };

  // Typing a price on a new idea means it's quoted: the student's page then asks for the advance.
  const quotedNow = status === "requested" && order.status === "requested" && price != null;
  await updateOrder(order.id, {
    status: quotedNow ? "quoted" : status,
    price,
    advancePercent: int(fd, "advance", 0, 100) ?? order.advancePercent,
    noteForStudent: longText(fd, "note", 2000),
    adminNotes: longText(fd, "adminNotes", 5000),
    deliveryLink,
  });
  refresh(order.token);
  const unpaid = (price ?? 0) - order.paid;
  return {
    ok: quotedNow
      ? "Saved. The student's page now shows the price and asks for the advance. Send them the price on WhatsApp."
      : status === "delivered" && !deliveryLink
        ? "Saved. Add a download link so the student can get the files from their order page."
        : status === "delivered" && unpaid > 0
          ? `Saved. Note: ₹${unpaid.toLocaleString("en-IN")} is still unpaid, and the student can now download the files.`
          : "Saved.",
  };
}

/** “Received” / “Not received” on a payment the student reported. */
export async function decidePaymentAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "payment", 1, 2_000_000_000);
  if (!id) return;
  await decidePayment(id, text(fd, "verdict", 10) === "yes");
  const order = await getOrder(int(fd, "order", 1, 2_000_000_000) ?? 0);
  refresh(order?.token);
}

export async function recordPaymentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const order = await getOrder(int(fd, "id", 1, 2_000_000_000) ?? 0);
  if (!order) return { error: "Order not found." };
  const amount = int(fd, "amount", 1, 10_000_000);
  if (!amount) return { error: "Enter the amount received." };
  const method = ["upi", "cash", "bank"].includes(text(fd, "method", 10)) ? text(fd, "method", 10) : "upi";
  await addPayment({ orderId: order.id, amount, utr: text(fd, "ref", 40).toUpperCase(), method, verified: true });
  refresh(order.token);
  return { ok: "Payment recorded." };
}

export async function deletePaymentAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "payment", 1, 2_000_000_000);
  if (id) await deletePayment(id);
  const order = await getOrder(int(fd, "order", 1, 2_000_000_000) ?? 0);
  refresh(order?.token);
}

export async function cancelOrderAction(fd: FormData) {
  await requireAdmin();
  const order = await getOrder(int(fd, "id", 1, 2_000_000_000) ?? 0);
  if (!order) return;
  await setOrderStatus(order.id, order.status === "cancelled" ? (order.price == null ? "requested" : "quoted") : "cancelled");
  refresh(order.token);
}

export async function deleteOrderAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id", 1, 2_000_000_000);
  if (id) await deleteOrder(id);
  refresh();
  redirect("/admin/orders");
}

// ── Projects ───────────────────────────────────────────────────────────────────────────

export async function saveProjectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id", 1, 2_000_000_000) ?? undefined;
  if (id && !(await getProject(id))) return { error: "This project no longer exists." };
  const title = text(fd, "title", 160);
  if (title.length < 3) return { error: "Give the project a title." };
  const slug = slugify(text(fd, "slug", 90) || title);
  if (await slugTaken(slug, id)) return { error: `Another project already uses the web address “${slug}”. Change the title or the address.` };
  const category = text(fd, "category", 20);
  if (!CATEGORIES.some((c) => c.id === category)) return { error: "Pick a domain." };
  const branches = list(fd, "branches").filter((b) => BRANCHES.some((x) => x.id === b));
  if (!branches.length) return { error: "Tick at least one branch." };
  const price = int(fd, "price", 0, 10_000_000);
  if (price == null) return { error: "Enter a price." };
  const level = text(fd, "level", 10);
  await saveProject(
    {
      slug,
      title,
      summary: text(fd, "summary", 240),
      description: longText(fd, "description", 6000),
      features: splitLines(longText(fd, "features", 3000), 20, 200),
      branches,
      category,
      level: LEVELS.some((l) => l.id === level) ? (level as "mini" | "major") : "major",
      difficulty: (int(fd, "difficulty", 1, 4) ?? 2) as 1 | 2 | 3 | 4,
      price,
      tech: splitList(text(fd, "tech", 600), 15, 60),
      includes: list(fd, "includes").filter((i): i is IncludeId => i in INCLUDES),
      deliveryDays: int(fd, "days", 1, 180) ?? 7,
      imageUrl: "",
      featured: !!text(fd, "featured"),
      active: !!text(fd, "active"),
    },
    id,
  );
  refresh();
  revalidatePath("/", "layout");
  redirect(`/admin/projects?saved=${encodeURIComponent(title)}`);
}

export async function toggleProjectAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id", 1, 2_000_000_000);
  if (id) await setProjectActive(id, text(fd, "active", 5) === "1");
  refresh();
  revalidatePath("/", "layout");
}

export async function deleteProjectAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id", 1, 2_000_000_000);
  if (id) await deleteProject(id);
  refresh();
  revalidatePath("/", "layout");
  redirect("/admin/projects");
}

// ── Settings ───────────────────────────────────────────────────────────────────────────

export async function saveSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const current = await getSettings();

  const waText = text(fd, "whatsapp", 24);
  const whatsapp = waText ? normalizePhone(waText) : "";
  if (whatsapp == null) return { error: "The WhatsApp number doesn't look right. Use 10 digits, e.g. 98765 43210." };
  const upiId = text(fd, "upiId", 80).replace(/\s/g, "");
  if (upiId && !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9]{2,64}$/.test(upiId)) return { error: "A UPI ID looks like yourname@okaxis or 9876543210@ybl." };

  const addons: Addon[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const name = text(fd, `addon_name_${i}`, 120);
    if (!name) continue;
    let id = text(fd, `addon_id_${i}`, 40) || slugify(name).slice(0, 40);
    while (used.has(id)) id = `${id}-2`;
    used.add(id);
    addons.push({ id, name, price: int(fd, `addon_price_${i}`, 0, 1_000_000) ?? 0 });
  }
  const rush: RushRule[] = [];
  for (let i = 0; i < 5; i++) {
    const days = int(fd, `rush_days_${i}`, 0, 365);
    const percent = int(fd, `rush_pct_${i}`, 0, 300);
    if (days && percent) rush.push({ days, percent });
  }

  const next = normalizeSettings({
    ...current,
    brandName: text(fd, "brandName", 60) || current.brandName,
    tagline: text(fd, "tagline", 120),
    whatsapp,
    email: text(fd, "email", 120),
    city: text(fd, "city", 80),
    announcement: text(fd, "announcement", 200),
    upiId,
    upiName: text(fd, "upiName", 80),
    advancePercent: int(fd, "advancePercent", 0, 100) ?? current.advancePercent,
    tierPrices: [1, 2, 3, 4].map((l) => int(fd, `tier_${l}`, 0, 10_000_000) ?? current.tierPrices[l - 1]),
    factors: Object.fromEntries(CATEGORIES.map((c) => [c.id, num(fd, `factor_${c.id}`, 0.1, 20, current.factors[c.id])])),
    rush,
    addons,
    policies: longText(fd, "policies", 20000) || current.policies,
  });
  await saveSettings(next);
  refresh();
  revalidatePath("/", "layout");
  return { ok: "Settings saved. The store uses them right away." };
}
