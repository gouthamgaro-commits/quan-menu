"use client";
import { useState, type CSSProperties } from "react";
import CatalogImage from "../ui/CatalogImage";
import { cx } from "../ui/controls";

/**
 * Orbit's banner: the store's photos on a ring that turns slowly in 3D (CSS alone, `.orbit-*` in
 * globals.css). Each photo has a back, so the far side of the ring shows its photos dimmed rather
 * than mirrored. The ring stops while pointed at, a button pauses it, and it stands still for
 * shoppers who ask for less motion (the button then has nothing to do and isn't shown).
 */
export default function OrbitRing({ pictures }: { pictures: string[] }) {
  const [paused, setPaused] = useState(false);
  if (pictures.length < 4) return null;

  return (
    <div className="orbit-stage relative" style={{ "--n": pictures.length } as CSSProperties}>
      <div aria-hidden className={cx("orbit-ring", paused && "is-paused")}>
        {pictures.map((src, i) => (
          <div key={`${src}-${i}`} className="orbit-item" style={{ "--i": i } as CSSProperties}>
            <span className="orbit-face">
              <CatalogImage src={src} alt="" fill sizes="(min-width: 768px) 11rem, 7rem" priority={i < 2} className="object-cover" />
            </span>
            <span className="orbit-face orbit-back">
              <CatalogImage src={src} alt="" fill sizes="(min-width: 768px) 11rem, 7rem" className="object-cover" />
            </span>
          </div>
        ))}
      </div>
      <span aria-hidden className="orbit-floor" />
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
        className="orbit-pause absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 sm:right-0 sm:bottom-3 sm:left-auto sm:translate-x-0 h-9 items-center gap-2 rounded-full border border-line bg-paper/80 px-3.5 text-[12px] font-semibold backdrop-blur motion-reduce:hidden"
      >
        <span aria-hidden>{paused ? "▶" : "❚❚"}</span>
        {paused ? "Turn the photos" : "Stop the photos"}
      </button>
    </div>
  );
}
