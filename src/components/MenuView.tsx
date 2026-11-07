"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALLERGENS, ALLERGEN_VI, CURRENCIES, CURRENCY_CODES, DIET, LANGS, LANG_CURRENCY, NOTES, NOTE_KEYS,
  guessCurrency, guessLang, inCurrency, isCurrency, shortDay, vnd,
  type Currency, type NoteKey,
} from "@/lib/i18n";
import { ICE, OPT_UI, SUGAR, hasOpts, lineVi, sameLine, unitPrice, type Line } from "@/lib/drinks";
import { countByName, freshLines, loadCart, menuSig, saveCart, sentQty } from "@/lib/cart";
import type { Rates } from "@/lib/rates";
import { fold, sectionKnown, sectionName, sectionsOf } from "@/lib/sections";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import {
  ALLERGEN_KEYS, LANG_KEYS, addDays, isClosed, isTranslated, soldToday, vnToday,
  type Allergen, type Dish, type Lang, type Media, type Pay, type SoldOut, type Topping,
} from "@/lib/types";
import { bankName, vietQr } from "@/lib/vietqr";
import QrImage from "./QrImage";

interface Props {
  name: string;
  area: string;
  dishes: Dish[];
  /** Full-page public menu (true) or the phone preview inside the dashboard (false). */
  full?: boolean;
  /** The menu's address: keeps a customer's order through a reload. Not set in the editor preview. */
  slug?: string;
  /** The shop's topping list, for drinks that allow toppings. */
  toppings?: Topping[];
  /** Live exchange rates (VND per unit); fixed rates are used for any missing. */
  rates?: Rates;
  /** Public menus count views and orders, for the vendor's counters. */
  countSlug?: string;
  /** Dishes sold out today. */
  soldOut?: SoldOut;
  /** Closed through this day (Vietnam time). */
  closedUntil?: string;
  /** The day (Vietnam time) the page was made on; the phone's own clock takes over once it loads. */
  today?: string;
  /** Bank account for paying the order total by VietQR transfer. */
  pay?: Pay | null;
  /** The stall's Google Maps link, for the review button. */
  maps?: string;
  /** Editor preview only: notes for the vendor where the payment and review buttons will appear. */
  hints?: { pay: string; review: string; lang: string };
}

/** The phone's own Vietnamese voice, a woman's where there is a choice. Only used when the recorded voice can't load. */
function useViVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const vi = speechSynthesis.getVoices().filter((v) => /^vi/i.test(v.lang));
      setVoice(vi.find((v) => /hoaimy|hoài my|linh|female|nữ/i.test(v.name)) ?? vi[0] ?? null);
    };
    pick();
    speechSynthesis.addEventListener("voiceschanged", pick);
    return () => speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);
  return voice;
}

/** An order line as speech: "Trà sữa (L) · 50% đường · + Trân châu" → "Trà sữa size L, 50% đường, thêm Trân châu". */
const spoken = (line: string) => line.replace(/ \((S|M|L)\)/, " size $1").replace(/ · \+ /g, ", thêm ").replace(/ · /g, ", ");

/** Joins short sentences into parts of at most `max` characters. Each part is one recording. */
function pack(sentences: string[], max = 120): string[] {
  const out: string[] = [];
  for (const s of sentences) {
    const last = out[out.length - 1];
    if (last && last.length + s.length + 2 <= max) out[out.length - 1] = `${last}. ${s}`;
    else out.push(s.slice(0, 150));
  }
  return out;
}

const AVOID_KEY = "quan-avoid";
const CUR_KEY = "quan-cur";

/** The order screen: the first order, dishes added to it later, or the bill at the end. */
type Shown = { mode: "first" | "more" | "bill"; lines: Line[]; before: Line[] };

export default function MenuView({ name, area, dishes, full, slug, toppings = [], rates = {}, countSlug, soldOut, closedUntil, today, pay, maps, hints }: Props) {
  const [lang, setLang] = useState<Lang>("en");
  const [cart, setCart] = useState<Line[]>([]);
  // Lines the vendor has already been shown ("gọi thêm" then shows only what's new).
  const [sent, setSent] = useState<Line[]>([]);
  // Requests for the vendor ("no chili", "take away"), shown in Vietnamese on the order screen.
  const [notes, setNotes] = useState<NoteKey[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  // The drink whose options are being chosen, with the choices so far.
  const [pick, setPick] = useState<Line | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [viewer, setViewer] = useState<{ items: Media[]; at: number; title: string } | null>(null);
  // Short code shown on the order screen and sent as the transfer note, so the vendor can match payments.
  const [orderNo, setOrderNo] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [copied, setCopied] = useState(false);
  // Sold-out and closed days count for one day only: a page cached overnight must not keep yesterday's.
  const [day, setDay] = useState(today ?? "");
  useEffect(() => setDay(vnToday()), []);
  const out = useMemo(() => new Set(soldToday(soldOut, day)), [soldOut, day]);
  const closed = !!day && isClosed(closedUntil, day);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLElement>(null);
  const voice = useViVoice();
  // What is being read aloud ("d3" for dish 3, "order"), and the player, so a new tap stops the last one.
  const [saying, setSaying] = useState("");
  const player = useRef<{ audio: HTMLAudioElement | null; run: number }>({ audio: null, run: 0 });
  // The table this menu was opened at (its QR code adds ?b=3), shown to the vendor with the order.
  const [table, setTable] = useState("");
  const [find, setFind] = useState("");
  // Allergies to avoid (kept on this phone), and whether the chooser is open.
  const [avoid, setAvoid] = useState<Allergen[]>([]);
  const [avoidOpen, setAvoidOpen] = useState(false);
  // Currency for approximate prices: the customer's pick, else a guess from their phone, else the language's.
  const [curPick, setCurPick] = useState<Currency | null>(null);
  const [curGuess, setCurGuess] = useState<Currency | null>(null);
  const cur = curPick ?? curGuess ?? LANG_CURRENCY[lang];
  const L = LANGS[lang];

  useEffect(() => {
    if (!full) return;
    const b = new URLSearchParams(window.location.search).get("b") ?? "";
    if (/^[0-9A-Za-z]{1,4}$/.test(b)) setTable(b.toUpperCase());
    setLang(guessLang());
    setCurGuess(guessCurrency());
    try {
      const c = localStorage.getItem(CUR_KEY);
      if (isCurrency(c)) setCurPick(c);
      const a = JSON.parse(localStorage.getItem(AVOID_KEY) || "[]");
      if (Array.isArray(a)) setAvoid(a.filter((x): x is Allergen => ALLERGEN_KEYS.includes(x)));
    } catch {}
  }, [full]);

  useEffect(() => () => { player.current.run++; player.current.audio?.pause(); }, []);

  // One view per visit for the vendor's counter. Best effort: a failure never affects the menu.
  useEffect(() => {
    if (!countSlug || !SUPABASE_URL) return;
    const key = "quan-viewed-" + countSlug;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    rpc("count_view", { p_slug: countSlug });
  }, [countSlug]);

  // The order survives a reload of this tab, as long as the menu hasn't changed meanwhile.
  // `ready` waits for that, so nothing below acts on (or saves over) an order still being restored.
  const sig = useMemo(() => menuSig(dishes, toppings), [dishes, toppings]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = slug ? loadCart(slug, sig, dishes.length) : null;
    if (saved) {
      setCart(saved.lines); setSent(saved.sent); setOrderNo(saved.no);
      setNotes(saved.notes.filter((n): n is NoteKey => (NOTE_KEYS as string[]).includes(n)));
    }
    setReady(true);
    // Only on first load: later menu changes (the editor preview) mustn't bring back an old order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  useEffect(() => {
    if (slug && ready) saveCart(slug, sig, { lines: cart, sent, no: orderNo, notes });
  }, [slug, sig, ready, cart, sent, orderNo, notes]);

  // Drop cart lines for dishes that no longer exist (the vendor edited the preview).
  useEffect(() => {
    setCart((c) => c.filter((l) => l.i < dishes.length));
    setSent((c) => c.filter((l) => l.i < dishes.length));
    setPick(null);
  }, [dishes.length]);
  // A dish sold out since it was added: take back what the vendor hasn't been shown yet.
  useEffect(() => {
    if (!ready) return;
    setCart((c) => {
      if (!c.some((l) => out.has(dishes[l.i]?.vi))) return c;
      return c.map((l) => (out.has(dishes[l.i]?.vi) ? { ...l, q: Math.min(l.q, sentQty(l, sent)) } : l)).filter((l) => l.q > 0);
    });
  }, [ready, out, dishes, sent]);

  useEffect(() => {
    if (shown) closeRef.current?.focus();
  }, [shown]);

  useEffect(() => {
    if (!viewer) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
      if (e.key === "ArrowRight") setViewer((v) => v && { ...v, at: (v.at + 1) % v.items.length });
      if (e.key === "ArrowLeft") setViewer((v) => v && { ...v, at: (v.at - 1 + v.items.length) % v.items.length });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [viewer]);

  const O = OPT_UI[lang];
  const count = useMemo(() => cart.reduce((a, l) => a + l.q, 0), [cart]);
  const fresh = useMemo(() => freshLines(cart, sent), [cart, sent]);
  const freshCount = fresh.reduce((a, l) => a + l.q, 0);
  const priceOf = (lines: Line[]) => lines.reduce((t, l) => t + (dishes[l.i] ? unitPrice(dishes[l.i], l, toppings) * l.q : 0), 0);
  const total = useMemo(() => priceOf(cart), [cart, dishes, toppings]); // eslint-disable-line react-hooks/exhaustive-deps
  const qtyOf = (i: number) => cart.reduce((a, l) => a + (l.i === i ? l.q : 0), 0);
  const groups = useMemo(() => sectionsOf(dishes), [dishes]);
  const allergic = useMemo(() => dishes.some((d) => d.alg.length > 0), [dishes]);

  const addLine = (line: Line) =>
    setCart((c) => {
      const k = c.findIndex((l) => sameLine(l, line));
      return k >= 0 ? c.map((l, j) => (j === k ? { ...l, q: l.q + line.q } : l)) : [...c, line];
    });

  // "+" on a drink with options opens the chooser; on anything else it adds one straight away.
  const plus = (i: number) => {
    const d = dishes[i];
    if (!hasOpts(d)) return addLine({ i, q: 1 });
    setPick({ i, q: 1, size: d.opts?.sizes?.[0]?.k, sugar: d.opts?.sugar ? 100 : undefined, ice: d.opts?.ice ? "normal" : undefined, tops: [] });
  };
  // "−" takes one away from the most recently added line for that dish.
  const minus = (i: number) =>
    setCart((c) => {
      const k = c.map((l) => l.i).lastIndexOf(i);
      if (k < 0) return c;
      return c[k].q > 1 ? c.map((l, j) => (j === k ? { ...l, q: l.q - 1 } : l)) : c.filter((_, j) => j !== k);
    });

  /** The phone's own voice, for when the recording can't load. Gives up quietly if the phone can't speak. */
  const deviceSay = (text: string, done: () => void) => {
    const stop = setTimeout(done, Math.min(20_000, 2000 + text.length * 120));
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "vi-VN";
      u.rate = 0.85;
      if (voice) u.voice = voice;
      u.onend = u.onerror = () => { clearTimeout(stop); done(); };
      speechSynthesis.speak(u);
    } catch {
      clearTimeout(stop);
      done();
    }
  };

  /**
   * Reads Vietnamese aloud in a recorded woman's voice (/api/say), part after part. One audio element
   * is reused, so phones that only allow sound after a tap keep playing the later parts too.
   */
  const say = (parts: string[], key: string) => {
    const run = ++player.current.run;
    player.current.audio?.pause();
    try { speechSynthesis.cancel(); } catch {}
    const live = () => player.current.run === run;
    const done = () => { if (live()) setSaying(""); };
    const a = new Audio();
    a.defaultPlaybackRate = a.playbackRate = 0.9;
    player.current.audio = a;
    setSaying(key);
    let k = 0;
    let failed = false;
    const fail = () => {
      if (failed || !live()) return;
      failed = true;
      deviceSay(parts.slice(k).join(". "), done);
    };
    const next = () => {
      if (!live()) return;
      if (k >= parts.length) return done();
      a.src = `/api/say?t=${encodeURIComponent(parts[k])}`;
      a.play().catch(fail);
    };
    a.onended = () => { k++; next(); };
    a.onerror = fail;
    next();
  };

  const lineText = (l: Line) => (dishes[l.i] ? `${l.q} ${spoken(lineVi(dishes[l.i], l, toppings))}` : "");
  // What the customer must not eat, from their allergy filter, as the vendor reads it.
  const allergyVi = [
    ...(avoid.some((a) => !DIET.includes(a)) ? [`Tôi bị dị ứng: ${avoid.filter((a) => !DIET.includes(a)).map((a) => ALLERGEN_VI[a]).join(", ")}`] : []),
    ...(avoid.some((a) => DIET.includes(a)) ? [`Tôi không ăn: ${avoid.filter((a) => DIET.includes(a)).map((a) => ALLERGEN_VI[a]).join(", ")}`] : []),
  ];
  const notesVi = notes.map((k) => NOTES[k].vi).join(", ");
  const orderParts = (s: Shown) => {
    const tbl = table ? `Bàn ${table}. ` : "";
    if (s.mode === "bill") return pack([tbl + "Tính tiền", `Tổng ${total} đồng`]);
    const extra = [...(notesVi ? [notesVi] : []), ...allergyVi.map((x) => x.replace(":", ""))];
    if (s.mode === "more") return pack([tbl + "Cho tôi thêm", ...s.lines.map(lineText).filter(Boolean), ...extra]);
    return pack([tbl + "Cho tôi", ...s.lines.map(lineText).filter(Boolean), ...extra, `Tổng ${total} đồng`]);
  };
  const toggleNote = (k: NoteKey) =>
    // "No chili" and "a little chili" can't both be asked for.
    setNotes((n) => (n.includes(k) ? n.filter((x) => x !== k) : [...n.filter((x) => !(k === "nochili" && x === "mild") && !(k === "mild" && x === "nochili")), k]));

  /** Opens the order screen: the whole order the first time, then only what was added, or the bill. */
  function openOrder() {
    const mode: Shown["mode"] = !sent.length ? "first" : fresh.length ? "more" : "bill";
    setShown({ mode, lines: mode === "more" ? fresh : cart, before: sent });
    if (!orderNo) setOrderNo(String(1000 + Math.floor(Math.random() * 9000)));
    setShowPay(false);
    if (fresh.length) {
      if (countSlug) rpc("count_order", { p_slug: countSlug, p_items: countByName(fresh, dishes), p_new: mode === "first" });
      setSent(cart);
    }
  }

  function newOrder() {
    if (!window.confirm(L.newOrderAsk)) return;
    setCart([]);
    setSent([]);
    setNotes([]);
    setOrderNo("");
    setShown(null);
  }

  const toggleAvoid = (a: Allergen) => {
    const next = avoid.includes(a) ? avoid.filter((x) => x !== a) : [...avoid, a];
    setAvoid(next);
    try { localStorage.setItem(AVOID_KEY, JSON.stringify(next)); } catch {}
  };
  const pickCur = (c: Currency) => {
    setCurPick(c);
    try { localStorage.setItem(CUR_KEY, c); } catch {}
  };

  /** Scrolls to a menu section, just below the section bar that stays on screen. */
  const jump = (k: number) => {
    const el = document.getElementById(`sec-${k}`);
    if (!el) return;
    setActive(k);
    if (full) {
      const top = el.getBoundingClientRect().top + window.scrollY - (jumpRef.current?.offsetHeight ?? 0) + 1;
      window.scrollTo({ top, behavior: "smooth" });
    } else if (listRef.current) {
      const list = listRef.current;
      list.scrollTo({ top: list.scrollTop + el.getBoundingClientRect().top - list.getBoundingClientRect().top, behavior: "smooth" });
    }
  };

  // The section bar shows which section is on screen, and keeps that button in view.
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!groups || groups.length < 2) return;
    const scroller: HTMLElement | Window | null = full ? window : listRef.current;
    if (!scroller) return;
    // A section is current once its heading is in the top third of what's visible below the bar.
    // (Short last sections can't scroll right up to the bar, so the line can't be at the bar itself.)
    const onScroll = () => {
      const top = (full ? jumpRef.current?.getBoundingClientRect().bottom : listRef.current?.getBoundingClientRect().top) ?? 0;
      const bottom = full ? window.innerHeight : (listRef.current?.getBoundingClientRect().bottom ?? top);
      const line = top + Math.max(12, (bottom - top) / 3);
      let k = 0;
      groups.forEach((_, i) => {
        const at = document.getElementById(`sec-${i}`)?.getBoundingClientRect().top;
        if (at !== undefined && at <= line) k = i;
      });
      setActive(k);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [groups, full]);
  useEffect(() => {
    const bar = jumpRef.current;
    const btn = bar?.children[active] as HTMLElement | undefined;
    if (bar && btn && (btn.offsetLeft < bar.scrollLeft || btn.offsetLeft + btn.offsetWidth > bar.scrollLeft + bar.clientWidth)) {
      bar.scrollTo({ left: btn.offsetLeft - 16, behavior: "smooth" });
    }
  }, [active]);

  const q = fold(find);
  const matches = (d: Dish) => !q || [d.vi, d.name?.[lang], d.name?.en].some((x) => x && fold(x).includes(q));
  const safe = (d: Dish) => !d.alg.some((a) => avoid.includes(a));
  const hiddenCount = avoid.length ? dishes.filter((d) => !safe(d)).length : 0;
  const visible = (i: number) => matches(dishes[i]) && safe(dishes[i]);
  const Title = groups ? "h3" : "h2";
  const blocked = closed && (freshCount > 0 || !sent.length);

  const dishRow = (i: number) => {
    const d = dishes[i];
    const done = isTranslated(d);
    const title = done ? d.name![lang] || d.name!.en : d.vi;
    const desc = d.desc ? d.desc[lang] || d.desc.en : "";
    const n = qtyOf(i);
    const gone = out.has(d.vi);
    return (
      <div key={i} className={"dish" + (n ? " on" : "") + (gone ? " gone" : "")}>
        {(d.special || gone) && (
          <div className="badges">
            {gone && <span className="badge out">{L.soldOut}</span>}
            {d.special && !gone && <span className="badge star">⭐ {L.mustTry}</span>}
          </div>
        )}
        <div className="dish-top">
          <Title className="tn">{title}</Title>
          <div className="pr">
            {d.opts?.sizes?.length ? (
              d.opts.sizes.map((z) => <b key={z.k} className="sz"><span>{z.k}</span> {vnd(z.price)}</b>)
            ) : (
              <b>{vnd(d.price)}</b>
            )}
            <small>{inCurrency(d.opts?.sizes?.[0]?.price || d.price, cur, rates[cur])}</small>
          </div>
        </div>
        <div className="vn" lang="vi">
          {done && <span>{d.vi}</span>}
          <button className={"say" + (saying === "d" + i ? " on" : "")} onClick={() => say([d.vi], "d" + i)} aria-label={`${L.say}: ${d.vi}`}>
            🔊 {L.say} {d.pron && <i>“{d.pron}”</i>}
          </button>
        </div>
        {desc && <p>{desc}</p>}
        {hasOpts(d) && (
          <div className="opt-hint">
            {[d.opts?.sizes?.length && O.size, d.opts?.sugar && O.sugar, d.opts?.ice && O.ice, d.opts?.tops && toppings.length && O.toppings].filter(Boolean).join(" · ")}
          </div>
        )}
        {!!d.media?.length && (
          <div className="m-media">
            {d.media.map((m, k) => (
              <button key={m.url} className="m-thumb" onClick={() => setViewer({ items: d.media!, at: k, title })}
                aria-label={`${title}: ${m.type === "video" ? "video" : "photo"} ${k + 1} of ${d.media!.length}`}>
                {m.type === "video" ? (
                  <video src={m.url + "#t=0.1"} muted playsInline preload="metadata" tabIndex={-1} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" loading="lazy" />
                )}
                {m.type === "video" && <span className="media-play" aria-hidden>▶</span>}
              </button>
            ))}
          </div>
        )}
        <div className="dish-top">
          <div className="tags">
            {d.spice > 0 && (
              <span className="chili" title="Spicy" aria-label={`Spicy ${d.spice} of 3`}>
                {"🌶".repeat(d.spice)}
              </span>
            )}
            {d.alg.map((a) => (
              <span key={a} className="tag">
                {ALLERGENS[a][lang]}
              </span>
            ))}
          </div>
          <div className="qty">
            <button aria-label="Remove one" disabled={!n} onClick={() => minus(i)}>
              −
            </button>
            <span aria-live="polite">{n}</span>
            <button aria-label={hasOpts(d) ? O.choose : "Add one"} disabled={gone || closed} onClick={() => plus(i)}>
              +
            </button>
          </div>
        </div>
      </div>
    );
  };

  const anyVisible = dishes.some((_, i) => visible(i));
  const avoidBtn = (
    <button type="button" className={"avoid-btn" + (avoid.length ? " on" : "")} aria-expanded={avoidOpen} onClick={() => setAvoidOpen(!avoidOpen)}>
      ⚠️ {L.avoid}{avoid.length ? ` · ${avoid.length}` : ""}
    </button>
  );

  return (
    <div className={"menu" + (full ? " full" : "")} lang={lang}>
      <div className="m-head">
        <div>
          <h1 className="stall">{name || "Your stall"}</h1>
          {area && <div className="meta">{area}</div>}
          {table && <div className="meta tbl">🪑 {L.table(table)}</div>}
        </div>
        <div className="bar">
          <div className="langbar" role="group" aria-label="Language">
            {LANG_KEYS.map((k) => (
              <button key={k} aria-pressed={k === lang} onClick={() => setLang(k)} lang={k}>
                {LANGS[k].label}
              </button>
            ))}
          </div>
          {allergic && dishes.length < 10 && avoidBtn}
        </div>
        {dishes.length >= 10 && (
          <div className="tools">
            <input className="find" type="search" value={find} placeholder={`🔎 ${L.search}`} aria-label={L.search}
              onChange={(e) => setFind(e.target.value)} />
            {allergic && avoidBtn}
          </div>
        )}
        {avoidOpen && allergic && (
          <div className="avoid" role="group" aria-label={L.avoidHint}>
            <span>{L.avoidHint}</span>
            <div className="chips">
              {ALLERGEN_KEYS.filter((a) => dishes.some((d) => d.alg.includes(a))).map((a) => (
                <button key={a} type="button" className="chip" aria-pressed={avoid.includes(a)} onClick={() => toggleAvoid(a)}>
                  {ALLERGENS[a][lang]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* The only part that stays on screen while scrolling a long menu: one tap to each section. */}
      {groups && groups.length >= 2 && !q && (
        <nav className="jump" ref={jumpRef} aria-label={L.sections}>
          {groups.map((g, k) => (
            <button key={k} type="button" aria-current={active === k ? "true" : undefined} onClick={() => jump(k)}>{sectionName(g.cat, lang)}</button>
          ))}
        </nav>
      )}

      <div className="m-list" ref={listRef}>
        {closed && closedUntil && (
          <div className="closed" role="status">
            <b>🔒 {L.closed}</b>
            <span>{L.reopens(shortDay(addDays(closedUntil, 1), lang))} · {L.closedHint}</span>
          </div>
        )}
        {!dishes.length && <div className="empty">{L.empty}</div>}
        {hiddenCount > 0 && <p className="avoid-note">⚠️ {L.hidden(hiddenCount)} · {L.avoidNote}</p>}
        {dishes.length > 0 && !anyVisible && q && <div className="empty">{L.noMatch}</div>}
        {groups
          ? groups.map((g, k) => {
              const items = g.idx.filter(visible);
              if (!items.length) return null;
              return (
                <section key={g.cat || "_"} className="sec" aria-labelledby={`sec-${k}`}>
                  <h2 className="sec-h" id={`sec-${k}`}>
                    {sectionName(g.cat, lang)}
                    {g.cat && sectionKnown(g.cat) && sectionName(g.cat, lang) !== g.cat && <span lang="vi">{g.cat}</span>}
                  </h2>
                  {items.map(dishRow)}
                </section>
              );
            })
          : dishes.map((_, i) => (visible(i) ? dishRow(i) : null))}
        {maps && dishes.length > 0 && (
          <div className="review">
            <span>{L.reviewAsk}</span>
            <a className="btn" href={maps} target="_blank" rel="noreferrer noopener">⭐ {L.review}</a>
          </div>
        )}
        {!maps && hints && dishes.length > 0 && <p className="vhint" lang={hints.lang}>⭐ {hints.review}</p>}
      </div>

      <div className="m-foot">
        <button className="btn primary" disabled={!count || blocked} onClick={openOrder}>
          {blocked ? `🔒 ${L.closed}` : !count ? L.show0 : !sent.length ? L.show(count) : freshCount ? L.showMore(freshCount) : `💳 ${L.bill}`}
        </button>
        <small>
          {L.note}{" "}
          <label className="cur">
            {L.currency}{" "}
            <select value={cur} onChange={(e) => isCurrency(e.target.value) && pickCur(e.target.value)} aria-label={L.currency}>
              {CURRENCY_CODES.map((c) => <option key={c} value={c}>{c} {CURRENCIES[c].sym}</option>)}
            </select>
          </label>
          {rates[cur] ? <> · <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by Exchange Rate API</a></> : null}
        </small>
      </div>

      {viewer && (
        <div className="viewer" role="dialog" aria-modal="true" aria-label={viewer.title} onClick={() => setViewer(null)}>
          <div className="viewer-bar" onClick={(e) => e.stopPropagation()}>
            <span>{viewer.title}{viewer.items.length > 1 && ` · ${viewer.at + 1}/${viewer.items.length}`}</span>
            <button className="btn" onClick={() => setViewer(null)} autoFocus>{L.close}</button>
          </div>
          <div className="viewer-stage" onClick={(e) => e.stopPropagation()}>
            {viewer.items[viewer.at].type === "video" ? (
              <video key={viewer.items[viewer.at].url} src={viewer.items[viewer.at].url} controls autoPlay muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.items[viewer.at].url} alt={viewer.title} />
            )}
          </div>
          {viewer.items.length > 1 && (
            <div className="viewer-nav" onClick={(e) => e.stopPropagation()}>
              <button className="btn" aria-label="Previous" onClick={() => setViewer({ ...viewer, at: (viewer.at - 1 + viewer.items.length) % viewer.items.length })}>‹</button>
              <button className="btn" aria-label="Next" onClick={() => setViewer({ ...viewer, at: (viewer.at + 1) % viewer.items.length })}>›</button>
            </div>
          )}
        </div>
      )}

      {pick && dishes[pick.i] && (() => {
        const d = dishes[pick.i];
        const o = d.opts ?? {};
        const title = isTranslated(d) ? d.name![lang] || d.name!.en : d.vi;
        const set = (patch: Partial<Line>) => setPick({ ...pick, ...patch });
        const tops = pick.tops ?? [];
        return (
          <div className="sheet" role="dialog" aria-modal="true" aria-label={O.options} onClick={() => setPick(null)}>
            <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-h"><h3>{title}</h3><button className="icon" aria-label={L.close} onClick={() => setPick(null)}>✕</button></div>
              {!!o.sizes?.length && (
                <fieldset><legend>{O.size}</legend><div className="pills">
                  {o.sizes.map((z) => <button key={z.k} type="button" aria-pressed={pick.size === z.k} onClick={() => set({ size: z.k })}>{z.k} · {vnd(z.price)}</button>)}
                </div></fieldset>
              )}
              {o.sugar && (
                <fieldset><legend>{O.sugar}</legend><div className="pills">
                  {SUGAR.map((v) => <button key={v} type="button" aria-pressed={pick.sugar === v} onClick={() => set({ sugar: v })}>{O.sugarLv(v)}</button>)}
                </div></fieldset>
              )}
              {o.ice && (
                <fieldset><legend>{O.ice}</legend><div className="pills">
                  {ICE.map((v) => <button key={v} type="button" aria-pressed={pick.ice === v} onClick={() => set({ ice: v })}>{O.iceLv[v]}</button>)}
                </div></fieldset>
              )}
              {o.tops && toppings.length > 0 && (
                <fieldset><legend>{O.toppings}</legend><div className="pills">
                  {toppings.map((tp, k) => {
                    const on = tops.includes(k);
                    return (
                      <button key={k} type="button" aria-pressed={on} onClick={() => set({ tops: on ? tops.filter((x) => x !== k) : [...tops, k] })}>
                        {(tp.name?.[lang] || tp.name?.en || tp.vi)} +{vnd(tp.price)}
                      </button>
                    );
                  })}
                </div></fieldset>
              )}
              <button className="btn primary" onClick={() => { addLine(pick); setPick(null); }}>{O.add(vnd(unitPrice(d, pick, toppings)))}</button>
            </div>
          </div>
        );
      })()}

      {shown && (
        <div className="order" role="dialog" aria-modal="true" aria-label={shown.mode === "bill" ? L.billHead : L.head} lang="vi">
          <h3 lang={lang}>{shown.mode === "bill" ? L.billHead : L.head}</h3>
          {table && <div className="tno">Bàn {table} <span lang={lang}>· {L.table(table)}</span></div>}
          <div className="big">{shown.mode === "bill" ? "Tính tiền" : shown.mode === "more" ? "Cho tôi thêm:" : "Cho tôi:"}</div>
          <ul>
            {shown.lines.map((l, k) => (dishes[l.i] ? <li key={k}>{l.q} × {lineVi(dishes[l.i], l, toppings)}</li> : null))}
          </ul>
          {shown.mode !== "bill" && notes.length > 0 && <div className="vnote">Ghi chú: {notes.map((k) => NOTES[k].vi).join(" · ")}</div>}
          {shown.mode !== "bill" && allergyVi.length > 0 && (
            <div className="allergy" role="note">
              {allergyVi.map((x) => <b key={x}>⚠️ {x}</b>)}
              <small lang={lang}>{L.allergyShown}</small>
            </div>
          )}
          {shown.mode !== "bill" && (
            <div className="notes" lang={lang}>
              <button type="button" className="btn addnote" aria-expanded={notesOpen} onClick={() => setNotesOpen(!notesOpen)}>
                {notesOpen ? "−" : "+"} {L.notes}
              </button>
              {notesOpen && (
                <div className="chips">
                  {NOTE_KEYS.map((k) => (
                    <button key={k} type="button" className="chip" aria-pressed={notes.includes(k)} onClick={() => toggleNote(k)}>
                      {NOTES[k].icon} {NOTES[k][lang]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {shown.mode === "more" && shown.before.length > 0 && (
            <div className="before">
              <span>Đã gọi trước <i lang={lang}>· {L.before}</i></span>
              <ul>{shown.before.map((l, k) => (dishes[l.i] ? <li key={k}>{l.q} × {lineVi(dishes[l.i], l, toppings)}</li> : null))}</ul>
            </div>
          )}
          <div className="tot">{shown.mode === "more" ? "Tổng cộng" : "Tổng"}: {vnd(total)} <small lang={lang}>{inCurrency(total, cur, rates[cur])}</small></div>
          <button className={"btn readout" + (saying === "order" ? " on" : "")} onClick={() => say(orderParts(shown), "order")} lang={lang}>🔊 {L.readOrder}</button>
          <div className="ono">Mã đơn #{orderNo} <span lang={lang}>· {L.order} #{orderNo}</span></div>
          {pay && total > 0 && (
            showPay ? (
              <div className="paybox" lang={lang}>
                <QrImage text={vietQr({ bank: pay.bank, acct: pay.acct, amount: total, note: `QUAN ${table ? `B${table} ` : ""}${orderNo}` })} size={220} label={`VietQR ${vnd(total)}`} />
                <div className="paywho">
                  <b>{vnd(total)}</b>
                  <span>{bankName(pay.bank)} · {pay.acct}</span>
                  {pay.name && <span>{pay.name}</span>}
                </div>
                <small>{L.payHint}</small>
                <button className="btn" onClick={async () => {
                  try { await navigator.clipboard.writeText(pay.acct); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
                }}>{copied ? L.copied : L.copyAcct}</button>
              </div>
            ) : (
              <button className="btn paybtn" onClick={() => setShowPay(true)} lang={lang}>💳 {L.pay}</button>
            )
          )}
          {!pay && hints && <p className="vhint" lang={hints.lang}>💳 {hints.pay}</p>}
          {maps && <a className="btn" href={maps} target="_blank" rel="noreferrer noopener" lang={lang}>⭐ {L.review}</a>}
          <button ref={closeRef} className="btn" onClick={() => setShown(null)} lang={lang}>
            {L.close}
          </button>
          <button className="btn newo" onClick={newOrder} lang={lang}>🗑 {L.newOrder}</button>
        </div>
      )}
    </div>
  );
}

/** Calls a counter function in the database. Best effort: a failure never affects the menu. */
function rpc(fn: "count_view" | "count_order", body: Record<string, unknown>) {
  if (!SUPABASE_URL) return;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}
