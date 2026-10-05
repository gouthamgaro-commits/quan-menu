import { NextResponse } from "next/server";
import { AiError, translateDishes } from "@/lib/ai";
import { requireVendor } from "@/lib/guard";
import { serverT } from "@/lib/server-ui";

export const maxDuration = 60;

export async function POST(req: Request) {
  const denied = await requireVendor();
  if (denied) return denied;
  const t = await serverT();

  let names: string[] = [];
  try {
    const body = await req.json();
    names = (Array.isArray(body?.names) ? body.names : [])
      .filter((n: unknown): n is string => typeof n === "string" && n.trim().length > 0)
      .map((n: string) => n.trim().slice(0, 200));
  } catch {}
  if (!names.length) return NextResponse.json({ error: t.srvNoNames }, { status: 400 });
  if (names.length > 40) return NextResponse.json({ error: t.srvTooMany }, { status: 400 });

  try {
    return NextResponse.json({ dishes: await translateDishes(names) });
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("unknown");
    if (!(e instanceof AiError)) console.error(e);
    return NextResponse.json({ error: t.ai[err.code] }, { status: err.status });
  }
}
