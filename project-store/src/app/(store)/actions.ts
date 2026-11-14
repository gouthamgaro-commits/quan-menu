"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { BRANCHES, CATEGORIES, YEARS, categoryName, difficultyName } from "@/lib/catalog";
import {
  addPayment,
  createOrder,
  findOrderToken,
  getOrderByToken,
  getProjectBySlug,
  getSettings,
  recentOrdersFromPhone,
  recentOrdersTotal,
  recentPaymentSubmissions,
  utrUsed,
} from "@/lib/data";
import { inr, phonePretty } from "@/lib/format";
import { notifyOwner } from "@/lib/notify";
import { daysUntil, estimateIdea, pickAddons, todayIST } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import { int, isEmail, list, longText, normalizePhone, safeUrl, text } from "@/lib/validate";

export type FormState = { error?: string; ok?: string } | null;

function readContact(fd: FormData) {
  const studentName = text(fd, "name", 80);
  if (studentName.length < 2) return { error: "Please enter your name." } as const;
  const phone = normalizePhone(text(fd, "phone", 24));
  if (!phone) return { error: "Please enter a valid WhatsApp number (10 digits)." } as const;
  const email = text(fd, "email", 120);
  if (email && !isEmail(email)) return { error: "That email address doesn't look right." } as const;
  const branch = text(fd, "branch", 20);
  const year = text(fd, "year", 30);
  return {
    contact: {
      studentName,
      phone,
      email,
      college: text(fd, "college", 120),
      branch: BRANCHES.some((b) => b.id === branch) ? branch : "",
      year: (YEARS as readonly string[]).includes(year) ? year : "",
    },
    teamSize: int(fd, "team", 1, 10) ?? 1,
  } as const;
}

function readDeadline(fd: FormData): { deadline: string | null } | { error: string } {
  const d = text(fd, "deadline", 10);
  if (!d) return { deadline: null };
  const days = daysUntil(d, todayIST());
  if (days == null) return { error: "Please pick a valid deadline." };
  if (days < 0) return { error: "The deadline is in the past. Pick a date from today onwards." };
  if (days > 400) return { error: "Please pick a deadline within the next year." };
  return { deadline: d };
}

async function checkLimits(phone: string): Promise<string | null> {
  if ((await recentOrdersFromPhone(phone, 60)) >= 5)
    return "You've sent several orders in the last hour. Message us on WhatsApp if you need more.";
  if ((await recentOrdersTotal(10)) >= 60) return "We're getting a lot of orders right now. Please try again in a few minutes.";
  return null;
}

/** A student orders a ready-made project from the catalogue. The price is fixed, so it waits for the advance. */
export async function placeOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  if (text(fd, "website")) return { error: "Something went wrong. Please try again." }; // filled only by bots
  const project = await getProjectBySlug(text(fd, "slug", 100));
  if (!project || !project.active) return { error: "This project is no longer available. Please pick another one." };
  const c = readContact(fd);
  if ("error" in c) return { error: c.error };
  const dl = readDeadline(fd);
  if ("error" in dl) return { error: dl.error };
  if (!text(fd, "agree")) return { error: "Please accept the payment and refund policy." };
  const limited = await checkLimits(c.contact.phone);
  if (limited) return { error: limited };

  const s = await getSettings();
  const addons = pickAddons(s, list(fd, "addons"));
  const price = project.price + addons.reduce((sum, a) => sum + a.price, 0);
  const notes = longText(fd, "notes", 2000);
  const { code, token } = await createOrder({
    kind: "catalog",
    projectId: project.id,
    title: project.title,
    details: { addons, notes, teamSize: c.teamSize, basePrice: project.price },
    ...c.contact,
    status: "quoted",
    price,
    estimateLow: null,
    estimateHigh: null,
    advancePercent: s.advancePercent,
    deadline: dl.deadline,
  });
  const base = await siteUrl();
  after(() =>
    notifyOwner(
      `🛒 New order ${code}\n${project.title}\n${inr(price)}${addons.length ? ` (incl. ${addons.map((a) => a.name).join(", ")})` : ""}\n` +
        `${c.contact.studentName} · ${phonePretty(c.contact.phone)}${c.contact.college ? ` · ${c.contact.college}` : ""}\n${base}/admin`,
    ),
  );
  redirect(`/track/${token}?new=1`);
}

/** A student sends their own idea. It gets an instant estimate; the owner confirms the final price. */
export async function submitIdea(_prev: FormState, fd: FormData): Promise<FormState> {
  if (text(fd, "website")) return { error: "Something went wrong. Please try again." };
  const title = text(fd, "title", 140);
  if (title.length < 5) return { error: "Give your project a short title (at least 5 letters)." };
  const idea = longText(fd, "idea", 4000);
  if (idea.length < 20) return { error: "Describe your idea in a few sentences so we can price it." };
  const category = text(fd, "category", 20);
  if (!CATEGORIES.some((x) => x.id === category)) return { error: "Pick the domain that fits your project." };
  const difficulty = int(fd, "difficulty", 1, 4);
  if (!difficulty) return { error: "Pick how difficult the project is." };
  const c = readContact(fd);
  if ("error" in c) return { error: c.error };
  const dl = readDeadline(fd);
  if ("error" in dl) return { error: dl.error };
  const referenceRaw = text(fd, "reference", 500);
  const reference = safeUrl(referenceRaw);
  if (referenceRaw && !reference) return { error: "The reference link doesn't look like a web address." };
  if (!text(fd, "agree")) return { error: "Please accept the payment and refund policy." };
  const limited = await checkLimits(c.contact.phone);
  if (limited) return { error: limited };

  const s = await getSettings();
  const est = estimateIdea(s, { difficulty, category, deadline: dl.deadline, addons: list(fd, "addons") }, todayIST());
  const budget = int(fd, "budget", 0, 10_000_000);
  const { code, token } = await createOrder({
    kind: "custom",
    projectId: null,
    title,
    details: {
      idea,
      category,
      difficulty,
      budget,
      reference,
      addons: est.addons,
      teamSize: c.teamSize,
      rushPercent: est.rushPercent,
    },
    ...c.contact,
    status: "requested",
    price: null,
    estimateLow: est.low,
    estimateHigh: est.high,
    advancePercent: s.advancePercent,
    deadline: dl.deadline,
  });
  const base = await siteUrl();
  after(() =>
    notifyOwner(
      `💡 New idea ${code}: ${title}\n${categoryName(category)} · ${difficultyName(difficulty)} · estimate ${inr(est.low)}–${inr(est.high)}` +
        `${budget ? ` · budget ${inr(budget)}` : ""}${dl.deadline ? ` · by ${dl.deadline}` : ""}\n` +
        `${c.contact.studentName} · ${phonePretty(c.contact.phone)}\nQuote it: ${base}/admin`,
    ),
  );
  redirect(`/track/${token}?new=1`);
}

/** The student reports a UPI payment by its transaction number; the owner checks it in their bank app. */
export async function submitPayment(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = text(fd, "token", 60);
  const order = await getOrderByToken(token);
  if (!order) return { error: "Order not found." };
  if (order.status === "cancelled") return { error: "This order was cancelled. Message us on WhatsApp." };
  if (order.price == null) return { error: "Please wait until the price is confirmed." };
  const amount = int(fd, "amount", 1, 10_000_000);
  if (!amount) return { error: "Enter the amount you paid." };
  const utr = text(fd, "utr", 40).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (utr.length < 6) return { error: "Enter the UPI transaction ID (UTR). It's in your payment app's receipt, usually 12 digits." };
  if (await utrUsed(utr)) return { error: "This transaction ID has already been sent. We're checking it." };
  if ((await recentPaymentSubmissions(order.id, 60)) >= 5) return { error: "Too many attempts. Please message us on WhatsApp." };

  await addPayment({ orderId: order.id, amount, utr, method: "upi", verified: false });
  const base = await siteUrl();
  after(() =>
    notifyOwner(`💰 Payment to check: ${inr(amount)} for ${order.code} (${order.title})\nUTR ${utr} · ${order.studentName}\n${base}/admin`),
  );
  revalidatePath(`/track/${token}`);
  return { ok: "Thanks! We'll check the payment and update your order, usually within a few hours." };
}

/** Finds an order from its code and the phone number used. */
export async function findOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  const code = text(fd, "code", 20).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const phone = normalizePhone(text(fd, "phone", 24));
  if (code.length < 4 || !phone) return { error: "Enter your order code and the WhatsApp number you ordered with." };
  const token = await findOrderToken(code, phone);
  if (!token) return { error: "We couldn't find an order with that code and number. Check both and try again." };
  redirect(`/track/${token}`);
}
