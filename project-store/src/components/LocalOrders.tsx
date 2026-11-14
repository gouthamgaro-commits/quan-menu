"use client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "ps_orders";
type Saved = { code: string; token: string; title: string; at: number };

function read(): Saved[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.token === "string") : [];
  } catch {
    return [];
  }
}

/** Remembers an order on this phone, so "Track" can list it without typing the code. */
export function RememberOrder({ code, token, title }: { code: string; token: string; title: string }) {
  useEffect(() => {
    try {
      const list = [{ code, token, title, at: Date.now() }, ...read().filter((o) => o.token !== token)].slice(0, 20);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* storage blocked: the order link still works */
    }
  }, [code, token, title]);
  return null;
}

export function MyOrders() {
  const [orders, setOrders] = useState<Saved[] | null>(null);
  useEffect(() => setOrders(read()), []);
  if (!orders?.length) return null;
  return (
    <section className="card card-pad stack-sm">
      <h2 style={{ fontSize: 18 }}>Orders on this phone</h2>
      <ul className="plist">
        {orders.map((o) => (
          <li key={o.token} style={{ padding: 0 }}>
            <Link href={`/track/${o.token}`} className="row between" style={{ padding: "10px 12px", width: "100%", textDecoration: "none", color: "inherit" }}>
              <span className="stack-xs grow">
                <b>{o.title}</b>
                <span className="tiny muted mono">#{o.code}</span>
              </span>
              <ChevronRight size={18} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
