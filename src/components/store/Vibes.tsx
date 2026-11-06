"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import type { ProductCard as Card } from "@/lib/types";
import { cx } from "../ui/controls";
import ProductCard from "./ProductCard";
import { SectionHeader } from "./SectionHeader";

export interface Vibe {
  title: string;
  slug: string;
  products: Card[];
}

/**
 * Shop by vibe: the store's featured collections as tabs in a retro window, each tab showing
 * that collection's pieces. The tabs follow the usual pattern: arrow keys move between them,
 * and the panel says which tab it belongs to.
 */
export default function Vibes({ vibes, title = "Shop by vibe" }: { vibes: Vibe[]; title?: string }) {
  const usable = vibes.filter((v) => v.products.length >= 2).slice(0, 4);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  if (usable.length < 2) return null;
  const current = usable[Math.min(active, usable.length - 1)];

  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + usable.length) % usable.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section aria-label={title} className="container-page mt-16 md:mt-24">
      <SectionHeader eyebrow="Pick your era" title={title} href={`/collections/${current.slug}`} linkLabel={`All of ${current.title}`} />
      <div className="win-window" data-reveal>
        <p className="win-titlebar">
          <span aria-hidden className="flex gap-1"><i className="win-dot bg-brand" /><i className="win-dot bg-accent" /><i className="win-dot bg-sand" /></span>
          <span className="truncate">vibes/{current.slug}</span>
        </p>
        <div role="tablist" aria-label={title} className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line px-3 pt-3">
          {usable.map((v, i) => (
            <button
              key={v.slug}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`vibe-tab-${v.slug}`}
              aria-selected={v.slug === current.slug}
              aria-controls="vibe-panel"
              tabIndex={v.slug === current.slug ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
              className={cx(
                "-mb-px shrink-0 rounded-t-xl border border-b-0 px-4 py-2.5 font-pixel text-[11px] uppercase transition-colors",
                v.slug === current.slug ? "border-line bg-paper text-ink" : "border-transparent text-taupe hover:text-ink",
              )}
            >
              {v.title}
            </button>
          ))}
        </div>
        <div id="vibe-panel" role="tabpanel" aria-labelledby={`vibe-tab-${current.slug}`} className="grid grid-cols-2 gap-x-4 gap-y-8 bg-paper p-4 sm:grid-cols-3 md:p-6 lg:grid-cols-6">
          {current.products.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} sizes="(min-width: 1024px) 14vw, (min-width: 640px) 30vw, 45vw" />
          ))}
        </div>
      </div>
    </section>
  );
}
