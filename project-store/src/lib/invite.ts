import "server-only";
import { cookies } from "next/headers";
import { findReferrer, getSettings } from "./data";
import { REF_COOKIE } from "./referral";

/** The friend's code this visitor arrived with (from an invite link), if it still works. */
export async function currentInvite(): Promise<{ code: string; friend: string; discount: number } | null> {
  const code = (await cookies()).get(REF_COOKIE)?.value ?? "";
  if (!code) return null;
  const s = await getSettings();
  if (!s.referralOn || s.referralDiscount <= 0) return null;
  const friend = await findReferrer(code);
  if (!friend) return null;
  return { code, friend: friend.studentName.split(/\s+/)[0], discount: s.referralDiscount };
}
