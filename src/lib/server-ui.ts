import { cookies } from "next/headers";
import { STRINGS, UI_COOKIE, pickUi, type Strings, type UiLang } from "./strings";

/** The vendor's chosen screen language (Vietnamese unless they switched to English). */
export async function uiLang(): Promise<UiLang> {
  return pickUi((await cookies()).get(UI_COOKIE)?.value);
}

export async function serverT(): Promise<Strings> {
  return STRINGS[await uiLang()];
}
