import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadMenu } from "@/app/m/[slug]/load";
import PaperMenu from "@/components/PaperMenu";
import { UiProvider } from "@/components/Ui";
import { SITE_URL } from "@/lib/config";
import { uiLang } from "@/lib/server-ui";
import { LANG_KEYS, type Lang } from "@/lib/types";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "In thực đơn · Quán", robots: { index: false, follow: false } };

/** A printable A4 menu in Vietnamese and one other language (?l=en|ko|zh|ja), with a QR code to the full menu. Live menus only. */
export default async function PaperMenuPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const menu = await loadMenu(slug);
  if (!menu) notFound();
  const lang: Lang = LANG_KEYS.includes(sp.l as Lang) ? (sp.l as Lang) : "en";
  return (
    <UiProvider lang={await uiLang()}>
      <PaperMenu menu={menu} slug={slug} siteUrl={SITE_URL} lang={lang} />
    </UiProvider>
  );
}
