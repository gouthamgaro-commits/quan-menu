"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { formatMoney } from "@/lib/money";
import { PIECE_MS, stepStory, storyMark, type Piece, type Story, type StoryAt } from "@/lib/stories";
import CatalogImage from "../ui/CatalogImage";
import { CloseIcon } from "../ui/icons";
import { useQuickAdd } from "./QuickAdd";
import { useStore } from "./StoreProvider";

// Which stories this shopper has watched: a convenience kept in their own browser, which may
// keep nothing (private windows, blocked storage).
const SEEN = "stories-seen";
function readSeen(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SEEN) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeSeen(marks: string[]) {
  try {
    localStorage.setItem(SEEN, JSON.stringify(marks.slice(-60)));
  } catch {
    // Nothing kept; the circles light up again next visit.
  }
}

/**
 * Stories, as on Instagram: a row of round pictures, ringed in the store's colours until watched,
 * each opening full screen with its pieces one at a time. Pieces move on by themselves every few
 * seconds (never for shoppers who ask for less motion), or with a tap on either side, the arrow
 * keys, or the buttons; holding a piece, the pause button, or anything opened over the story
 * (the options sheet, the bag) stops the clock.
 */
export default function Stories({ stories }: { stories: Story[] }) {
  const [at, setAt] = useState<StoryAt | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => setSeen(readSeen()), []);

  const show = (next: StoryAt) => {
    setAt(next);
    const mark = storyMark(stories[next.story]);
    setSeen((list) => {
      if (list.includes(mark)) return list;
      const marks = [...list, mark];
      writeSeen(marks);
      return marks;
    });
  };

  return (
    <section aria-label="Stories" className="container-page mt-8 md:mt-12">
      <ul className="stories-row">
        {stories.map((s, i) => {
          const watched = seen.includes(storyMark(s));
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => show({ story: i, piece: 0 })}
                aria-haspopup="dialog"
                aria-label={`${s.title}: ${s.pieces.length} pieces${watched ? ", watched" : ""}`}
                className="story-chip"
              >
                <span className="story-ring" data-seen={watched ? "" : undefined}>
                  <span className="story-face">
                    <CatalogImage src={s.cover} alt="" fill sizes="88px" className="object-cover" />
                  </span>
                </span>
                <span aria-hidden className="story-name">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {at && <StoryViewer stories={stories} at={at} onMove={show} onClose={() => setAt(null)} />}
    </section>
  );
}

function StoryViewer({ stories, at, onMove, onClose }: { stories: Story[]; at: StoryAt; onMove: (at: StoryAt) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { currency } = useStore();
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  // Something open over the story: the options sheet, or the bag after Add to bag.
  const [covered, setCovered] = useState(false);
  const pressed = useRef(0);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const story = stories[at.story];
  const piece = story.pieces[at.piece];
  const next = story.pieces[at.piece + 1];

  const go = (dir: 1 | -1) => {
    const to = stepStory(stories.map((s) => s.pieces.length), at, dir);
    if (to) onMove(to);
    else ref.current?.close();
  };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const check = () => setCovered([...document.querySelectorAll("dialog[open]")].some((x) => x !== d));
    const watch = new MutationObserver(check);
    watch.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    return () => {
      watch.disconnect();
      root.style.overflow = overflow;
      if (d.open) d.close();
    };
  }, []);

  const keys = (e: KeyboardEvent<HTMLDialogElement>) => {
    // Keys meant for a sheet opened over the story stay there.
    if (covered || (e.target as Element).closest("dialog") !== ref.current) return;
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else return;
    e.preventDefault();
  };
  const press = () => {
    pressed.current = Date.now();
    setHeld(true);
  };
  const release = () => setHeld(false);
  // A tap moves on; a long press only held the piece still. (Keys click with no press at all.)
  const tap = (e: MouseEvent, dir: 1 | -1) => {
    if (e.detail > 0 && Date.now() - pressed.current > 350) return;
    go(dir);
  };
  const running = !paused && !held && !covered && !still;

  return (
    <dialog ref={ref} className="story-viewer" aria-label={`Story: ${story.title}`} onClose={onClose} onKeyDown={keys}>
      <div className="story-stage">
        {/* The whole photo (a product's shoes sit at its foot), over a blurred copy of itself. */}
        <CatalogImage key={`${piece.slug}-backdrop`} src={piece.image} alt="" fill loading="eager" sizes="(min-width: 640px) 28rem, 100vw" className="story-backdrop object-cover" />
        <CatalogImage key={piece.slug} src={piece.image} alt={piece.title} fill loading="eager" sizes="(min-width: 640px) 28rem, 100vw" className="story-photo object-contain" />
        {next && (
          <span aria-hidden className="pointer-events-none absolute size-px overflow-hidden opacity-0">
            <CatalogImage src={next.image} alt="" fill loading="eager" sizes="(min-width: 640px) 28rem, 100vw" className="object-cover" />
          </span>
        )}
        <button type="button" aria-label="Previous piece" className="story-tap story-tap-back" onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onClick={(e) => tap(e, -1)} />
        <button type="button" aria-label="Next piece" className="story-tap story-tap-on" onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onClick={(e) => tap(e, 1)} />

        <div className="story-top">
          <div className="story-bars" aria-hidden>
            {story.pieces.map((p, j) => (
              <span key={`${at.story}-${j}-${j === at.piece ? "now" : ""}`} className="story-bar">
                <span
                  className="story-bar-fill"
                  data-state={j < at.piece ? "done" : j === at.piece ? "now" : undefined}
                  style={j === at.piece ? { animationDuration: `${PIECE_MS}ms`, animationPlayState: running ? "running" : "paused" } : undefined}
                  onAnimationEnd={j === at.piece ? () => go(1) : undefined}
                />
              </span>
            ))}
          </div>
          <div className="story-head">
            <span className="story-avatar">
              <CatalogImage src={story.cover} alt="" fill sizes="32px" className="object-cover" />
            </span>
            <p className="min-w-0 truncate text-sm font-semibold">{story.title}</p>
            <p className="shrink-0 text-xs text-white/75 tabular-nums">
              {at.piece + 1} / {story.pieces.length}
            </p>
            {!still && (
              <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label="Pause the story" className="story-icon ml-auto">
                <svg viewBox="0 0 12 12" className="size-3.5" fill="currentColor" aria-hidden>
                  {paused ? <path d="M3 1.5v9l7.5-4.5z" /> : <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />}
                </svg>
              </button>
            )}
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close the story" className={`story-icon ${still ? "ml-auto" : ""}`}>
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        <div className="story-foot">
          <div aria-live="polite">
            <Link href={`/products/${piece.slug}`} className="story-title">{piece.title}</Link>
            <p className="mt-1 text-sm tabular-nums">
              {piece.maxPrice > piece.price ? "From " : ""}
              {formatMoney(piece.price, currency)}
              {piece.compareAt !== null && piece.compareAt > piece.price && (
                <s className="ml-2 text-white/70">
                  <span className="sr-only">Was </span>
                  {formatMoney(piece.compareAt, currency)}
                </s>
              )}
            </p>
          </div>
          <PieceActions key={piece.slug} piece={piece} />
          <Link href={story.href} className="story-all">See all of {story.title} →</Link>
        </div>
      </div>
    </dialog>
  );
}

function PieceActions({ piece }: { piece: Piece }) {
  const { start, loading, dialog } = useQuickAdd(piece.slug, piece.title);
  return (
    <div className="mt-3 flex gap-2">
      {piece.soldOut ? (
        <span className="story-btn story-btn-line">Sold out</span>
      ) : (
        <button type="button" disabled={loading} aria-haspopup="dialog" onClick={() => void start()} className="story-btn">
          {loading ? "Adding…" : "Add to bag"}
        </button>
      )}
      <Link href={`/products/${piece.slug}`} className="story-btn story-btn-line">See the piece</Link>
      {dialog}
    </div>
  );
}
