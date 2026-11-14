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
      <h1>Payments, delivery & refunds</h1>
      <div className="card card-pad">
        <PlainText text={s.policies} />
      </div>
    </main>
  );
}
