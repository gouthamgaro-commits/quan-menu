import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { vnd } from "@/lib/i18n";
import { loadMenu } from "./load";

/**
 * The picture shown when a menu link is shared on Zalo, Facebook or Messenger: the stall's name,
 * a few dishes with prices, and what the menu does. Drawn like the menu itself: warm white paper,
 * near-black ink, a brass label, Fraunces for the names.
 */
export const alt = "Menu · Quán";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const PAPER = "#f6f5f1", INK = "#1a1917", MUTED = "#6f6b63", LINE = "#e7e4dd", BRASS = "#7d5f24";

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
  const dishes = (menu?.dishes ?? []).slice(0, 4);
  const more = (menu?.dishes.length ?? 0) - dishes.length;
  const name = menu?.name ?? "Thực đơn QR 4 thứ tiếng";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "52px 64px", fontFamily: "BVP", color: INK, background: PAPER }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 46, letterSpacing: -1 }}>
            Quán<span style={{ color: "#c0322a" }}>.</span>
          </div>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 800, letterSpacing: 5, color: BRASS, border: `2px solid ${BRASS}`, borderRadius: 99, padding: "8px 22px" }}>
            THỰC ĐƠN · MENU
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: name.length > 26 ? 66 : 84, lineHeight: 1.02, letterSpacing: -2 }}>
            {name}
          </div>
          {menu?.area ? <div style={{ display: "flex", fontSize: 30, color: MUTED }}>{menu.area}</div> : null}
        </div>
        {dishes.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 26, padding: "18px 30px",
            boxShadow: "0 18px 40px -26px rgba(30, 26, 20, 0.35)" }}>
            {dishes.map((d, k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 28, gap: 24, padding: "7px 0",
                borderTop: k ? `1px dashed ${LINE}` : "none" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "baseline", overflow: "hidden" }}>
                  <span style={{ fontWeight: 800 }}>{d.vi}</span>
                  {d.name?.en ? <span style={{ fontSize: 22, color: MUTED }}>{d.name.en}</span> : null}
                </div>
                <span style={{ fontWeight: 800 }}>{vnd(d.opts?.sizes?.[0]?.price || d.price)}</span>
              </div>
            ))}
            {more > 0 ? <div style={{ display: "flex", fontSize: 20, color: BRASS, paddingTop: 6 }}>+ {more} more {more === 1 ? "dish" : "dishes"}</div> : null}
          </div>
        ) : null}
        <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: BRASS }}>
          English · Korean · Chinese · Japanese menu, with prices
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
