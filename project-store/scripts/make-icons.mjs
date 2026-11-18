// Draws the app icon (a black plug on a lime tile with a chunky outline) and writes the PNG
// sizes phones and browsers ask for. Run after changing the design: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// The plug shape (from the Lucide icon set, ISC licence), drawn on a 24×24 grid.
const plug = (scale) => `
  <g transform="translate(256 262) scale(${scale}) translate(-12 -12)" fill="none" stroke="#0d0d12"
     stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/>
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" fill="#ffffff"/>
  </g>`;
const tile = (radius, scale, border) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="${border / 2}" y="${border / 2}" width="${512 - border}" height="${512 - border}" rx="${radius}" fill="#c6f432" stroke="#0d0d12" stroke-width="${border}"/>
  ${plug(scale)}</svg>`;

await mkdir("public", { recursive: true });
const rounded = Buffer.from(tile(120, 13, 28));
const full = Buffer.from(tile(0, 9.5, 0)); // maskable: full bleed, plug inside the safe zone
await sharp(rounded).resize(192).png().toFile("public/icon-192.png");
await sharp(rounded).resize(512).png().toFile("public/icon-512.png");
await sharp(full).resize(512).png().toFile("public/icon-maskable.png");
await sharp(full).resize(180).png().toFile("src/app/apple-icon.png");
await sharp(rounded).resize(64).png().toFile("src/app/icon.png");
console.log("icons written");
