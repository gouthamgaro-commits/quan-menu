import Link from "next/link";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

/**
 * Gallery's exhibition: the store's featured pieces framed on a long gallery wall, each under its
 * own spotlight (brighter when pointed at) with a placard beneath, swiped or scrolled along
 * (`.exhibit-*` in globals.css).
 */
export default function Exhibition({ products, title = "The exhibition" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 6);
  if (items.length < 3) return null;

  return (
    <section aria-label={title} className="exhibition mt-16 py-14 md:mt-24 md:py-20">
      <div className="container-page">
        <SectionHeader eyebrow="Now showing" title={title} href="/shop" linkLabel="See the collection" />
      </div>
      <ul className="scrollbar-none container-page flex snap-x gap-10 overflow-x-auto pb-6 md:gap-14">
        {items.map((p, i) => (
          <li key={p.id} className="w-[62vw] shrink-0 snap-center sm:w-[18rem]" data-reveal>
            <Link href={`/products/${p.slug}`} className="exhibit group block">
              <span aria-hidden className="exhibit-light" />
              <span className="exhibit-frame relative block aspect-[4/5]">
                <span className="relative block h-full w-full overflow-hidden bg-bone">
                  <CatalogImage src={p.image_url} alt={p.image_alt || p.title} fill sizes="(min-width: 640px) 16rem, 55vw" className="object-cover" />
                </span>
              </span>
              <span className="exhibit-placard mx-auto mt-6 block w-fit max-w-full px-4 py-2.5 text-left">
                <span className="block truncate font-serif text-lg italic">{p.title}</span>
                <span className="block truncate text-[10px] tracking-[0.2em] text-taupe uppercase">
                  {p.brand_name || "The house"} · No. {String(i + 1).padStart(2, "0")}
                </span>
                <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-1" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
