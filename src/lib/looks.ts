// Shop the look: dots on the opening banner's picture, one on each piece the store has tagged
// (Settings › Homepage). Spots are kept in percent of the whole picture, so they stay on the
// piece however a design crops the picture to fit its frame.

/** The most pieces one picture can tag. */
export const MAX_LOOKS = 4;

/** A tagged piece, ready for the storefront: where it sits and what shoppers see when they tap it. */
export interface LookPin {
  x: number;
  y: number;
  product: {
    slug: string;
    title: string;
    image: string | null;
    price: number;
    maxPrice: number;
    compareAt: number | null;
    soldOut: boolean;
  };
}

type Size = { w: number; h: number };

/**
 * Where a spot on a picture lands in a frame the picture covers (CSS object-fit: cover), in
 * percent of the frame; null when the frame crops the spot away, or leaves it so near an edge
 * that a dot there would be cut in half. `position` is the picture's object-position, 0 to 1
 * each way (0.5, 0.5 centres it).
 */
export function placeOnCover(spot: { x: number; y: number }, frame: Size, picture: Size, position = { x: 0.5, y: 0.5 }): { left: number; top: number } | null {
  if (!(frame.w > 0 && frame.h > 0 && picture.w > 0 && picture.h > 0)) return null;
  const scale = Math.max(frame.w / picture.w, frame.h / picture.h);
  const w = picture.w * scale;
  const h = picture.h * scale;
  const left = ((frame.w - w) * position.x + (spot.x / 100) * w) / frame.w;
  const top = ((frame.h - h) * position.y + (spot.y / 100) * h) / frame.h;
  const edge = 0.04;
  if (left < edge || left > 1 - edge || top < edge || top > 1 - edge) return null;
  return { left: left * 100, top: top * 100 };
}

/** A computed object-position ("50% 0%") as fractions; anything other than percentages centres. */
export function objectPosition(value: string | null | undefined): { x: number; y: number } {
  const [x, y] = (value ?? "").trim().split(/\s+/).map((part) => (/^-?[\d.]+%$/.test(part) ? Number.parseFloat(part) / 100 : 0.5));
  return { x: x ?? 0.5, y: y ?? 0.5 };
}

type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };

/**
 * Where a w×h tag goes beside its dot (box r) on a vw×vh screen: to its right, else to its
 * left, else centred under it (over it when there's no room under), always wholly on screen.
 */
export function tagPlace(r: Box, w: number, h: number, vw: number, vh: number, gap = 10, margin = 12): { left: number; top: number } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const middle = r.top + r.height / 2 - h / 2;
  let left: number;
  let top: number;
  if (r.right + gap + w <= vw - margin) [left, top] = [r.right + gap, middle];
  else if (r.left - gap - w >= margin) [left, top] = [r.left - gap - w, middle];
  else [left, top] = [r.left + r.width / 2 - w / 2, r.bottom + gap + h <= vh - margin ? r.bottom + gap : r.top - gap - h];
  return { left: clamp(left, margin, Math.max(margin, vw - margin - w)), top: clamp(top, margin, Math.max(margin, vh - margin - h)) };
}
