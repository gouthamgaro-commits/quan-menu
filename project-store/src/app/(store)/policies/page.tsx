import type { Metadata } from "next";
import { PlainText } from "@/components/Ui";
import { getSettings } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: `Payments, delivery & refunds · ${s.brandName}`, alternates: { canonical: "/policies" } };
}

export default async function Policies() {
  const s = await getSettings();
  return (
    <main className="container narrow page stack">
      <div className="page-hero stack-sm" style={{ background: "var(--purple)" }}>
        <span className="deco-emoji" aria-hidden>
          📜
        </span>
        <span className="sticker white">the fine print, but readable</span>
        <h1 style={{ fontSize: "clamp(30px, 5.6vw, 48px)" }}>payments, delivery &amp; refunds</h1>
      </div>
      <div className="card card-pad">
        <PlainText text={s.policies} />
      </div>
    </main>
  );
}
