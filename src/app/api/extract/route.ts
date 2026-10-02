import { NextResponse } from "next/server";
import { AiError, extractMenu } from "@/lib/ai";
import { requireVendor } from "@/lib/guard";

export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_BASE64 = 6_000_000; // ~4.5 MB image; the browser shrinks photos before sending

export async function POST(req: Request) {
  const denied = await requireVendor();
  if (denied) return denied;

  let body: { image?: unknown; type?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the photo as JSON." }, { status: 400 });
  }
  const image = typeof body.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
  const type = TYPES.find((t) => t === body.type);
  if (!image || !type) return NextResponse.json({ error: "Choose a JPG, PNG or WebP photo." }, { status: 400 });
  if (image.length > MAX_BASE64) return NextResponse.json({ error: "That photo is too large. Try a smaller one." }, { status: 413 });

  try {
    return NextResponse.json(await extractMenu(image, type));
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("Something went wrong reading the menu. Try again.");
    if (!(e instanceof AiError)) console.error(e);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
