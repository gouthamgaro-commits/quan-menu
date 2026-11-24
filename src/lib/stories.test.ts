import { describe, expect, it } from "vitest";
import { stepStory, storyMark, storyOf } from "./stories";
import type { ProductCard } from "./types";

const card = (id: string, image: string | null = `https://images.unsplash.com/photo-${id}`): ProductCard => ({
  id,
  slug: `piece-${id}`,
  title: `Piece ${id}`,
  brand_name: null,
  brand_slug: null,
  price: 199900,
  max_price: 199900,
  compare_at_price: null,
  on_sale: false,
  available_stock: id === "gone" ? 0 : 5,
  image_url: image,
  image_alt: null,
  hover_image_url: null,
  swatches: [],
  rating_avg: null,
  rating_count: 0,
  published_at: "2026-11-01T00:00:00Z",
});

describe("a story's pieces", () => {
  it("are the pictured products, each once, at most eight", () => {
    const s = storyOf("new", "New in", "/shop?sort=newest", [card("a"), card("b", null), card("a"), ...Array.from({ length: 10 }, (_, i) => card(String(i)))])!;
    expect(s.pieces.map((p) => p.slug)).toEqual(["piece-a", "piece-0", "piece-1", "piece-2", "piece-3", "piece-4", "piece-5", "piece-6"]);
    expect(s.cover).toBe("https://images.unsplash.com/photo-a");
  });

  it("make no story with fewer than two", () => {
    expect(storyOf("sale", "Sale", "/shop?sale=1", [card("a")])).toBeNull();
    expect(storyOf("sale", "Sale", "/shop?sale=1", [card("a"), card("b", null)])).toBeNull();
  });

  it("keep the collection's own picture for the circle, and say when a piece is sold out", () => {
    const s = storyOf("y2k", "Y2K Revival", "/collections/y2k-revival", [card("a"), card("gone")], "https://images.unsplash.com/photo-cover")!;
    expect(s.cover).toBe("https://images.unsplash.com/photo-cover");
    expect(s.pieces.map((p) => p.soldOut)).toEqual([false, true]);
  });

  it("light up again when something new leads the story", () => {
    const before = storyOf("new", "New in", "/", [card("a"), card("b")])!;
    const after = storyOf("new", "New in", "/", [card("c"), card("a"), card("b")])!;
    expect(storyMark(before)).not.toBe(storyMark(after));
    expect(storyMark(before)).toBe(storyMark(storyOf("new", "New in", "/", [card("a"), card("b"), card("d")])!));
  });
});

describe("moving through stories", () => {
  const counts = [3, 2, 4];

  it("goes on through a story, then into the next, and closes after the last piece", () => {
    expect(stepStory(counts, { story: 0, piece: 0 }, 1)).toEqual({ story: 0, piece: 1 });
    expect(stepStory(counts, { story: 0, piece: 2 }, 1)).toEqual({ story: 1, piece: 0 });
    expect(stepStory(counts, { story: 2, piece: 3 }, 1)).toBeNull();
  });

  it("goes back a piece, or to the start of the story before, and stays on the very first", () => {
    expect(stepStory(counts, { story: 1, piece: 1 }, -1)).toEqual({ story: 1, piece: 0 });
    expect(stepStory(counts, { story: 1, piece: 0 }, -1)).toEqual({ story: 0, piece: 0 });
    expect(stepStory(counts, { story: 0, piece: 0 }, -1)).toEqual({ story: 0, piece: 0 });
  });
});
