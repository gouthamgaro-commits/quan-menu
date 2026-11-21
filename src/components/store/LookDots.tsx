"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { objectPosition, placeOnCover, tagPlace, type LookPin } from "@/lib/looks";
import CatalogImage from "../ui/CatalogImage";
import { buttonClass, cx } from "../ui/controls";
import Price from "./Price";
import { useQuickAdd } from "./QuickAdd";

/** Closes a popover, if it is open. */
function hide(el: HTMLElement) {
  if (el.matches(":popover-open")) el.hidePopover();
}

/** The picture a layer lies over: the nearest picture before it in its frame. */
function pictureBefore(el: Element): HTMLImageElement | null {
  for (let n = el.previousElementSibling; n; n = n.previousElementSibling) if (n instanceof HTMLImageElement) return n;
  return el.parentElement?.querySelector("img") ?? null;
}

/**
 * Shop the look: a layer over a banner's picture with a glowing dot on each tagged piece (Settings
 * › Homepage). The dots go where the pieces sit however the design crops the picture, and the layer
 * moves with the picture (drift, settle) as the page does. Tapping a dot opens a tag beside it, a
 * popover, so the picture's frame never clips it: the piece, its price, and Add to bag.
 */
export default function LookDots({ pins, parallax, settle }: { pins: LookPin[]; parallax?: number; settle?: boolean }) {
  const layer = useRef<HTMLDivElement>(null);
  const [spots, setSpots] = useState<({ left: number; top: number } | null)[]>([]);

  useEffect(() => {
    const el = layer.current;
    const img = el && pictureBefore(el);
    if (!el || !img) return;
    const place = () => {
      const position = objectPosition(getComputedStyle(img).objectPosition);
      setSpots(pins.map((p) => placeOnCover(p, { w: el.clientWidth, h: el.clientHeight }, { w: img.naturalWidth, h: img.naturalHeight }, position)));
    };
    place();
    img.addEventListener("load", place);
    const resized = new ResizeObserver(place);
    resized.observe(el);
    return () => {
      img.removeEventListener("load", place);
      resized.disconnect();
    };
  }, [pins]);

  if (!pins.length) return null;
  const shown = spots.some(Boolean);
  return (
    <div ref={layer} data-parallax={parallax} data-looks={shown ? "" : undefined} className={cx("look-layer pointer-events-none absolute inset-0", settle && "hero-settle")}>
      {pins.map((pin, i) => {
        const at = spots[i];
        return at && <LookDot key={`${pin.product.slug}-${i}`} pin={pin} at={at} />;
      })}
      {shown && (
        <p aria-hidden className="look-hint">
          <span className="look-hint-dot" />
          Shop the look
        </p>
      )}
    </div>
  );
}

function LookDot({ pin, at }: { pin: LookPin; at: { left: number; top: number } }) {
  const id = useId();
  const dot = useRef<HTMLButtonElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { product } = pin;
  const { start, loading, dialog } = useQuickAdd(product.slug, product.title);

  // While its tag is open, the tag follows the dot (the picture floats, drifts and zooms with the
  // page), and closes once the dot has gone off screen.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const follow = () => {
      const d = dot.current;
      const t = tag.current;
      if (!d || !t) return;
      const r = d.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return hide(t);
      const { left, top } = tagPlace(r, t.offsetWidth, t.offsetHeight, document.documentElement.clientWidth, window.innerHeight);
      t.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
      t.dataset.placed = "";
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <>
      <button
        ref={dot}
        type="button"
        popoverTarget={id}
        data-open={open ? "" : undefined}
        aria-label={`${product.title}: see the piece`}
        className="look-dot pointer-events-auto"
        style={{ left: `${at.left}%`, top: `${at.top}%` }}
      >
        <span aria-hidden className="look-dot-core" />
      </button>
      <div
        ref={tag}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={`Shop the look: ${product.title}`}
        onToggle={(e) => {
          setOpen(e.newState === "open");
          if (e.newState === "closed") delete e.currentTarget.dataset.placed;
        }}
        className="look-tag"
      >
        <Link href={`/products/${product.slug}`} className="group flex items-center gap-3">
          <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-img bg-bone">
            <CatalogImage src={product.image} alt="" fill sizes="56px" loading="eager" className="object-cover" />
          </span>
          <span className="grid min-w-0 gap-1">
            <span className="line-clamp-2 text-sm leading-snug font-medium group-hover:underline group-hover:underline-offset-4">{product.title}</span>
            <Price price={product.price} compareAt={product.compareAt} maxPrice={product.maxPrice} />
          </span>
        </Link>
        {product.soldOut ? (
          <Link href={`/products/${product.slug}`} className={buttonClass("secondary", "md", "mt-3 w-full")}>
            Sold out · see the piece
          </Link>
        ) : (
          <button
            type="button"
            disabled={loading}
            aria-haspopup="dialog"
            onClick={() => {
              if (tag.current) hide(tag.current);
              void start();
            }}
            className={buttonClass("primary", "md", "mt-3 w-full font-bold")}
          >
            {loading ? "Adding…" : "Add to bag"}
          </button>
        )}
      </div>
      {dialog}
    </>
  );
}
