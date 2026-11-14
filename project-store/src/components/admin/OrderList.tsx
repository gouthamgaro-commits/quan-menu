import Link from "next/link";
import { StatusBadge } from "@/components/Ui";
import { branchName } from "@/lib/catalog";
import { dateTimeIN, inr, timeAgo } from "@/lib/format";
import type { Order } from "@/lib/types";

function priceText(o: Order) {
  if (o.price != null) return inr(o.price);
  if (o.estimateLow != null && o.estimateHigh != null) return `~${inr(o.estimateLow)}–${inr(o.estimateHigh)}`;
  return "—";
}

/** Orders as a table on computers and as cards on phones. */
export default function OrderList({ orders }: { orders: Order[] }) {
  if (!orders.length) return <p className="card card-pad muted center">No orders here yet.</p>;
  return (
    <>
      <div className="card table-wrap olist-table">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Student</th>
              <th>Project</th>
              <th>Price</th>
              <th>Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link className="rowlink mono" href={`/admin/orders/${o.id}`}>
                    {o.code}
                  </Link>
                  <div className="tiny muted" title={dateTimeIN(o.createdAt)}>
                    {timeAgo(o.createdAt)}
                  </div>
                </td>
                <td>
                  <b>{o.studentName}</b>
                  <div className="tiny muted">
                    {[o.college, o.branch && branchName(o.branch, true), o.year].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td style={{ maxWidth: 320 }}>
                  <Link className="rowlink" href={`/admin/orders/${o.id}`} style={{ fontWeight: 600 }}>
                    {o.title}
                  </Link>
                  <div className="tiny muted">{o.kind === "custom" ? "Own idea" : "From catalogue"}</div>
                </td>
                <td className="nowrap">{priceText(o)}</td>
                <td className="nowrap">
                  {inr(o.paid)}
                  {o.pending > 0 && <div className="tiny" style={{ color: "var(--warn)" }}>+{inr(o.pending)} to check</div>}
                </td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="olist olist-cards">
        {orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="card orow">
            <div className="row between">
              <span className="mono small">{o.code}</span>
              <StatusBadge status={o.status} />
            </div>
            <b>{o.title}</b>
            <span className="small muted">
              {o.studentName}
              {o.college ? ` · ${o.college}` : ""} · {timeAgo(o.createdAt)}
            </span>
            <span className="row small" style={{ gap: 12 }}>
              <span>{priceText(o)}</span>
              <span className="muted">paid {inr(o.paid)}</span>
              {o.pending > 0 && <span style={{ color: "var(--warn)", fontWeight: 700 }}>+{inr(o.pending)} to check</span>}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
