import { Search } from "lucide-react";
import Link from "next/link";
import OrderList from "@/components/admin/OrderList";
import { requireAdmin } from "@/lib/admin";
import { listOrders, orderCounts } from "@/lib/data";

const TABS = [
  { id: "open", label: "Open" },
  { id: "requested", label: "Ideas to quote" },
  { id: "payments", label: "Payments to check" },
  { id: "quoted", label: "Waiting for advance" },
  { id: "in_progress", label: "In progress" },
  { id: "ready", label: "Ready" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && TABS.some((t) => t.id === sp.status) ? sp.status : "open";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const [orders, counts] = await Promise.all([
    listOrders({ status: status === "all" ? undefined : status, q }),
    orderCounts(),
  ]);

  return (
    <>
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>Orders</h1>
        <form className="searchbar" action="/admin/orders" role="search" style={{ flex: "1 1 280px", maxWidth: 420 }}>
          <input type="hidden" name="status" value={status} />
          <div className="search-wrap">
            <Search size={17} aria-hidden />
            <input className="input" type="search" name="q" defaultValue={q} placeholder="Code, name, phone, college…" aria-label="Search orders" />
          </div>
        </form>
      </div>
      <nav className="tabs" aria-label="Order status">
        {TABS.map((t) => (
          <Link
            key={t.id}
            className="tab"
            href={`/admin/orders?status=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={status === t.id ? "true" : undefined}
          >
            {t.label} <span className="n">{counts[t.id] ?? 0}</span>
          </Link>
        ))}
      </nav>
      <OrderList orders={orders} />
    </>
  );
}
