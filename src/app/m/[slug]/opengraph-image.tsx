import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { vnd } from "@/lib/i18n";
import { loadMenu } from "./load";

/**
 * The picture shown when a menu link is shared on Zalo, Facebook or Messenger: the stall's name,
 * a few dishes with prices, and what the menu does. Drawn in the brand's sign yellow.
 */
export const alt = "Menu · Quán";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

// Be Vietnam Pro (SIL Open Font License, assets/fonts/OFL.txt). Whole fonts, not subsets: every
// letter and the ₫ sign come from the font of the right weight, with nothing left to fall back on.
// The paths are written out in full so the build ships the files (see also next.config.ts).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [menu, regular, bold] = await Promise.all([
    loadMenu(slug).catch(() => null),
    readFile(join(process.cwd(), "assets/fonts/BeVietnamPro-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/BeVietnamPro-ExtraBold.ttf")),
  ]);
  const ink = "#1a1405";
  const dishes = (menu?.dishes ?? []).slice(0, 4);
  const more = (menu?.dishes.length ?? 0) - dishes.length;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffd23f", color: ink, padding: "56px 64px", fontFamily: "BVP" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
            Quán<span style={{ color: "#c8231b" }}>.</span>
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 800, letterSpacing: 3, border: `3px solid ${ink}`, borderRadius: 99, padding: "6px 20px" }}>
            MENU · THỰC ĐƠN
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: menu && menu.name.length > 28 ? 64 : 80, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            {menu?.name ?? "Thực đơn QR 4 thứ tiếng"}
          </div>
          {menu?.area ? <div style={{ display: "flex", fontSize: 32 }}>{menu.area}</div> : null}
        </div>
        {dishes.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#fff", borderRadius: 24, padding: "24px 32px" }}>
            {dishes.map((d, k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 30, gap: 24 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "baseline", overflow: "hidden" }}>
                  <span style={{ fontWeight: 800 }}>{d.vi}</span>
                  {d.name?.en ? <span style={{ fontSize: 24, color: "#56665f" }}>{d.name.en}</span> : null}
                </div>
                <span style={{ fontWeight: 800 }}>{vnd(d.opts?.sizes?.[0]?.price || d.price)}</span>
              </div>
            ))}
            {more > 0 ? <div style={{ display: "flex", fontSize: 22, color: "#56665f" }}>+ {more} more {more === 1 ? "dish" : "dishes"}</div> : null}
          </div>
        ) : null}
        <div style={{ display: "flex", fontSize: 26, fontWeight: 800 }}>
          English · Korean · Chinese · Japanese menu, with prices
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "BVP", data: regular, weight: 400, style: "normal" },
        { name: "BVP", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
}
