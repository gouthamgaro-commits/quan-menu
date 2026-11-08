"use client";
import { useEffect } from "react";

// What leans toward the pointer: anything marked data-tilt (its value is the most it leans, in
// degrees), and the product cards of the designs whose cards tilt (data-card on the store's root).
const SELECTOR = '[data-tilt], [data-card="depth"] .pc, [data-card="holo"] .pc';
const PROPS = ["--rx", "--ry", "--mx", "--my"];

/**
 * 3D cards that lean toward a mouse and catch the light where it points. Sets --rx and --ry (how
 * far to lean, in degrees) and --mx and --my (where the pointer is, 0–100%) on the element under
 * the pointer; the CSS decides what to do with them. Only for a mouse, never for shoppers who ask
 * for less motion; on touch screens the cards sit still.
 */
export default function Tilt() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let current: HTMLElement | null = null;
    let last: { x: number; y: number } | null = null;
    let frame = 0;

    const reset = () => {
      if (!current) return;
      current.classList.remove("is-tilting");
      for (const p of PROPS) current.style.removeProperty(p);
      current = null;
    };
    const paint = () => {
      frame = 0;
      if (!current || !last) return;
      const r = current.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = Math.min(1, Math.max(0, (last.x - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (last.y - r.top) / r.height));
      const most = Number(current.dataset.tilt) || 8;
      current.style.setProperty("--ry", `${((x - 0.5) * 2 * most).toFixed(2)}deg`);
      current.style.setProperty("--rx", `${((0.5 - y) * 2 * most).toFixed(2)}deg`);
      current.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      current.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !fine.matches || calm.matches) return;
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>(SELECTOR) : null;
      if (el !== current) {
        reset();
        current = el;
        current?.classList.add("is-tilting");
      }
      if (!current) return;
      last = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", reset);
    window.addEventListener("blur", reset);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", reset);
      window.removeEventListener("blur", reset);
      if (frame) cancelAnimationFrame(frame);
      reset();
    };
  }, []);

  return null;
}
