// Stories: round circles on the home page that open full screen, a piece at a time, as on
// Instagram: what's new, the store's featured collections and its sale. Each piece shows for
// a few seconds (or until the shopper taps on), with its price and Add to bag.

import type { LookPin } from "./looks";
import type { ProductCard } from "./types";

/** A piece as stories and shop-the-look tags show it. */
export type Piece = LookPin["product"];

export interface Story {
  key: string;
  title: string;
  /** The circle's picture. */
  cover: string | null;
  /** Where "see them all" goes. */
  href: string;
  pieces: Piece[];
}

/** How long each piece shows, in milliseconds, unless the shopper taps on. */
export const PIECE_MS = 5000;
/** The most pieces a story shows. */
export const STORY_PIECES = 8;

export function pieceOf(p: ProductCard): Piece {
  return { slug: p.slug, title: p.title, image: p.image_url, price: p.price, maxPrice: p.max_price, compareAt: p.compare_at_price, soldOut: p.available_stock <= 0 };
}

/** A story from a list of products: its pictured pieces, each once; null with fewer than two. */
export function storyOf(key: string, title: string, href: string, cards: ProductCard[], cover?: string | null): Story | null {
  const pieces = cards.filter((p, i, all) => p.image_url && all.findIndex((q) => q.id === p.id) === i).slice(0, STORY_PIECES).map(pieceOf);
  return pieces.length >= 2 ? { key, title, href, cover: cover || pieces[0].image, pieces } : null;
}

/**
 * What a story looks like to the shopper who has watched it: its key and its first piece, so a
 * story with something new at the front lights up again.
 */
export const storyMark = (s: Story) => `${s.key}:${s.pieces[0]?.slug ?? ""}`;

export type StoryAt = { story: number; piece: number };

/**
 * The next place a viewer goes, given each story's number of pieces: on through a story's
 * pieces, then into the next story; back to the previous piece, or to the start of the previous
 * story. Null when the last piece of the last story is done (the viewer closes); going back from
 * the very first piece stays on it.
 */
export function stepStory(counts: number[], at: StoryAt, dir: 1 | -1): StoryAt | null {
  if (dir === 1) {
    if (at.piece + 1 < (counts[at.story] ?? 0)) return { story: at.story, piece: at.piece + 1 };
    return at.story + 1 < counts.length ? { story: at.story + 1, piece: 0 } : null;
  }
  if (at.piece > 0) return { story: at.story, piece: at.piece - 1 };
  return { story: Math.max(0, at.story - 1), piece: 0 };
}
