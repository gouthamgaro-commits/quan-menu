"use client";
import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { STRINGS, UI_COOKIE, type Strings, type UiLang } from "@/lib/strings";

const Ctx = createContext<{ lang: UiLang; t: Strings }>({ lang: "vi", t: STRINGS.vi });

/** Gives vendor screens their language. Pages read the cookie on the server and pass it in. */
export function UiProvider({ lang, children }: { lang: UiLang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, t: STRINGS[lang] }}>{children}</Ctx.Provider>;
}

export const useUi = () => useContext(Ctx);

/** VI / EN switch: remembers the choice for a year and re-renders the page in place, keeping unsaved edits. */
export function LangSwitch() {
  const { lang, t } = useUi();
  const router = useRouter();
  const next: UiLang = lang === "vi" ? "en" : "vi";
  return (
    <button className="btn lang-switch" type="button" aria-label={t.switchLabel} title={t.switchLabel}
      onClick={() => {
        document.cookie = `${UI_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
        router.refresh();
      }}>
      {next === "en" ? "EN" : "VI"}
    </button>
  );
}
