import type { Metadata } from "next";
import FindOrderForm from "@/components/FindOrderForm";
import { MyOrders } from "@/components/LocalOrders";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

export default function TrackPage() {
  return (
    <main className="container narrow page stack">
      <div className="stack-xs">
        <h1>Track your order</h1>
        <p className="muted">Enter the order code from your order page or our WhatsApp message.</p>
      </div>
      <MyOrders />
      <FindOrderForm />
    </main>
  );
}
