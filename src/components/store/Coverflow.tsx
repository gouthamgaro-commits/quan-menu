"use client";
import Link from "next/link";
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import { cx } from "../ui/controls";
import { ArrowLeft, ArrowRight } from "../ui/icons";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

/**
 * Orbit's coverflow: the newest pieces in a 3D carousel, the one in front facing the shopper and
 * the rest turned away on either side (`.coverflow-*` in globals.css). The arrows, the arrow keys,
 * a swipe or a tap on a piece at the side bring it to the front; a tap on the piece in front opens
 * it. Reaching a piece with the keyboard brings it forward too.
 */
export default function Coverflow({ products, title = "In orbit" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 9);
  const [active, setActive] = useState(() => Math.floor(Math.min(items.length, 9) / 2));
  const start = useRef<number | null>(null);
  if (items.length < 3) return null;
  const current = Math.min(active, items.length - 1);
  const go = (i: number) => setActive(Math.max(0, Math.min(items.length - 1, i)));

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    go(current + (e.key === "ArrowRight" ? 1 : -1));
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") start.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    start.current = null;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
  };

  return (
    <section aria-label={title} aria-roledescription="carousel" className="container-page mt-16 md:mt-24">
      <SectionHeader eyebrow="Just landed" title={title} href="/shop?sort=newest" />
      <div onKeyDown={onKey} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (start.current = null)} className="coverflow">
        <ul className="coverflow-track">
          {items.map((p, i) => {
            const off = i - current;
            return (
              <li
                key={p.id}
                className={cx("coverflow-item", off === 0 && "is-front")}
                style={{ "--off": off, "--abs": Math.abs(off), zIndex: 40 - Math.abs(off) } as CSSProperties}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${items.length}`}
              >
                <Link
                  href={`/products/${p.slug}`}
                  onFocus={() => go(i)}
                  onClick={(e) => {
                    if (i === current) return;
                    e.preventDefault();
                    go(i);
                  }}
                  className="coverflow-card group block"
                >
                  <span className="coverflow-photo relative block aspect-[4/5] overflow-hidden rounded-card bg-bone">
                    <CatalogImage src={p.image_url} alt={p.image_alt || p.title} fill sizes="(min-width: 768px) 17rem, 11rem" className="object-cover" />
                  </span>
                  <span className="coverflow-caption mt-4 block text-center">
                    <span className="block truncate text-sm font-semibold">{p.title}</span>
                    <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-1 justify-center text-sm" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Previous piece" className="coverflow-btn">
            <ArrowLeft size={18} />
          </button>
          <p aria-live="polite" className="min-w-16 text-center text-sm font-semibold tabular-nums">
            {current + 1} / {items.length}
          </p>
          <button type="button" onClick={() => go(current + 1)} disabled={current === items.length - 1} aria-label="Next piece" className="coverflow-btn">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
