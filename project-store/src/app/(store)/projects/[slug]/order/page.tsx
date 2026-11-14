import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import OrderForm from "@/components/OrderForm";
import { getProjectBySlug, getSettings } from "@/lib/data";
import { inr } from "@/lib/format";
import { todayIST } from "@/lib/pricing";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [p, s] = await Promise.all([getProjectBySlug(slug), getSettings()]);
  return { title: p ? `Order: ${p.title} · ${s.brandName}` : s.brandName, robots: { index: false } };
}

export default async function OrderPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [p, s] = await Promise.all([getProjectBySlug(slug), getSettings()]);
  if (!p || !p.active) notFound();

  return (
    <main className="container page stack">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/projects">Projects</Link>
        <ChevronRight size={14} aria-hidden />
        <Link href={`/projects/${p.slug}`}>{p.title}</Link>
        <ChevronRight size={14} aria-hidden />
        <span aria-current="page">Order</span>
      </nav>
      <div className="stack-xs">
        <h1 style={{ fontSize: "clamp(24px, 4.4vw, 32px)" }}>Order your project</h1>
        <p className="muted">
          {p.title} · {inr(p.price)} · ready in {p.deliveryDays} days
        </p>
      </div>
      <OrderForm
        project={{ slug: p.slug, title: p.title, price: p.price, deliveryDays: p.deliveryDays, branch: p.branches[0] ?? "" }}
        addons={s.addons}
        advancePercent={s.advancePercent}
        today={todayIST()}
      />
    </main>
  );
}
