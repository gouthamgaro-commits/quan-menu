import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { BUDGETS, type Status } from "./catalog";
import { sql, transaction, type Query } from "./db";
import { normalizeSettings, type Settings } from "./settings";
import type { Order, OrderDetails, Payment, Project } from "./types";

// ── Rows → objects ─────────────────────────────────────────────────────────────────────

type ProjectRow = {
  id: number; slug: string; title: string; summary: string; description: string; features: string[];
  branches: string[]; category: string; level: "mini" | "major"; difficulty: number; price: number;
  tech: string[]; includes: string[]; delivery_days: number; image_url: string; featured: boolean;
  active: boolean; orders_count: number; created_at: Date; updated_at: Date;
};

function toProject(r: ProjectRow): Project {
  return {
    id: r.id, slug: r.slug, title: r.title, summary: r.summary, description: r.description,
    features: r.features ?? [], branches: r.branches ?? [], category: r.category, level: r.level,
    difficulty: Math.min(4, Math.max(1, Number(r.difficulty))) as Project["difficulty"],
    price: Number(r.price), tech: r.tech ?? [], includes: r.includes ?? [],
    deliveryDays: Number(r.delivery_days), imageUrl: r.image_url ?? "", featured: r.featured,
    active: r.active, ordersCount: Number(r.orders_count), createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

type OrderRow = {
  id: number; code: string; token: string; kind: "catalog" | "custom"; project_id: number | null;
  project_slug: string | null; title: string; details: OrderDetails; student_name: string; phone: string;
  email: string; college: string; branch: string; year: string; status: Status; price: number | null;
  estimate_low: number | null; estimate_high: number | null; advance_percent: number;
  deadline_text: string | null; note_for_student: string; admin_notes: string; delivery_link: string;
  created_at: Date; updated_at: Date; paid: number | string | null; pending: number | string | null;
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
  };
}

type PaymentRow = {
  id: number; order_id: number; amount: number; utr: string; method: string;
  status: Payment["status"]; created_at: Date; decided_at: Date | null;
};

function toPayment(r: PaymentRow): Payment {
  return {
    id: r.id, orderId: r.order_id, amount: Number(r.amount), utr: r.utr, method: r.method,
    status: r.status, createdAt: r.created_at, decidedAt: r.decided_at,
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
  { id: "popular", name: "Popular" },
  { id: "price-asc", name: "Price: low to high" },
  { id: "price-desc", name: "Price: high to low" },
  { id: "easy", name: "Easiest first" },
  { id: "new", name: "Newest" },
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
    p.price, p.tech, p.includes, p.deliveryDays, p.imageUrl, p.featured, p.active,
  ];
  if (id) {
    await sql(
      `update store.projects set slug = $1, title = $2, summary = $3, description = $4, features = $5,
         branches = $6, category = $7, level = $8, difficulty = $9, price = $10, tech = $11, includes = $12,
         delivery_days = $13, image_url = $14, featured = $15, active = $16, updated_at = now()
       where id = $17`,
      [...values, id],
    );
    return id;
  }
  const rows = await sql<{ id: number }>(
    `insert into store.projects (slug, title, summary, description, features, branches, category, level,
       difficulty, price, tech, includes, delivery_days, image_url, featured, active)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) returning id`,
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
    coalesce((select sum(amount) from store.payments where order_id = o.id and status = 'submitted'), 0)::int as pending
  from store.orders o left join store.projects p on p.id = o.project_id`;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

function newCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
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
};

/** Saves a new order and returns its code and secret link token. */
export async function createOrder(o: NewOrder): Promise<{ code: string; token: string }> {
  for (let attempt = 0; ; attempt++) {
    const code = newCode();
    const token = randomBytes(16).toString("base64url");
    try {
      await transaction(async (query) => {
        await query(
          `insert into store.orders (code, token, kind, project_id, title, details, student_name, phone, email,
             college, branch, year, status, price, estimate_low, estimate_high, advance_percent, deadline)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            code, token, o.kind, o.projectId, o.title, JSON.stringify(o.details), o.studentName, o.phone, o.email,
            o.college, o.branch, o.year, o.status, o.price, o.estimateLow, o.estimateHigh, o.advancePercent,
            o.deadline,
          ],
        );
        if (o.projectId) {
          await query("update store.projects set orders_count = orders_count + 1 where id = $1", [o.projectId]);
        }
      });
      return { code, token };
    } catch (e) {
      // A clash with an existing code is very unlikely; try another one.
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

export async function orderCounts(): Promise<Record<string, number>> {
  const rows = await sql<{ status: string; n: number }>(
    "select status, count(*)::int as n from store.orders group by status",
  );
  const counts: Record<string, number> = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  const pay = await sql<{ n: number }>(
    "select count(distinct order_id)::int as n from store.payments where status = 'submitted'",
  );
  counts.payments = Number(pay[0]?.n ?? 0);
  counts.all = rows.reduce((s, r) => s + Number(r.n), 0);
  counts.open = rows.filter((r) => r.status !== "delivered" && r.status !== "cancelled").reduce((s, r) => s + Number(r.n), 0);
  return counts;
}

export type OrderPatch = {
  status: Status;
  price: number | null;
  advancePercent: number;
  noteForStudent: string;
  adminNotes: string;
  deliveryLink: string;
};

export async function updateOrder(id: number, p: OrderPatch) {
  await sql(
    `update store.orders set status = $2, price = $3, advance_percent = $4, note_for_student = $5,
       admin_notes = $6, delivery_link = $7, updated_at = now()
     where id = $1`,
    [id, p.status, p.price, p.advancePercent, p.noteForStudent, p.adminNotes, p.deliveryLink],
  );
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

export async function addPayment(p: { orderId: number; amount: number; utr: string; method: string; verified: boolean }) {
  await transaction(async (query) => {
    await query(
      `insert into store.payments (order_id, amount, utr, method, status, decided_at)
       values ($1, $2, $3, $4, $5, case when $5 = 'verified' then now() end)`,
      [p.orderId, p.amount, p.utr, p.method, p.verified ? "verified" : "submitted"],
    );
    if (p.verified) await startWorkIfAdvancePaid(query, p.orderId);
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
    if (verified && rows[0]) await startWorkIfAdvancePaid(query, rows[0].order_id);
  });
}

async function startWorkIfAdvancePaid(query: Query, orderId: number) {
  await query(
    `update store.orders o set status = 'in_progress', updated_at = now()
     where o.id = $1 and o.status = 'quoted' and o.price is not null
       and (select coalesce(sum(amount), 0) from store.payments where order_id = o.id and status = 'verified')
           >= round(o.price * o.advance_percent / 100.0)`,
    [orderId],
  );
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
