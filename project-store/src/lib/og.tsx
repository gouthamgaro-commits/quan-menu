import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const DIFF = ["", "easy", "medium", "hard", "expert"];
const DIFF_BG = ["", "#eaffc2", "#dbe2ff", "#ffe0c7", "#ecdcff"];
const INK = "#0d0d12";

/** Rupees with Indian grouping. Share images say "Rs": the font has no ₹ sign. */
function rs(n: number) {
  return "Rs " + Math.round(n).toLocaleString("en-IN");
}

const chip = (bg: string) => ({
  display: "flex",
  alignItems: "center",
  fontSize: 27,
  fontWeight: 800,
  color: INK,
  background: bg,
  border: `4px solid ${INK}`,
  borderRadius: 999,
  padding: "8px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
});

/**
 * The preview card WhatsApp, Telegram and Instagram show when a link is shared, in the site's
 * Gen Z style: cream paper, thick black outlines, hard shadows and loud stickers.
 */
export async function shareImage(p: {
  brand: string;
  title: string;
  subtitle: string;
  price?: number;
  difficulty?: number;
  chips?: string[];
  negotiable?: boolean;
}) {
  // Plus Jakarta Sans (SIL Open Font License, assets/fonts/OFL.txt), the same face as the site.
  const dir = path.join(process.cwd(), "assets", "fonts");
  const [bold, medium] = await Promise.all([
    readFile(path.join(dir, "PlusJakartaSans-ExtraBold.woff")),
    readFile(path.join(dir, "PlusJakartaSans-Medium.woff")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 40,
          background: "#fff6e5",
          backgroundImage: "radial-gradient(rgba(13,13,18,0.16) 2px, transparent 2px)",
          backgroundSize: "34px 34px",
          fontFamily: "Jakarta",
          color: INK,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "40px 48px",
            background: "#ffffff",
            border: `5px solid ${INK}`,
            borderRadius: 40,
            boxShadow: `14px 14px 0 ${INK}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: "#c6f432",
                  border: `4px solid ${INK}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `4px 4px 0 ${INK}`,
                }}
              >
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22v-5" />
                  <path d="M9 8V2" />
                  <path d="M15 8V2" />
                  <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" fill="#ffffff" />
                </svg>
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.5 }}>{p.brand.toLowerCase()}</div>
            </div>
            {p.negotiable && <div style={{ ...chip("#ffd23f"), transform: "rotate(4deg)" }}>negotiable</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: p.title.length > 60 ? 54 : 64, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.5, maxWidth: 1000 }}>
              {p.title}
            </div>
            <div style={{ fontSize: 29, fontWeight: 500, color: "#3a3842", maxWidth: 980, lineHeight: 1.3 }}>{p.subtitle}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {p.price != null && <div style={{ ...chip("#c6f432"), fontSize: 34, transform: "rotate(-2deg)" }}>{rs(p.price)}</div>}
            {p.difficulty != null && <div style={chip(DIFF_BG[p.difficulty])}>{DIFF[p.difficulty]}</div>}
            {(p.chips ?? []).map((c, i) => (
              <div key={c} style={chip(["#ff6eb4", "#b79cff", "#7ce0b3", "#ffffff"][i % 4])}>
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Jakarta", data: bold, weight: 800, style: "normal" },
        { name: "Jakarta", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
