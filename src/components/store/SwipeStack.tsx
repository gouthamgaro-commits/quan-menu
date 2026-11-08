"use client";
import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import { buttonClass, cx } from "../ui/controls";
import { ArrowLeft, ArrowRight } from "../ui/icons";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

/**
 * Deck's stack: the store's pieces as a pile of cards. Drag or swipe the top card away (either
 * way) for the next, or use the arrows; the top card opens its piece. The cards behind peek out,
 * and the pile goes round again at the end.
 */
export default function SwipeStack({ products, title = "Swipe the stack" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 8);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const start = useRef<number | null>(null);
  const moved = useRef(false);
  if (items.length < 3) return null;

  const n = items.length;
  const step = (dir: 1 | -1) => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) {
      setIndex((i) => (i + dir + n) % n);
      return;
    }
    setLeaving(dir);
    window.setTimeout(() => {
      setIndex((i) => (i + dir + n) % n);
      setLeaving(0);
      setDrag(0);
    }, 260);
  };
  const onDown = (e: PointerEvent) => {
    start.current = e.clientX;
    moved.current = false;
  };
  const onMove = (e: PointerEvent) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    if (Math.abs(dx) > 6) moved.current = true;
    setDrag(dx);
  };
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (Math.abs(drag) > 90) step(drag < 0 ? 1 : -1);
    else setDrag(0);
  };
  const top = items[index];

  return (
    <section aria-label={title} className="container-page mt-16 md:mt-24">
      <SectionHeader eyebrow="Swipe right" title={title} href="/shop" />
      <div className="swipe-stack relative mx-auto aspect-[3/4] w-[68vw] max-w-[19rem]">
        {[2, 1, 0].map((depth) => {
          const p = items[(index + depth) % n];
          const isTop = depth === 0;
          const style = isTop
            ? { transform: leaving ? `translateX(${leaving * 140}%) rotate(${leaving * 18}deg)` : `translateX(${drag}px) rotate(${drag / 18}deg)`, transition: start.current !== null ? "none" : undefined }
            : undefined;
          return (
            <div
              key={`${p.id}-${depth}`}
              className={cx("swipe-card", `swipe-depth-${depth}`, isTop && leaving !== 0 && "is-leaving")}
              style={style}
              aria-hidden={!isTop}
              onPointerDown={isTop ? onDown : undefined}
              onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined}
              onPointerCancel={isTop ? onUp : undefined}
            >
              <Link
                href={`/products/${p.slug}`}
                tabIndex={isTop ? undefined : -1}
                draggable={false}
                onClick={(e) => moved.current && e.preventDefault()}
                className="trading-frame block h-full"
              >
                <span className="relative block h-[78%] overflow-hidden rounded-[12px] bg-bone">
                  <CatalogImage src={p.image_url} alt={isTop ? p.image_alt || p.title : ""} fill sizes="19rem" draggable={false} className="object-cover" />
                </span>
                <span className="mt-2 block rounded-[10px] bg-paper px-3 py-2">
                  <span className="block truncate font-bold">{p.title}</span>
                  <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-0.5" />
                </span>
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-center gap-4">
        <button type="button" onClick={() => step(-1)} aria-label="Previous card" className="swipe-btn"><ArrowLeft size={18} /></button>
        <Link href={`/products/${top.slug}`} className={buttonClass("primary", "md", "font-bold")}>See this piece</Link>
        <button type="button" onClick={() => step(1)} aria-label="Next card" className="swipe-btn"><ArrowRight size={18} /></button>
      </div>
      <p aria-live="polite" className="mt-3 text-center text-sm text-taupe">
        {index + 1} of {n}: {top.title}
      </p>
    </section>
  );
}
