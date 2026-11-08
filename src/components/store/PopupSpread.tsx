import Link from "next/link";
import type { CSSProperties } from "react";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

/**
 * Pop-up's spread: an open book whose pieces fold up off the pages, one after another, as the book
 * comes into view (`.book` and `.popup-*` in globals.css; Motion.tsx marks it as it arrives). For
 * shoppers who ask for less motion they are standing already.
 */
export default function PopupSpread({ products, title = "Pop-up picks" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 4);
  if (items.length < 2) return null;

  return (
    <section aria-label={title} className="container-page mt-16 md:mt-24">
      <SectionHeader eyebrow="Open the book" title={title} href="/shop?sort=newest" />
      <div className="book" data-reveal>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 p-5 md:grid-cols-4 md:gap-x-10 md:p-10">
          {items.map((p, i) => (
            <li key={p.id} className="popup-piece" style={{ "--delay": `${0.15 + i * 0.12}s` } as CSSProperties}>
              <Link href={`/products/${p.slug}`} className="group block text-center">
                <span className="popup-up relative block aspect-[4/5] overflow-hidden bg-bone">
                  <CatalogImage src={p.image_url} alt={p.image_alt || p.title} fill sizes="(min-width: 768px) 20vw, 40vw" className="object-cover" />
                </span>
                <span aria-hidden className="popup-page block" />
                <span className="mt-3 block truncate font-semibold">{p.title}</span>
                <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-0.5 justify-center" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
