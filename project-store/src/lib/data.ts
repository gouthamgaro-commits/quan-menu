import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { BUDGETS, type LevelId, type Status } from "./catalog";
import { sql, transaction, type Query } from "./db";
import { normalizeSettings, type Settings } from "./settings";
import type { Message, Order, OrderDetails, Payment, Project, ReferralReward, Review, SquadMember } from "./types";

// ── Rows → objects ─────────────────────────────────────────────────────────────────────

type ProjectRow = {
  id: number; slug: string; title: string; summary: string; description: string; features: string[];
  branches: string[]; category: string; level: LevelId; difficulty: number; price: number;
  tech: string[]; includes: string[]; delivery_days: number; image_url: string; demo_url: string | null;
  live_url: string | null; featured: boolean;
  active: boolean; orders_count: number; created_at: Date; updated_at: Date;
};

function toProject(r: ProjectRow): Project {
  return {
    id: r.id, slug: r.slug, title: r.title, summary: r.summary, description: r.description,
    features: r.features ?? [], branches: r.branches ?? [], category: r.category, level: r.level,
    difficulty: Math.min(4, Math.max(1, Number(r.difficulty))) as Project["difficulty"],
    price: Number(r.price), tech: r.tech ?? [], includes: r.includes ?? [],
    deliveryDays: Number(r.delivery_days), imageUrl: r.image_url ?? "", demoUrl: r.demo_url ?? "",
    liveUrl: r.live_url ?? "", featured: r.featured,
    active: r.active, ordersCount: Number(r.orders_count), createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

type OrderRow = {
  id: number; code: string; token: string; kind: "catalog" | "custom"; project_id: number | null;
  project_slug: string | null; title: string; details: OrderDetails; student_name: string; phone: string;
  email: string; college: string; branch: string; year: string; status: Status; price: number | null;
  estimate_low: number | null; estimate_high: number | null; advance_percent: number;
  deadline_text: string | null; note_for_student: string; admin_notes: string; delivery_link: string;
  created_at: Date; updated_at: Date; paid: number | string | null; pending: number | string | null; unread: boolean;
  ref_code: string | null; referred_by: number | null; discount: number | null;
};

function toOrder(r: OrderRow): Order {
  return {
    id: r.id, code: r.code, token: r.token, kind: r.kind, projectId: r.project_id, projectSlug: r.project_slug,
    title: r.title, details: r.details ?? {}, studentName: r.student_name, phone: r.phone, email: r.email,
    college: r.college, branch: r.branch, year: r.year, status: r.status,
    price: r.price == null ? null : Number(r.price),
    estimateLow: r.estimate_low == null ? null : Number(r.estimate_low),
    estimateHigh: r.estimate_high == null ? null : Number(r.estimate_high),
    advancePercent: Number(r.advance_percent), deadline: r.deadline_text,
    noteForStudent: r.note_for_student, adminNotes: r.admin_notes, deliveryLink: r.delivery_link,
    createdAt: r.created_at, updatedAt: r.updated_at, paid: Number(r.paid ?? 0), pending: Number(r.pending ?? 0),
    unread: !!r.unread, refCode: r.ref_code ?? "", referredBy: r.referred_by, discount: Number(r.discount ?? 0),
  };
}

type PaymentRow = {
  id: number; order_id: number; amount: number; utr: string; method: string;
  status: Payment["status"]; created_at: Date; decided_at: Date | null; seat: number | null;
};

function toPayment(r: PaymentRow): Payment {
  return {
    id: r.id, orderId: r.order_id, amount: Number(r.amount), utr: r.utr, method: r.method,
    status: r.status, createdAt: r.created_at, decidedAt: r.decided_at, seat: r.seat == null ? null : Number(r.seat),
  };
}

// ── Settings ───────────────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const rows = await sql<{ data: unknown }>("select data from store.settings where id = 1");
  return normalizeSettings(rows[0]?.data);
}

export async function saveSettings(s: Settings) {
  await sql(
    `insert into store.settings (id, data, updated_at) values (1, $1, now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [JSON.stringify(s)],
  );
}

// ── Projects ───────────────────────────────────────────────────────────────────────────

export type ProjectFilters = {
  q?: string;
  branch?: string;
  category?: string;
  difficulty?: number;
  level?: string;
  budget?: string;
  sort?: string;
  includeHidden?: boolean;
  limit?: number;
};

export const SORTS = [
  { id: "popular", name: "trending 🔥" },
  { id: "price-asc", name: "cheapest first" },
  { id: "price-desc", name: "priciest first" },
  { id: "easy", name: "easiest first" },
  { id: "new", name: "newest" },
] as const;

export async function listProjects(f: ProjectFilters = {}): Promise<Project[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replaceAll("?", "$" + params.length));
  };
  if (!f.includeHidden) where.push("active");
  if (f.q?.trim()) {
    const words = f.q.trim().toLowerCase().split(/\s+/).slice(0, 6);
    for (const w of words) {
      add(
        "(lower(title) like ? or lower(summary) like ? or lower(array_to_string(tech, ' ')) like ? or lower(description) like ?)",
        "%" + w.replace(/[\\%_]/g, (c) => "\\" + c) + "%",
      );
    }
  }
  if (f.branch) add("? = any(branches)", f.branch);
  if (f.category) add("category = ?", f.category);
  if (f.difficulty) add("difficulty = ?", f.difficulty);
  if (f.level) add("level = ?", f.level);
  const budget = BUDGETS.find((b) => b.id === f.budget);
  if (budget) {
    add("price >= ?", budget.min);
    add("price <= ?", budget.max);
  }
  const order =
    f.sort === "price-asc" ? "price asc, title"
    : f.sort === "price-desc" ? "price desc, title"
    : f.sort === "easy" ? "difficulty asc, price asc"
    : f.sort === "new" ? "created_at desc, id desc"
    : "featured desc, orders_count desc, id asc";
  const limit = Math.min(500, Math.max(1, f.limit ?? 200));
  const rows = await sql<ProjectRow>(
    `select * from store.projects ${where.length ? "where " + where.join(" and ") : ""} order by ${order} limit ${limit}`,
    params,
  );
  return rows.map(toProject);
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const rows = await sql<ProjectRow>("select * from store.projects where slug = $1", [slug]);
  return rows[0] ? toProject(rows[0]) : null;
}

export async function getProject(id: number): Promise<Project | null> {
  const rows = await sql<ProjectRow>("select * from store.projects where id = $1", [id]);
  return rows[0] ? toProject(rows[0]) : null;
}

export async function relatedProjects(p: Project, limit = 3): Promise<Project[]> {
  const rows = await sql<ProjectRow>(
    `select * from store.projects
     where active and id <> $1 and (category = $2 or branches && $3)
     order by (category = $2) desc, featured desc, abs(price - $4) asc
     limit $5`,
    [p.id, p.category, p.branches, p.price, limit],
  );
  return rows.map(toProject);
}

/** How many live projects each track has, for the home page. */
export async function categoryCounts(): Promise<Record<string, number>> {
  const rows = await sql<{ category: string; n: number }>(
    "select category, count(*)::int as n from store.projects where active group by category",
  );
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.n)]));
}

/** How many live projects each branch has, for the home page. */
export async function branchCounts(): Promise<Record<string, number>> {
  const rows = await sql<{ b: string; n: number }>(
    "select b, count(*)::int as n from store.projects, unnest(branches) as b where active group by b",
  );
  return Object.fromEntries(rows.map((r) => [r.b, Number(r.n)]));
}

export async function countProjects() {
  const rows = await sql<{ n: number }>("select count(*)::int as n from store.projects where active");
  return Number(rows[0]?.n ?? 0);
}

export type ProjectInput = Omit<Project, "id" | "ordersCount" | "createdAt" | "updatedAt">;

export async function saveProject(p: ProjectInput, id?: number): Promise<number> {
  const values = [
    p.slug, p.title, p.summary, p.description, p.features, p.branches, p.category, p.level, p.difficulty,
    p.price, p.tech, p.includes, p.deliveryDays, p.imageUrl, p.featured, p.active, p.demoUrl, p.liveUrl,
  ];
  if (id) {
    await sql(
      `update store.projects set slug = $1, title = $2, summary = $3, description = $4, features = $5,
         branches = $6, category = $7, level = $8, difficulty = $9, price = $10, tech = $11, includes = $12,
         delivery_days = $13, image_url = $14, featured = $15, active = $16, demo_url = $17, live_url = $18,
         updated_at = now()
       where id = $19`,
      [...values, id],
    );
    return id;
  }
  const rows = await sql<{ id: number }>(
    `insert into store.projects (slug, title, summary, description, features, branches, category, level,
       difficulty, price, tech, includes, delivery_days, image_url, featured, active, demo_url, live_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) returning id`,
    values,
  );
  return rows[0].id;
}

export async function slugTaken(slug: string, exceptId?: number) {
  const rows = await sql("select 1 from store.projects where slug = $1 and id <> $2", [slug, exceptId ?? 0]);
  return rows.length > 0;
}

export async function setProjectActive(id: number, active: boolean) {
  await sql("update store.projects set active = $2, updated_at = now() where id = $1", [id, active]);
}

export async function deleteProject(id: number) {
  await sql("delete from store.projects where id = $1", [id]);
}

// ── Orders ─────────────────────────────────────────────────────────────────────────────

const ORDER_SELECT = `
  select o.*, o.deadline::text as deadline_text, p.slug as project_slug,
    coalesce((select sum(amount) from store.payments where order_id = o.id and status = 'verified'), 0)::int as paid,
    coalesce((select sum(amount) from store.payments where order_id = o.id and status = 'submitted'), 0)::int as pending,
    exists (select 1 from store.messages m where m.order_id = o.id and m.sender = 'student'
            and m.created_at > coalesce(o.owner_read_at, '-infinity'::timestamptz)) as unread
  from store.orders o left join store.projects p on p.id = o.project_id`;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

function newCode(length = 6) {
  let s = "";
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

/** A referral code friends can remember: the student's first name and four random characters, e.g. RAHUL-K7QM. */
function newRefCode(name: string) {
  const first = (name || "").trim().split(/\s+/)[0] ?? "";
  const base = first.normalize("NFKD").replace(/[^A-Za-z]/g, "").slice(0, 8).toUpperCase() || "PLUG";
  return `${base}-${newCode(4)}`;
}

/** What a student typed as a friend's code, cleaned up for lookup. */
export function normalizeRefCode(input: string) {
  return (input || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
}

export type NewOrder = {
  kind: "catalog" | "custom";
  projectId: number | null;
  title: string;
  details: OrderDetails;
  studentName: string;
  phone: string;
  email: string;
  college: string;
  branch: string;
  year: string;
  status: Status;
  price: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  advancePercent: number;
  deadline: string | null;
  /** The order whose referral code was used, and the discount it gave. */
  referredBy?: number | null;
  discount?: number;
};

/** The student's opening message, e.g. an offer instead of the listed price. */
export type FirstMessage = { body: string; offer: number | null; accepted?: boolean; reply?: string };

/** Saves a new order (and the student's first message, if any) and returns its code and secret link token. */
export async function createOrder(o: NewOrder, first?: FirstMessage): Promise<{ code: string; token: string }> {
  for (let attempt = 0; ; attempt++) {
    const code = newCode();
    const token = randomBytes(16).toString("base64url");
    const refCode = newRefCode(o.studentName);
    try {
      await transaction(async (query) => {
        const [row] = await query<{ id: number }>(
          `insert into store.orders (code, token, kind, project_id, title, details, student_name, phone, email,
             college, branch, year, status, price, estimate_low, estimate_high, advance_percent, deadline,
             ref_code, referred_by, discount)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           returning id`,
          [
            code, token, o.kind, o.projectId, o.title, JSON.stringify(o.details), o.studentName, o.phone, o.email,
            o.college, o.branch, o.year, o.status, o.price, o.estimateLow, o.estimateHigh, o.advancePercent,
            o.deadline, refCode, o.referredBy ?? null, Math.max(0, Math.round(o.discount ?? 0)),
          ],
        );
        if (first && (first.body || first.offer)) {
          await query(
            `insert into store.messages (order_id, sender, body, offer, offer_status) values ($1, 'student', $2, $3, $4)`,
            [row.id, first.body, first.offer, first.offer ? (first.accepted ? "accepted" : "open") : null],
          );
          if (first.reply) {
            await query(`insert into store.messages (order_id, sender, body) values ($1, 'owner', $2)`, [row.id, first.reply]);
          }
        }
        if (o.projectId) {
          await query("update store.projects set orders_count = orders_count + 1 where id = $1", [o.projectId]);
        }
      });
      return { code, token };
    } catch (e) {
      // A clash with an existing code (order or referral) is very unlikely; try other ones.
      if ((e as { code?: string }).code === "23505" && attempt < 4) continue;
      throw e;
    }
  }
}

/** Orders recently placed from this phone, to stop one person flooding the system. */
export async function recentOrdersFromPhone(phone: string, minutes = 60) {
  const rows = await sql<{ n: number }>(
    "select count(*)::int as n from store.orders where phone = $1 and created_at > now() - make_interval(mins => $2)",
    [phone, minutes],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function recentOrdersTotal(minutes = 10) {
  const rows = await sql<{ n: number }>(
    "select count(*)::int as n from store.orders where created_at > now() - make_interval(mins => $1)",
    [minutes],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function getOrderByToken(token: string): Promise<Order | null> {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return null;
  const rows = await sql<OrderRow>(`${ORDER_SELECT} where o.token = $1`, [token]);
  return rows[0] ? toOrder(rows[0]) : null;
}

export async function getOrder(id: number): Promise<Order | null> {
  const rows = await sql<OrderRow>(`${ORDER_SELECT} where o.id = $1`, [id]);
  return rows[0] ? toOrder(rows[0]) : null;
}

/** Finds an order from the code and phone number the student typed. */
export async function findOrderToken(code: string, phone: string): Promise<string | null> {
  const rows = await sql<{ token: string }>(
    "select token from store.orders where code = $1 and right(phone, 10) = right($2, 10)",
    [code.toUpperCase().replace(/[^A-Z0-9]/g, ""), phone],
  );
  return rows[0]?.token ?? null;
}

export async function listOrders(f: { status?: string; q?: string; limit?: number } = {}): Promise<Order[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.status === "payments") {
    where.push("exists (select 1 from store.payments x where x.order_id = o.id and x.status = 'submitted')");
  } else if (f.status === "messages") {
    where.push(
      "exists (select 1 from store.messages m where m.order_id = o.id and m.sender = 'student' and m.created_at > coalesce(o.owner_read_at, '-infinity'::timestamptz))",
    );
  } else if (f.status === "open") {
    where.push("o.status not in ('delivered', 'cancelled')");
  } else if (f.status) {
    params.push(f.status);
    where.push(`o.status = $${params.length}`);
  }
  if (f.q?.trim()) {
    params.push("%" + f.q.trim().toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c) + "%");
    const n = params.length;
    where.push(
      `(lower(o.code) like $${n} or lower(o.student_name) like $${n} or o.phone like $${n} or lower(o.title) like $${n} or lower(o.college) like $${n})`,
    );
  }
  const limit = Math.min(500, Math.max(1, f.limit ?? 200));
  const rows = await sql<OrderRow>(
    `${ORDER_SELECT} ${where.length ? "where " + where.join(" and ") : ""} order by o.created_at desc limit ${limit}`,
    params,
  );
  return rows.map(toOrder);
}

// ── Messages & offers ──────────────────────────────────────────────────────────────────

type MessageRow = {
  id: number; order_id: number; sender: Message["sender"]; body: string; offer: number | null;
  offer_status: Message["offerStatus"]; created_at: Date;
};

function toMessage(r: MessageRow): Message {
  return {
    id: r.id, orderId: r.order_id, sender: r.sender, body: r.body, offer: r.offer == null ? null : Number(r.offer),
    offerStatus: r.offer_status, createdAt: r.created_at,
  };
}

export async function listMessages(orderId: number): Promise<Message[]> {
  const rows = await sql<MessageRow>("select * from store.messages where order_id = $1 order by id", [orderId]);
  return rows.map(toMessage);
}

/** Adds a message. A new offer replaces any offer still waiting for an answer. */
export async function addMessage(orderId: number, sender: Message["sender"], body: string, offer: number | null) {
  await transaction(async (query) => {
    if (offer) {
      await query("update store.messages set offer_status = 'replaced' where order_id = $1 and offer_status = 'open'", [orderId]);
    }
    await query(
      "insert into store.messages (order_id, sender, body, offer, offer_status) values ($1, $2, $3, $4, $5)",
      [orderId, sender, body, offer, offer ? "open" : null],
    );
    await query("update store.orders set updated_at = now() where id = $1", [orderId]);
  });
}

/**
 * Accepts or declines an open offer. Only the other side can answer an offer. Accepting sets the
 * order's price, and an order that was still being discussed then waits for the advance.
 * Returns false when the offer can no longer be answered.
 */
export async function answerOffer(messageId: number, orderId: number, by: Message["sender"], accept: boolean) {
  return transaction(async (query) => {
    const [m] = await query<{ offer: number }>(
      `select offer from store.messages
       where id = $1 and order_id = $2 and offer_status = 'open' and sender <> $3 for update`,
      [messageId, orderId, by],
    );
    if (!m) return false;
    if (accept) {
      const updated = await query(
        `update store.orders set price = $2, status = 'quoted', updated_at = now()
         where id = $1 and status in ('requested', 'quoted') returning id`,
        [orderId, m.offer],
      );
      if (!updated.length) return false;
    }
    await query("update store.messages set offer_status = $2 where id = $1", [messageId, accept ? "accepted" : "declined"]);
    return true;
  });
}

export async function markOwnerRead(orderId: number) {
  await sql("update store.orders set owner_read_at = now() where id = $1", [orderId]);
}

export async function recentMessagesFrom(orderId: number, sender: Message["sender"], minutes = 60) {
  const rows = await sql<{ n: number }>(
    "select count(*)::int as n from store.messages where order_id = $1 and sender = $2 and created_at > now() - make_interval(mins => $3)",
    [orderId, sender, minutes],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function orderCounts(): Promise<Record<string, number>> {
  const rows = await sql<{ status: string; n: number }>(
    "select status, count(*)::int as n from store.orders group by status",
  );
  const counts: Record<string, number> = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  const pay = await sql<{ n: number }>(
    "select count(distinct order_id)::int as n from store.payments where status = 'submitted'",
  );
  counts.payments = Number(pay[0]?.n ?? 0);
  const unread = await sql<{ n: number }>(
    `select count(*)::int as n from store.orders o where exists (select 1 from store.messages m
       where m.order_id = o.id and m.sender = 'student' and m.created_at > coalesce(o.owner_read_at, '-infinity'::timestamptz))`,
  );
  counts.messages = Number(unread[0]?.n ?? 0);
  const extra = await sql<{ reviews: number; rewards: number }>(
    `select (select count(*) from store.reviews where status = 'pending')::int as reviews,
            (select count(*) from store.referral_rewards where status = 'owed')::int as rewards`,
  );
  counts.reviews = Number(extra[0]?.reviews ?? 0);
  counts.rewards = Number(extra[0]?.rewards ?? 0);
  counts.all = rows.reduce((s, r) => s + Number(r.n), 0);
  counts.open = rows.filter((r) => r.status !== "delivered" && r.status !== "cancelled").reduce((s, r) => s + Number(r.n), 0);
  return counts;
}

export type OrderPatch = {
  status: Status;
  price: number | null;
  discount: number;
  advancePercent: number;
  noteForStudent: string;
  adminNotes: string;
  deliveryLink: string;
};

export async function updateOrder(id: number, p: OrderPatch) {
  await transaction(async (query) => {
    await query(
      `update store.orders set status = $2, price = $3, advance_percent = $4, note_for_student = $5,
         admin_notes = $6, delivery_link = $7, discount = $8, updated_at = now()
       where id = $1`,
      [id, p.status, p.price, p.advancePercent, p.noteForStudent, p.adminNotes, p.deliveryLink, p.discount],
    );
    await rewardReferrer(query, id);
  });
}

export async function setOrderStatus(id: number, status: Status) {
  await sql("update store.orders set status = $2, updated_at = now() where id = $1", [id, status]);
}

export async function deleteOrder(id: number) {
  await sql("delete from store.orders where id = $1", [id]);
}

// ── Payments ───────────────────────────────────────────────────────────────────────────

export async function listPayments(orderId: number): Promise<Payment[]> {
  const rows = await sql<PaymentRow>("select * from store.payments where order_id = $1 order by created_at", [orderId]);
  return rows.map(toPayment);
}

export async function recentPaymentSubmissions(orderId: number, minutes = 60) {
  const rows = await sql<{ n: number }>(
    "select count(*)::int as n from store.payments where order_id = $1 and created_at > now() - make_interval(mins => $2)",
    [orderId, minutes],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function utrUsed(utr: string) {
  const rows = await sql("select 1 from store.payments where utr = $1 and status <> 'rejected'", [utr]);
  return rows.length > 0;
}

export async function addPayment(p: {
  orderId: number;
  amount: number;
  utr: string;
  method: string;
  verified: boolean;
  seat?: number | null;
}) {
  await transaction(async (query) => {
    await query(
      `insert into store.payments (order_id, amount, utr, method, status, decided_at, seat)
       values ($1, $2, $3, $4, $5, case when $5 = 'verified' then now() end, $6)`,
      [p.orderId, p.amount, p.utr, p.method, p.verified ? "verified" : "submitted", p.seat ?? null],
    );
    if (p.verified) {
      await startWorkIfAdvancePaid(query, p.orderId);
      await rewardReferrer(query, p.orderId);
    }
  });
}

/**
 * Marks a payment checked (or rejected). When the advance is now covered on an order that
 * was waiting for it, the order moves to "In progress" by itself.
 */
export async function decidePayment(paymentId: number, verified: boolean) {
  await transaction(async (query) => {
    const rows = await query<{ order_id: number }>(
      "update store.payments set status = $2, decided_at = now() where id = $1 returning order_id",
      [paymentId, verified ? "verified" : "rejected"],
    );
    if (verified && rows[0]) {
      await startWorkIfAdvancePaid(query, rows[0].order_id);
      await rewardReferrer(query, rows[0].order_id);
    }
  });
}

async function startWorkIfAdvancePaid(query: Query, orderId: number) {
  await query(
    `update store.orders o set status = 'in_progress', updated_at = now()
     where o.id = $1 and o.status = 'quoted' and o.price is not null
       and (select coalesce(sum(amount), 0) from store.payments where order_id = o.id and status = 'verified')
           >= round((o.price - least(o.discount, o.price)) * o.advance_percent / 100.0)`,
    [orderId],
  );
}

/**
 * Once an order that used a friend's code is under way, that friend gets their reward (once):
 * taken off what they still owe, or recorded as owed to them when they have nothing left to pay.
 */
async function rewardReferrer(query: Query, orderId: number) {
  const [o] = await query<{ referred_by: number | null; status: string }>(
    "select referred_by, status from store.orders where id = $1",
    [orderId],
  );
  if (!o?.referred_by || !["in_progress", "ready", "delivered"].includes(o.status)) return;
  const [settingsRow] = await query<{ data: unknown }>("select data from store.settings where id = 1");
  const s = normalizeSettings(settingsRow?.data);
  if (!s.referralOn || s.referralReward <= 0) return;
  const [ref] = await query<{ id: number; status: string; price: number | null; discount: number; paid: number }>(
    `select o.id, o.status, o.price, o.discount,
       coalesce((select sum(amount) from store.payments where order_id = o.id and status = 'verified'), 0)::int as paid
     from store.orders o where o.id = $1 for update`,
    [o.referred_by],
  );
  if (!ref) return;
  const amount = s.referralReward;
  const price = ref.price == null ? null : Number(ref.price);
  const stillOwes = price == null ? Infinity : price - Math.min(Number(ref.discount), price) - Number(ref.paid);
  const apply = !["delivered", "cancelled"].includes(ref.status) && stillOwes >= amount;
  const added = await query(
    `insert into store.referral_rewards (referrer_order_id, referred_order_id, amount, status)
     values ($1, $2, $3, $4) on conflict (referred_order_id) do nothing returning id`,
    [ref.id, orderId, amount, apply ? "applied" : "owed"],
  );
  if (added.length && apply) {
    await query("update store.orders set discount = discount + $2, updated_at = now() where id = $1", [ref.id, amount]);
  }
}

export async function deletePayment(paymentId: number) {
  await sql("delete from store.payments where id = $1", [paymentId]);
}

export type PendingPayment = Payment & { code: string; studentName: string; title: string; orderId: number };

export async function pendingPayments(limit = 20): Promise<PendingPayment[]> {
  const rows = await sql<PaymentRow & { code: string; student_name: string; title: string }>(
    `select p.*, o.code, o.student_name, o.title from store.payments p join store.orders o on o.id = p.order_id
     where p.status = 'submitted' order by p.created_at limit $1`,
    [limit],
  );
  return rows.map((r) => ({ ...toPayment(r), code: r.code, studentName: r.student_name, title: r.title }));
}

// ── Dashboard ──────────────────────────────────────────────────────────────────────────

export async function stats() {
  const rows = await sql<{ revenue_month: number; revenue_all: number; orders_month: number; delivered_month: number }>(
    `select
       coalesce((select sum(amount) from store.payments
                 where status = 'verified' and decided_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'), 0)::int as revenue_month,
       coalesce((select sum(amount) from store.payments where status = 'verified'), 0)::int as revenue_all,
       (select count(*) from store.orders
        where created_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')::int as orders_month,
       (select count(*) from store.orders
        where status = 'delivered' and updated_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')::int as delivered_month`,
  );
  const r = rows[0];
  return {
    revenueMonth: Number(r?.revenue_month ?? 0),
    revenueAll: Number(r?.revenue_all ?? 0),
    ordersMonth: Number(r?.orders_month ?? 0),
    deliveredMonth: Number(r?.delivered_month ?? 0),
  };
}

// ── Owner sign-in throttle ─────────────────────────────────────────────────────────────

export async function recentLoginFailures(ip: string, minutes = 15) {
  const rows = await sql<{ n: number }>(
    "select count(*)::int as n from store.login_failures where ip = $1 and at > now() - make_interval(mins => $2)",
    [ip, minutes],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function recordLoginFailure(ip: string) {
  await sql("insert into store.login_failures (ip) values ($1)", [ip]);
  await sql("delete from store.login_failures where at < now() - interval '1 day'");
}

/** Tiny read used by the daily keep-alive and the health check. */
export async function ping() {
  const rows = await sql<{ n: number }>("select count(*)::int as n from store.projects where active");
  return Number(rows[0]?.n ?? 0);
}

// ── Squads (one order, split between teammates) ────────────────────────────────────────

type SquadRow = { id: number; order_id: number; seat: number; name: string; token: string };

const toMember = (r: SquadRow): SquadMember => ({
  id: r.id, orderId: r.order_id, seat: Number(r.seat), name: r.name, token: r.token,
});

export async function getSquad(orderId: number): Promise<SquadMember[]> {
  const rows = await sql<SquadRow>("select * from store.squad_members where order_id = $1 order by seat", [orderId]);
  return rows.map(toMember);
}

/** A teammate's seat from the secret in their link, with the order it belongs to. */
export async function getSquadSeat(token: string): Promise<{ member: SquadMember; order: Order } | null> {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return null;
  const rows = await sql<SquadRow>("select * from store.squad_members where token = $1", [token]);
  if (!rows[0]) return null;
  const order = await getOrder(rows[0].order_id);
  return order ? { member: toMember(rows[0]), order } : null;
}

/**
 * Splits an order between `names.length` people (the first is the student who ordered). Seats that
 * already exist keep their links. Refused once a teammate has paid, so nobody's share changes under them.
 * Fewer than two names removes the split.
 */
export async function setSquad(orderId: number, names: string[]): Promise<"ok" | "locked"> {
  return transaction(async (query) => {
    await query("select id from store.orders where id = $1 for update", [orderId]);
    const paid = await query(
      "select 1 from store.payments where order_id = $1 and seat >= 2 and status <> 'rejected' limit 1",
      [orderId],
    );
    if (paid.length) return "locked";
    const keep = names.length >= 2 ? names.length : 0;
    for (let i = 0; i < keep; i++) {
      await query(
        `insert into store.squad_members (order_id, seat, name, token) values ($1, $2, $3, $4)
         on conflict (order_id, seat) do update set name = excluded.name`,
        [orderId, i + 1, names[i], randomBytes(16).toString("base64url")],
      );
    }
    await query("delete from store.squad_members where order_id = $1 and seat > $2", [orderId, keep]);
    return "ok";
  });
}

// ── Referrals ──────────────────────────────────────────────────────────────────────────

/** The order behind a friend's code, if it is still live. */
export async function findReferrer(code: string) {
  const c = normalizeRefCode(code);
  if (c.length < 4) return null;
  const rows = await sql<{ id: number; student_name: string; phone: string; email: string }>(
    "select id, student_name, phone, email from store.orders where ref_code = $1 and status <> 'cancelled'",
    [c],
  );
  const r = rows[0];
  return r ? { id: r.id, studentName: r.student_name, phone: r.phone, email: r.email } : null;
}

/** Friend codes are for first orders: true when this number already has a live order. */
export async function hasOrderFromPhone(phone: string) {
  const rows = await sql("select 1 from store.orders where phone = $1 and status <> 'cancelled' limit 1", [phone]);
  return rows.length > 0;
}

type RewardRow = {
  id: number; referrer_order_id: number; referred_order_id: number; amount: number; status: ReferralReward["status"];
  created_at: Date; friend_name?: string; referrer_name?: string; referrer_code?: string; referred_code?: string;
};

const toReward = (r: RewardRow): ReferralReward => ({
  id: r.id, referrerOrderId: r.referrer_order_id, referredOrderId: r.referred_order_id, amount: Number(r.amount),
  status: r.status, createdAt: r.created_at, friendName: r.friend_name, referrerName: r.referrer_name,
  referrerCode: r.referrer_code, referredCode: r.referred_code,
});

const REWARD_SELECT = `
  select rr.*, f.student_name as friend_name, f.code as referred_code, o.student_name as referrer_name, o.code as referrer_code
  from store.referral_rewards rr
  join store.orders f on f.id = rr.referred_order_id
  join store.orders o on o.id = rr.referrer_order_id`;

/** How an order's own code is doing: friends who used it and the rewards it earned. */
export async function referralSummary(orderId: number) {
  const [friends, rewards] = await Promise.all([
    sql<{ n: number }>("select count(*)::int as n from store.orders where referred_by = $1 and status <> 'cancelled'", [orderId]),
    sql<RewardRow>(`${REWARD_SELECT} where rr.referrer_order_id = $1 order by rr.created_at`, [orderId]),
  ]);
  return { friends: Number(friends[0]?.n ?? 0), rewards: rewards.map(toReward) };
}

export async function listRewards(status?: ReferralReward["status"], limit = 100): Promise<ReferralReward[]> {
  const rows = await sql<RewardRow>(
    `${REWARD_SELECT} ${status ? "where rr.status = $1" : ""} order by rr.created_at desc limit ${Math.min(500, Math.max(1, limit))}`,
    status ? [status] : [],
  );
  return rows.map(toReward);
}

export async function markRewardPaid(id: number) {
  await sql("update store.referral_rewards set status = 'paid', decided_at = now() where id = $1 and status = 'owed'", [id]);
}

/** Name and codes of an order, for "came from a friend" lines. */
export async function orderBrief(id: number) {
  const rows = await sql<{ id: number; code: string; student_name: string; ref_code: string | null }>(
    "select id, code, student_name, ref_code from store.orders where id = $1",
    [id],
  );
  const r = rows[0];
  return r ? { id: r.id, code: r.code, studentName: r.student_name, refCode: r.ref_code ?? "" } : null;
}

// ── Reviews ────────────────────────────────────────────────────────────────────────────

type ReviewRow = {
  id: number; order_id: number; project_id: number | null; rating: number; body: string; name: string; context: string;
  status: Review["status"]; reply: string; created_at: Date; updated_at: Date;
  title?: string; project_slug?: string | null; order_code?: string;
};

const toReview = (r: ReviewRow): Review => ({
  id: r.id, orderId: r.order_id, projectId: r.project_id, rating: Number(r.rating), body: r.body, name: r.name,
  context: r.context, status: r.status, reply: r.reply, createdAt: r.created_at, updatedAt: r.updated_at,
  title: r.title, projectSlug: r.project_slug, orderCode: r.order_code,
});

export async function getReviewForOrder(orderId: number): Promise<Review | null> {
  const rows = await sql<ReviewRow>("select * from store.reviews where order_id = $1", [orderId]);
  return rows[0] ? toReview(rows[0]) : null;
}

/** Saves the student's review. Editing an approved review sends it back for approval. */
export async function saveReview(r: { orderId: number; projectId: number | null; rating: number; body: string; name: string; context: string }) {
  await sql(
    `insert into store.reviews (order_id, project_id, rating, body, name, context) values ($1, $2, $3, $4, $5, $6)
     on conflict (order_id) do update set rating = excluded.rating, body = excluded.body, name = excluded.name,
       context = excluded.context, project_id = excluded.project_id, status = 'pending', updated_at = now()`,
    [r.orderId, r.projectId, r.rating, r.body, r.name, r.context],
  );
}

export async function listReviews(f: { status?: Review["status"]; projectId?: number; limit?: number } = {}): Promise<Review[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.status) {
    params.push(f.status);
    where.push(`r.status = $${params.length}`);
  }
  if (f.projectId) {
    params.push(f.projectId);
    where.push(`r.project_id = $${params.length}`);
  }
  const limit = Math.min(500, Math.max(1, f.limit ?? 100));
  const rows = await sql<ReviewRow>(
    `select r.*, o.title, o.code as order_code, p.slug as project_slug
     from store.reviews r join store.orders o on o.id = r.order_id left join store.projects p on p.id = r.project_id
     ${where.length ? "where " + where.join(" and ") : ""}
     order by ${f.status === "pending" ? "r.updated_at asc" : "r.created_at desc"} limit ${limit}`,
    params,
  );
  return rows.map(toReview);
}

/** Average stars and count of published reviews, overall or for one project. */
export async function reviewSummary(projectId?: number) {
  const rows = await sql<{ n: number; avg: number | string | null }>(
    `select count(*)::int as n, round(avg(rating), 1) as avg from store.reviews
     where status = 'approved' ${projectId ? "and project_id = $1" : ""}`,
    projectId ? [projectId] : [],
  );
  return { count: Number(rows[0]?.n ?? 0), avg: Number(rows[0]?.avg ?? 0) };
}

/** Stars per project, for the catalogue cards. */
export async function projectRatings(): Promise<Record<number, { avg: number; count: number }>> {
  const rows = await sql<{ project_id: number; n: number; avg: number | string }>(
    `select project_id, count(*)::int as n, round(avg(rating), 1) as avg from store.reviews
     where status = 'approved' and project_id is not null group by project_id`,
  );
  return Object.fromEntries(rows.map((r) => [r.project_id, { avg: Number(r.avg), count: Number(r.n) }]));
}

export async function setReviewStatus(id: number, status: Review["status"]) {
  await sql("update store.reviews set status = $2 where id = $1", [id, status]);
}

export async function setReviewReply(id: number, reply: string) {
  await sql("update store.reviews set reply = $2 where id = $1", [id, reply]);
}

export async function deleteReview(id: number) {
  await sql("delete from store.reviews where id = $1", [id]);
}
