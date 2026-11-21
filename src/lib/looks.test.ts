import { describe, expect, it } from "vitest";
import { objectPosition, placeOnCover, tagPlace } from "./looks";

describe("placing a shop-the-look dot on a cropped picture", () => {
  it("leaves a spot where it is when the frame has the picture's shape", () => {
    expect(placeOnCover({ x: 54, y: 37 }, { w: 400, h: 500 }, { w: 800, h: 1000 })).toEqual({ left: 54, top: 37 });
  });

  it("follows the picture when a narrower frame crops its sides", () => {
    // A 4:5 picture in a 3:4 frame: the picture is 1/15 wider than the frame, half of that cut each side.
    const at = placeOnCover({ x: 54, y: 37 }, { w: 300, h: 400 }, { w: 800, h: 1000 })!;
    expect(at.top).toBeCloseTo(37);
    expect(at.left).toBeCloseTo(-100 / 30 + 54 * (16 / 15));
  });

  it("follows the picture when a wide frame crops its top and bottom", () => {
    // A 4:5 picture across a 16:9 frame shows only its middle band.
    const at = placeOnCover({ x: 50, y: 50 }, { w: 1600, h: 900 }, { w: 800, h: 1000 })!;
    expect(at).toEqual({ left: 50, top: 50 });
    expect(placeOnCover({ x: 50, y: 20 }, { w: 1600, h: 900 }, { w: 800, h: 1000 })).toBeNull();
  });

  it("honours where the picture is anchored", () => {
    // Anchored to the top, the band shown is the picture's top, so a spot high up stays in view.
    const at = placeOnCover({ x: 50, y: 20 }, { w: 1600, h: 900 }, { w: 800, h: 1000 }, { x: 0.5, y: 0 })!;
    expect(at.top).toBeCloseTo(20 * (2000 / 900));
  });

  it("drops spots cut off by the frame or too near its edge to show a whole dot", () => {
    expect(placeOnCover({ x: 1, y: 50 }, { w: 300, h: 400 }, { w: 800, h: 1000 })).toBeNull();
    expect(placeOnCover({ x: 50, y: 99 }, { w: 400, h: 500 }, { w: 800, h: 1000 })).toBeNull();
  });

  it("places nothing before the picture has loaded", () => {
    expect(placeOnCover({ x: 50, y: 50 }, { w: 300, h: 400 }, { w: 0, h: 0 })).toBeNull();
    expect(placeOnCover({ x: 50, y: 50 }, { w: 0, h: 0 }, { w: 800, h: 1000 })).toBeNull();
  });

  it("reads a computed object-position, centring anything but percentages", () => {
    expect(objectPosition("50% 50%")).toEqual({ x: 0.5, y: 0.5 });
    expect(objectPosition("50% 0%")).toEqual({ x: 0.5, y: 0 });
    expect(objectPosition("20px 30%")).toEqual({ x: 0.5, y: 0.3 });
    expect(objectPosition("")).toEqual({ x: 0.5, y: 0.5 });
    expect(objectPosition(undefined)).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("placing a piece's tag beside its dot", () => {
  const dot = (x: number, y: number) => ({ left: x - 22, right: x + 22, top: y - 22, bottom: y + 22, width: 44, height: 44 });

  it("goes to the right of the dot, level with it, where there's room", () => {
    expect(tagPlace(dot(400, 300), 272, 150, 1440, 900)).toEqual({ left: 432, top: 225 });
  });

  it("goes to the left near the right edge of the screen", () => {
    expect(tagPlace(dot(1300, 300), 272, 150, 1440, 900)).toEqual({ left: 1300 - 22 - 10 - 272, top: 225 });
  });

  it("goes under the dot on a phone, centred and kept on screen", () => {
    expect(tagPlace(dot(200, 300), 272, 150, 390, 844)).toEqual({ left: 64, top: 332 });
    expect(tagPlace(dot(120, 300), 272, 150, 390, 844).left).toBe(12);
  });

  it("goes over the dot when there's no room under it", () => {
    expect(tagPlace(dot(200, 780), 272, 150, 390, 844).top).toBe(780 - 22 - 10 - 150);
  });
});
