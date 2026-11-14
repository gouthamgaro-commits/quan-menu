// Draws the app icon (a "P" with a tick on a blue-violet tile) and writes the PNG sizes
// phones and browsers ask for. Run once after changing the design: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const mark = (scale) => `
  <g transform="translate(256 256) scale(${scale}) translate(-12 -12)" fill="none" stroke="#fff"
     stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 20V4h5.5a4.5 4.5 0 0 1 0 9H8"/>
    <path d="M15.5 17.5l2 2 3.5-4"/>
  </g>`;
const tile = (radius, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3446e0"/><stop offset="1" stop-color="#6b3df0"/></linearGradient></defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#g)"/>${mark(scale)}</svg>`;

await mkdir("public", { recursive: true });
const rounded = Buffer.from(tile(112, 15));
const full = Buffer.from(tile(0, 11)); // maskable: full bleed, mark inside the safe zone
await sharp(rounded).resize(192).png().toFile("public/icon-192.png");
await sharp(rounded).resize(512).png().toFile("public/icon-512.png");
await sharp(full).resize(512).png().toFile("public/icon-maskable.png");
await sharp(full).resize(180).png().toFile("src/app/apple-icon.png");
await sharp(rounded).resize(64).png().toFile("src/app/icon.png");
console.log("icons written");
