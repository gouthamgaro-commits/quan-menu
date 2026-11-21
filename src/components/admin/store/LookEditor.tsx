"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { MAX_LOOKS } from "@/lib/looks";
import type { LookSpot } from "@/lib/types";
import { pickerProductsByIds, searchProductsForPicker, type PickerProduct } from "@/server/admin/catalog";
import CatalogImage from "../../ui/CatalogImage";
import { cx } from "../../ui/controls";
import { CloseIcon, PlusIcon } from "../../ui/icons";
import { adminInput } from "../ui";

const round = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;

/**
 * Shop the look, for the opening banner: tap the photo where a piece is and choose the piece; the
 * store shows a dot there that opens the piece, its price and Add to bag. A dot moves by choosing
 * it and tapping its new place, or with the arrow keys.
 */
export function LookEditor({ image, looks, onChange }: { image: string; looks: LookSpot[]; onChange: (looks: LookSpot[]) => void }) {
  const [known, setKnown] = useState<Record<string, PickerProduct | null>>({});
  // Where a new piece goes while its product is being chosen, and the dot chosen to move.
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const asked = useRef(new Set<string>());
  const search = useRef<HTMLInputElement>(null);

  // The titles and pictures of pieces tagged before (missing ones were deleted).
  useEffect(() => {
    const ids = looks.map((l) => l.product).filter((id) => !asked.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => asked.current.add(id));
    pickerProductsByIds(ids).then((res) => {
      if (!res.ok) return;
      setKnown((k) => ({ ...k, ...Object.fromEntries(ids.map((id) => [id, res.data.find((p) => p.id === id) ?? null])) }));
    });
  }, [looks]);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      setSearching(true);
      searchProductsForPicker(q).then((res) => {
        setSearching(false);
        if (res.ok) setResults(res.data);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q, pending]);

  const full = looks.length >= MAX_LOOKS;
  const start = (spot: { x: number; y: number }) => {
    setPending(spot);
    setChosen(null);
    setQ("");
    requestAnimationFrame(() => search.current?.focus());
  };
  const tap = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const spot = { x: round(((e.clientX - r.left) / r.width) * 100), y: round(((e.clientY - r.top) / r.height) * 100) };
    if (chosen !== null) {
      onChange(looks.map((l, i) => (i === chosen ? { ...l, ...spot } : l)));
      setChosen(null);
    } else if (pending) setPending(spot);
    else if (!full) start(spot);
  };
  const pick = (p: PickerProduct) => {
    if (!pending) return;
    setKnown((k) => ({ ...k, [p.id]: p }));
    asked.current.add(p.id);
    onChange([...looks, { product: p.id, ...(p.slug ? { slug: p.slug } : {}), ...pending }]);
    setPending(null);
  };
  const nudge = (i: number, e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 5 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(looks.map((l, j) => (j === i ? { ...l, x: round(l.x + d[0]), y: round(l.y + d[1]) } : l)));
  };
  const name = (id: string) => (known[id] === null ? "A piece that's been deleted" : (known[id]?.title ?? "…"));

  return (
    <div className="grid gap-3 rounded-md border border-dashed border-black/15 p-3 md:col-span-2" data-look-editor>
      <div>
        <p className="text-sm font-medium">Shop the look</p>
        <p className="mt-1 text-xs text-stone">
          Tap the photo on a piece and choose it: shoppers see a glowing dot there that opens the piece, its price and Add to bag. To move a dot, choose it and tap its new place (or use the arrow keys). Up to {MAX_LOOKS} pieces; only pieces on sale show.
        </p>
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
        <div className={cx("relative overflow-hidden rounded-md bg-bone select-none", (!full || chosen !== null || pending) && "cursor-crosshair")} onClick={tap} data-look-photo>
          <CatalogImage src={image} alt="" width={800} height={1000} sizes="15rem" draggable={false} className="block h-auto w-full" />
          {looks.map((l, i) => (
            <button
              key={`${l.product}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPending(null);
                setChosen(chosen === i ? null : i);
              }}
              onKeyDown={(e) => nudge(i, e)}
              aria-pressed={chosen === i}
              aria-label={`Dot ${i + 1}: ${name(l.product)}. Choose it to move it, or use the arrow keys.`}
              style={{ left: `${l.x}%`, top: `${l.y}%` }}
              className={cx(
                "absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-bold shadow-md transition",
                chosen === i ? "scale-125 border-white bg-ink text-white" : "border-ink bg-white text-ink",
              )}
            >
              {i + 1}
            </button>
          ))}
          {pending && (
            <span aria-hidden style={{ left: `${pending.x}%`, top: `${pending.y}%` }} className="absolute size-7 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-dashed border-white bg-ink/60" />
          )}
        </div>
        <div className="grid content-start gap-3">
          {looks.length > 0 && (
            <ol className="grid gap-1.5">
              {looks.map((l, i) => (
                <li key={`${l.product}-${i}`} className={cx("flex items-center gap-2 rounded-md border px-2 py-1.5", chosen === i ? "border-ink" : "border-black/10")}>
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{name(l.product)}</span>
                    {known[l.product] && known[l.product]!.status !== "active" && <span className="text-xs text-stone">Hidden until it&apos;s on sale ({known[l.product]!.status})</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(looks.filter((_, j) => j !== i));
                      setChosen(null);
                    }}
                    aria-label={`Remove dot ${i + 1}`}
                    className="grid size-7 place-items-center rounded text-stone hover:bg-black/5 hover:text-ink"
                  >
                    <CloseIcon size={14} />
                  </button>
                </li>
              ))}
            </ol>
          )}
          {pending ? (
            <div className="rounded-md border border-black/10 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="look-search" className="text-xs font-medium text-taupe">Which piece is at the new dot?</label>
                <button type="button" className="text-xs underline" onClick={() => setPending(null)}>Cancel</button>
              </div>
              <input id="look-search" ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, SKU or tag" className={cx(adminInput, "mt-1.5 w-full")} />
              <ul className="mt-2 grid max-h-64 gap-1 overflow-y-auto" aria-busy={searching}>
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => pick(p)} className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-black/[0.04]">
                      <span className="relative size-9 shrink-0 overflow-hidden rounded bg-bone">
                        {p.image && <CatalogImage src={p.image} alt="" fill sizes="36px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{p.title}</span>
                        {p.status !== "active" && <span className="text-xs text-stone capitalize">{p.status}</span>}
                      </span>
                    </button>
                  </li>
                ))}
                {!results.length && !searching && <li className="px-2 py-3 text-sm text-stone">No products found.</li>}
              </ul>
            </div>
          ) : (
            !full && (
              <button type="button" onClick={() => start({ x: 50, y: 50 })} className="inline-flex items-center gap-1 justify-self-start text-xs underline">
                <PlusIcon size={11} /> Tag a piece
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
