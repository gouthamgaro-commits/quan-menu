"use client";
import Link from "next/link";
import { useState } from "react";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import { cx } from "../ui/controls";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

/**
 * Puff's flip cards: pieces on thick cards that turn over in 3D to show their other side (the
 * second photo, or the piece's name and price on the back of the card). They turn when pointed at
 * with a mouse, and with their round button on any screen; the name, price and link sit below
 * the card, so nothing needs turning to be read or reached.
 */
export default function FlipCards({ products, title = "Flip it" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 8);
  const [turned, setTurned] = useState<string[]>([]);
  if (items.length < 4) return null;
  const toggle = (id: string) => setTurned((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  return (
    <section aria-label={title} className="container-page mt-16 md:mt-24">
      <SectionHeader eyebrow="Front and back" title={title} href="/shop" />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {items.map((p, i) => {
          const on = turned.includes(p.id);
          return (
            <li key={p.id} data-reveal className={cx("flip-card", on && "is-turned")}>
              <div className="flip-scene">
                <div className="flip-inner">
                  <Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden className="flip-face flip-front">
                    <CatalogImage src={p.image_url} alt="" fill sizes="(min-width: 768px) 22vw, 45vw" className="object-cover" />
                  </Link>
                  <div aria-hidden className={cx("flip-face flip-back", !p.hover_image_url && "is-plain")}>
                    {p.hover_image_url ? (
                      <CatalogImage src={p.hover_image_url} alt="" fill sizes="(min-width: 768px) 22vw, 45vw" className="object-cover" />
                    ) : (
                      <span className="grid h-full place-content-center gap-3 p-4 text-center">
                        <span className="font-serif text-2xl leading-tight">{p.title}</span>
                        <span className="text-[13px] font-bold tracking-wide uppercase">No. {String(i + 1).padStart(2, "0")}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/products/${p.slug}`} className="block truncate font-bold hover:underline">{p.title}</Link>
                  <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-0.5" />
                </div>
                <button type="button" onClick={() => toggle(p.id)} aria-pressed={on} aria-label={`Turn over ${p.title}`} className="flip-btn">
                  <span aria-hidden>↻</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
