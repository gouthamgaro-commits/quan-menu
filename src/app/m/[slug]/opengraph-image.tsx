import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { vnd } from "@/lib/i18n";
import { loadMenu } from "./load";

/**
 * The picture shown when a menu link is shared on Zalo, Facebook or Messenger: the stall's name,
 * a few dishes with prices, and what the menu does. Drawn like the menu itself: jade with the
 * gạch bông tile, ivory card, gold accents, Fraunces for the names.
 */
export const alt = "Menu · Quán";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

// The gạch bông tile from globals.css, a little stronger for a small preview.
const TILE = "data:image/svg+xml," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 56 56'><g fill='none' stroke='#e0b65e' stroke-opacity='.2' stroke-width='1'>" +
  "<path d='M28 6 50 28 28 50 6 28Z'/><circle cx='28' cy='28' r='8'/>" +
  "<path d='M0 14A14 14 0 0 0 14 0M42 0A14 14 0 0 0 56 14M56 42A14 14 0 0 0 42 56M14 56A14 14 0 0 0 0 42'/></g></svg>",
);

// Be Vietnam Pro and Fraunces (SIL Open Font License, assets/fonts/*OFL.txt). Whole static fonts:
// every Vietnamese letter and the ₫ sign come from the right font, with nothing to fall back on.
// The paths are written out in full so the build ships the files (see also next.config.ts).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [menu, regular, bold, display] = await Promise.all([
    loadMenu(slug).catch(() => null),
    readFile(join(process.cwd(), "assets/fonts/BeVietnamPro-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/BeVietnamPro-ExtraBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Fraunces-SemiBold.ttf")),
  ]);
  const ivory = "#f4efe4", gold = "#e0b65e";
  const dishes = (menu?.dishes ?? []).slice(0, 4);
  const more = (menu?.dishes.length ?? 0) - dishes.length;
  const name = menu?.name ?? "Thực đơn QR 4 thứ tiếng";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "BVP", color: ivory,
        backgroundImage: "linear-gradient(165deg, #1d4a3b, #0f2a22)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: `url("${TILE}")`, backgroundRepeat: "repeat", backgroundSize: "72px 72px" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "radial-gradient(circle at 100% 0%, rgba(58,130,104,.55), rgba(58,130,104,0) 55%)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "52px 64px", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 46, letterSpacing: -1 }}>
              Quán<span style={{ color: "#e0533f" }}>.</span>
            </div>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 800, letterSpacing: 5, color: gold, border: `2px solid ${gold}`, borderRadius: 99, padding: "8px 22px" }}>
              THỰC ĐƠN · MENU
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: name.length > 26 ? 66 : 84, lineHeight: 1.02, letterSpacing: -2 }}>
              {name}
            </div>
            {menu?.area ? <div style={{ display: "flex", fontSize: 30, color: "rgba(244,239,228,.82)" }}>{menu.area}</div> : null}
          </div>
          {dishes.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", background: "#fffdf9", color: "#1d211c", borderRadius: 26, padding: "18px 30px" }}>
              {dishes.map((d, k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 28, gap: 24, padding: "7px 0",
                  borderTop: k ? "1px dashed #e0d6c4" : "none" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "baseline", overflow: "hidden" }}>
                    <span style={{ fontWeight: 800 }}>{d.vi}</span>
                    {d.name?.en ? <span style={{ fontSize: 22, color: "#6e6a5f" }}>{d.name.en}</span> : null}
                  </div>
                  <span style={{ fontWeight: 800, color: "#163a2f" }}>{vnd(d.opts?.sizes?.[0]?.price || d.price)}</span>
                </div>
              ))}
              {more > 0 ? <div style={{ display: "flex", fontSize: 20, color: "#8a5f14", paddingTop: 6 }}>+ {more} more {more === 1 ? "dish" : "dishes"}</div> : null}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: gold }}>
            English · Korean · Chinese · Japanese menu, with prices
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "BVP", data: regular, weight: 400, style: "normal" },
        { name: "BVP", data: bold, weight: 800, style: "normal" },
        { name: "Fraunces", data: display, weight: 600, style: "normal" },
      ],
    },
  );
}
