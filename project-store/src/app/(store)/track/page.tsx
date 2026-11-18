import type { Metadata } from "next";
import FindOrderForm from "@/components/FindOrderForm";
import { MyOrders } from "@/components/LocalOrders";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

export default function TrackPage() {
  return (
    <main className="container narrow page stack">
      <div className="page-hero stack-sm" style={{ background: "var(--mint)" }}>
        <span className="deco-emoji" aria-hidden>
          📦
        </span>
        <span className="sticker white">where&apos;s my project?</span>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 52px)" }}>
          track your <span className="hl yellow">order</span>
        </h1>
        <p style={{ fontWeight: 600 }}>Pop in the order code from your order page or our WhatsApp message.</p>
      </div>
      <MyOrders />
      <FindOrderForm />
    </main>
  );
}
