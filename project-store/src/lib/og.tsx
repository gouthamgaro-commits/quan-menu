import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const DIFF = ["", "Easy", "Medium", "Hard", "Expert"];
const DIFF_COLOR = ["", "#3ddc97", "#5ea8ff", "#ff9a52", "#c58bff"];

/** Rupees with Indian grouping. Share images say "Rs": the font has no ₹ sign. */
function rs(n: number) {
  return "Rs " + Math.round(n).toLocaleString("en-IN");
}

/**
 * The preview card WhatsApp, Telegram and Instagram show when a link is shared:
 * brand, title, a line of detail and (for projects) price and difficulty.
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
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "radial-gradient(700px 400px at 90% 0%, rgba(124,92,255,0.55), transparent 70%), radial-gradient(600px 380px at 0% 100%, rgba(34,211,238,0.28), transparent 70%), #070a17",
          color: "#eef1ff",
          fontFamily: "Jakarta",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #7c5cff, #3b82f6 60%, #22d3ee)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>{p.brand}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: p.title.length > 60 ? 54 : 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1050 }}>
            {p.title}
          </div>
          <div style={{ fontSize: 30, color: "#b9c0dd", maxWidth: 1000, lineHeight: 1.3 }}>{p.subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {p.price != null && (
            <div style={{ display: "flex", background: "linear-gradient(120deg, #7c5cff, #4f7bff 55%, #22b8e6)", color: "#fff", fontSize: 34, fontWeight: 800, padding: "12px 26px", borderRadius: 16 }}>
              {rs(p.price)}
            </div>
          )}
          {p.negotiable && (
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: "#ffcf8a", background: "rgba(255,179,71,0.14)", border: "1px solid rgba(255,179,71,0.4)", padding: "12px 20px", borderRadius: 16 }}>
              Negotiable
            </div>
          )}
          {p.difficulty != null && (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 800,
                color: DIFF_COLOR[p.difficulty],
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                padding: "12px 22px",
                borderRadius: 16,
              }}
            >
              {DIFF[p.difficulty]}
            </div>
          )}
          {(p.chips ?? []).map((c) => (
            <div key={c} style={{ display: "flex", fontSize: 26, fontWeight: 500, color: "#dfe4ff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", padding: "12px 20px", borderRadius: 16 }}>
              {c}
            </div>
          ))}
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
