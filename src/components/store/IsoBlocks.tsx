import Link from "next/link";
import type { CSSProperties } from "react";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

// How tall each block stands, so the row climbs and dips like a skyline.
const HEIGHTS = ["3.25rem", "6rem", "4.25rem", "7.25rem"];

/**
 * Iso's blocks: the newest pieces standing on isometric blocks of different heights (`.iso-box`
 * in globals.css), each lifting a little when pointed at.
 */
export default function IsoBlocks({ products, title = "Stacked up" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 4);
  if (items.length < 3) return null;

  return (
    <section aria-label={title} className="container-page mt-16 md:mt-24">
      <SectionHeader eyebrow="Just landed" title={title} href="/shop?sort=newest" />
      <ul className="grid grid-cols-2 items-end gap-x-10 gap-y-14 md:grid-cols-4 md:gap-x-14">
        {items.map((p, i) => (
          <li key={p.id} data-reveal>
            <Link href={`/products/${p.slug}`} className="group block">
              <span className="relative z-[1] mx-auto block aspect-[4/5] w-[78%] overflow-hidden rounded-card bg-bone shadow-lg transition duration-300 group-hover:-translate-y-2">
                <CatalogImage src={p.image_url} alt={p.image_alt || p.title} fill sizes="(min-width: 768px) 18vw, 36vw" className="object-cover" />
              </span>
              <span aria-hidden className="iso-box iso-step block" style={{ height: HEIGHTS[i % HEIGHTS.length] } as CSSProperties} />
              <span className="mt-6 block truncate text-sm font-semibold">{p.title}</span>
              <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
