import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MenuView from "@/components/MenuView";
import DemoMenu from "@/components/DemoMenu";
import { DEMO, SITE_URL } from "@/lib/config";
import { liveRates } from "@/lib/rates";
import { sectionName, sectionsOf } from "@/lib/sections";
import { vnToday, type Dish, type MenuData } from "@/lib/types";
import { isDemoSlug, loadMenu } from "./load";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const m = await loadMenu(slug);
  if (!m) return { title: "Menu — Quán" };
  const title = `${m.name} — Menu`;
  const description = `${m.name}${m.area ? `, ${m.area}` : ""}: ${m.dishes.length} dishes with prices, in English, 한국어, 中文 and 日本語. ` +
    m.dishes.slice(0, 4).map((d) => d.name?.en || d.vi).join(" · ");
  return {
    title,
    description,
    alternates: SITE_URL ? { canonical: `${SITE_URL}/m/${m.slug}` } : undefined,
    openGraph: { title, description, type: "website", siteName: "Quán", locale: "vi_VN" },
    twitter: { card: "summary_large_image", title, description },
    // The sample stalls aren't real places: keep them out of search results.
    robots: isDemoSlug(slug) ? { index: false, follow: true } : undefined,
  };
}

// Every QR scan lands here, so menus are cached and rebuilt at most once a minute.
// Saving in the editor refreshes a stall's page straight away (revalidatePath in actions.ts).
export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

/** What search engines read about the stall and its dishes (schema.org Restaurant with its Menu). */
function structuredData(m: MenuData) {
  const item = (d: Dish) => ({
    "@type": "MenuItem",
    name: d.name?.en || d.vi,
    ...(d.name?.en ? { alternateName: d.vi } : {}),
    ...(d.desc?.en ? { description: d.desc.en } : {}),
    offers: { "@type": "Offer", price: d.opts?.sizes?.[0]?.price || d.price, priceCurrency: "VND" },
  });
  const sections = sectionsOf(m.dishes);
  return {
    "@context": "https://schema.org",
    "@type": m.kind === "cafe" || m.kind === "tea" ? "CafeOrCoffeeShop" : "Restaurant",
    name: m.name,
    ...(SITE_URL ? { url: `${SITE_URL}/m/${m.slug}` } : {}),
    ...(m.area ? { address: { "@type": "PostalAddress", streetAddress: m.area, addressCountry: "VN" } } : {}),
    ...(m.maps ? { hasMap: m.maps } : {}),
    servesCuisine: "Vietnamese",
    currenciesAccepted: "VND",
    paymentAccepted: m.pay ? "Cash, Bank transfer" : "Cash",
    hasMenu: {
      "@type": "Menu",
      inLanguage: ["vi", "en", "ko", "zh", "ja"],
      ...(sections
        ? { hasMenuSection: sections.map((s) => ({ "@type": "MenuSection", name: sectionName(s.cat, "en"), hasMenuItem: s.idx.map((i) => item(m.dishes[i])) })) }
        : { hasMenuItem: m.dishes.map(item) }),
    },
  };
}

export default async function PublicMenu({ params }: Params) {
  const { slug } = await params;
  const menu = await loadMenu(slug);
  if (!menu) {
    if (DEMO) return <DemoMenu slug={slug} />;
    notFound();
  }
  const rates = await liveRates();
  const demo = isDemoSlug(slug);
  return (
    <>
      {!demo && (
        <script type="application/ld+json"
          // "<" is escaped so a dish name can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(menu)).replace(/</g, "\\u003c") }} />
      )}
      <MenuView full slug={slug} name={menu.name} area={menu.area} dishes={menu.dishes} toppings={menu.toppings} rates={rates}
        countSlug={demo ? undefined : menu.slug} soldOut={menu.soldOut} closedUntil={menu.closedUntil} today={vnToday()}
        pay={menu.pay} maps={menu.maps} />
    </>
  );
}
