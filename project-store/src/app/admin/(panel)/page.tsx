import { ArrowRight, CircleAlert, CircleCheck, Database } from "lucide-react";
import Link from "next/link";
import OrderList from "@/components/admin/OrderList";
import PaymentButtons from "@/components/admin/PaymentButtons";
import { requireAdmin } from "@/lib/admin";
import { countProjects, getSettings, listOrders, orderCounts, pendingPayments, stats } from "@/lib/data";
import { dbMode } from "@/lib/db";
import { dateTimeIN, inr } from "@/lib/format";
import { setupMissing } from "@/lib/settings";

export default async function Dashboard() {
  await requireAdmin();
  const [s, counts, st, payments, recent, projects] = await Promise.all([
    getSettings(),
    orderCounts(),
    stats(),
    pendingPayments(),
    listOrders({ status: "open", limit: 8 }),
    countProjects(),
  ]);
  const missing = setupMissing(s);
  const tiles = [
    { label: "Ideas to quote", value: counts.requested ?? 0, href: "/admin/orders?status=requested", hot: (counts.requested ?? 0) > 0 },
    { label: "Payments to check", value: counts.payments ?? 0, href: "/admin/orders?status=payments", hot: (counts.payments ?? 0) > 0 },
    { label: "Waiting for advance", value: counts.quoted ?? 0, href: "/admin/orders?status=quoted" },
    { label: "In progress", value: counts.in_progress ?? 0, href: "/admin/orders?status=in_progress" },
    { label: "Ready for demo", value: counts.ready ?? 0, href: "/admin/orders?status=ready" },
    { label: "Received this month", value: inr(st.revenueMonth), href: "/admin/orders?status=all" },
    { label: "Orders this month", value: st.ordersMonth, href: "/admin/orders?status=all" },
    { label: "Delivered this month", value: st.deliveredMonth, href: "/admin/orders?status=delivered" },
  ];

  return (
    <>
      <div className="stack-xs">
        <h1 style={{ fontSize: 28 }}>Dashboard</h1>
        <p className="muted">Everything that needs you is at the top.</p>
      </div>

      {(missing.length > 0 || dbMode() === "local") && (
        <section className="card card-pad stack-sm">
          <h2 style={{ fontSize: 18 }}>Finish setting up</h2>
          <ul className="setup-list">
            {dbMode() === "local" && (
              <li>
                <Database size={18} aria-hidden color="var(--warn)" /> Development database: data stays on this computer. Set
                DATABASE_URL before going live (see README).
              </li>
            )}
            <li>
              {s.whatsapp ? <CircleCheck size={18} aria-hidden color="var(--ok)" /> : <CircleAlert size={18} aria-hidden color="var(--warn)" />}
              <span>
                WhatsApp number, so students can message you. <Link href="/admin/settings">Settings</Link>
              </span>
            </li>
            <li>
              {s.upiId ? <CircleCheck size={18} aria-hidden color="var(--ok)" /> : <CircleAlert size={18} aria-hidden color="var(--warn)" />}
              <span>
                UPI ID, so order pages show a payment QR code. <Link href="/admin/settings">Settings</Link>
              </span>
            </li>
            <li>
              <CircleAlert size={18} aria-hidden color="var(--brand)" />
              <span>
                Check the {projects} projects and their prices; hide the ones you can't deliver. <Link href="/admin/projects">Projects</Link>
              </span>
            </li>
          </ul>
        </section>
      )}

      <section className="stats">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card stat" style={t.hot ? { borderColor: "var(--warn)" } : undefined}>
            <b>{t.value}</b>
            <span>{t.label}</span>
          </Link>
        ))}
      </section>

      {payments.length > 0 && (
        <section className="stack-sm">
          <h2 style={{ fontSize: 20 }}>Payments to check</h2>
          <p className="small muted">Look for each one in your bank or UPI app (search the UTR), then mark it.</p>
          <ul className="plist card card-pad">
            {payments.map((p) => (
              <li key={p.id} style={{ border: 0, borderBottom: "1px solid var(--line)", borderRadius: 0 }}>
                <span className="stack-xs">
                  <span>
                    <b>{inr(p.amount)}</b> · UTR <span className="mono">{p.utr || "—"}</span>
                  </span>
                  <span className="small muted">
                    <Link href={`/admin/orders/${p.orderId}`} className="mono">
                      {p.code}
                    </Link>{" "}
                    · {p.studentName} · {p.title} · {dateTimeIN(p.createdAt)}
                  </span>
                </span>
                <PaymentButtons paymentId={p.id} orderId={p.orderId} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="stack-sm">
        <div className="row between">
          <h2 style={{ fontSize: 20 }}>Open orders</h2>
          <Link href="/admin/orders" className="btn btn-ghost btn-sm">
            All orders <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        <OrderList orders={recent} />
      </section>
    </>
  );
}
