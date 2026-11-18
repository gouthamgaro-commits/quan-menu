import type { Metadata } from "next";
import IdeaForm from "@/components/IdeaForm";
import { BRANCHES, CATEGORIES } from "@/lib/catalog";
import { getSettings } from "@/lib/data";
import { getFx } from "@/lib/fx";
import { todayIST } from "@/lib/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: `Pitch your project idea · ${s.brandName}`,
    description: "Describe your own coding or engineering project idea, pick the track, difficulty and deadline, and see the price at once.",
    alternates: { canonical: "/custom" },
  };
}

export default async function CustomPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const cat = typeof sp.category === "string" && CATEGORIES.some((c) => c.id === sp.category) ? sp.category : undefined;
  const branch = typeof sp.branch === "string" && BRANCHES.some((b) => b.id === sp.branch) ? sp.branch : undefined;

  return (
    <main className="container page stack">
      <div className="page-hero stack-sm" style={{ background: "var(--pink)" }}>
        <span className="deco-emoji" aria-hidden>
          💡
        </span>
        <span className="sticker white">pitch your idea</span>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 56px)" }}>
          your idea. <span className="hl">your price.</span>
        </h1>
        <p style={{ fontWeight: 600, maxWidth: "60ch" }}>
          Describe it, pick the track, difficulty and deadline, and watch the estimate update live. Add what you can pay, and
          we&apos;ll agree the final price with you before you pay a thing.
        </p>
      </div>
      <IdeaForm settings={s} today={todayIST()} initialCategory={cat} initialBranch={branch} fx={await getFx(s.localCurrency)} />
    </main>
  );
}
