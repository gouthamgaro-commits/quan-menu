import type { Metadata } from "next";
import IdeaForm from "@/components/IdeaForm";
import { BRANCHES, CATEGORIES } from "@/lib/catalog";
import { getSettings } from "@/lib/data";
import { todayIST } from "@/lib/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: `Price my project idea · ${s.brandName}`,
    description: "Describe your own engineering project idea, pick the difficulty and deadline, and see the price at once.",
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
      <div className="stack-xs">
        <span className="eyebrow">Your own idea</span>
        <h1>Tell us your idea, see the price</h1>
        <p className="lead">
          Describe the project, pick its domain, difficulty and deadline. The estimate updates as you go. We confirm the
          final price on WhatsApp before you pay anything.
        </p>
      </div>
      <IdeaForm settings={s} today={todayIST()} initialCategory={cat} initialBranch={branch} />
    </main>
  );
}
