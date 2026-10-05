import type { Dish, DrinkOpts, Lang, ML, ShopKind, SizeKey, Topping } from "./types";

/** Sugar levels Vietnamese drink shops use, as % of normal sweetness. */
export const SUGAR = [0, 30, 50, 70, 100] as const;
export type Sugar = (typeof SUGAR)[number];

export const ICE = ["none", "less", "normal", "hot"] as const;
export type Ice = (typeof ICE)[number];

/** One line of a customer's order. Plain dishes only use `i` and `q`. */
export interface Line {
  i: number;
  q: number;
  size?: SizeKey;
  sugar?: Sugar;
  ice?: Ice;
  tops?: number[];
}

/** What the barista reads on the order screen. */
export const VI = {
  sugar: (s: Sugar) => (s === 100 ? "đường bình thường" : s === 0 ? "không đường" : `${s}% đường`),
  ice: { none: "không đá", less: "ít đá", normal: "đá bình thường", hot: "nóng" } as Record<Ice, string>,
};

/** Labels customers see, in their language. */
export const OPT_UI: Record<Lang, {
  options: string; size: string; sugar: string; ice: string; toppings: string; add: (p: string) => string;
  sugarLv: (s: Sugar) => string; iceLv: Record<Ice, string>; choose: string; from: string;
}> = {
  en: {
    options: "Choose options", size: "Size", sugar: "Sugar", ice: "Ice", toppings: "Toppings", add: (p) => `Add to order · ${p}`,
    sugarLv: (s) => (s === 0 ? "No sugar" : s === 100 ? "Normal" : `${s}%`),
    iceLv: { none: "No ice", less: "Less ice", normal: "Normal ice", hot: "Hot" }, choose: "Options", from: "from",
  },
  ko: {
    options: "옵션 선택", size: "사이즈", sugar: "당도", ice: "얼음", toppings: "토핑", add: (p) => `주문에 추가 · ${p}`,
    sugarLv: (s) => (s === 0 ? "무설탕" : s === 100 ? "보통" : `${s}%`),
    iceLv: { none: "얼음 없이", less: "얼음 적게", normal: "얼음 보통", hot: "따뜻하게" }, choose: "옵션", from: "부터",
  },
  zh: {
    options: "选择规格", size: "杯型", sugar: "甜度", ice: "冰量", toppings: "加料", add: (p) => `加入订单 · ${p}`,
    sugarLv: (s) => (s === 0 ? "无糖" : s === 100 ? "正常糖" : `${s}%`),
    iceLv: { none: "去冰", less: "少冰", normal: "正常冰", hot: "热" }, choose: "选规格", from: "起",
  },
  ja: {
    options: "オプションを選ぶ", size: "サイズ", sugar: "甘さ", ice: "氷", toppings: "トッピング", add: (p) => `注文に追加 · ${p}`,
    sugarLv: (s) => (s === 0 ? "砂糖なし" : s === 100 ? "普通" : `${s}%`),
    iceLv: { none: "氷なし", less: "氷少なめ", normal: "氷普通", hot: "ホット" }, choose: "オプション", from: "から",
  },
};

/** Common toppings, so a shop's list translates itself. Matched on the Vietnamese name, ignoring tone marks. */
const TOPPING_ROWS: [string, ML][] = [
  ["Trân châu đen", { en: "Black tapioca pearls", ko: "흑당 펄", zh: "黑珍珠", ja: "黒タピオカ" }],
  ["Trân châu trắng", { en: "White tapioca pearls", ko: "화이트 펄", zh: "白珍珠", ja: "白タピオカ" }],
  ["Trân châu hoàng kim", { en: "Golden tapioca pearls", ko: "골드 펄", zh: "黄金珍珠", ja: "ゴールデンタピオカ" }],
  ["Trân châu đường đen", { en: "Brown sugar pearls", ko: "흑설탕 펄", zh: "黑糖珍珠", ja: "黒糖タピオカ" }],
  ["Trân châu", { en: "Tapioca pearls", ko: "타피오카 펄", zh: "珍珠", ja: "タピオカ" }],
  ["Thạch trái cây", { en: "Fruit jelly", ko: "과일 젤리", zh: "水果果冻", ja: "フルーツゼリー" }],
  ["Thạch dừa", { en: "Coconut jelly", ko: "코코넛 젤리", zh: "椰果", ja: "ナタデココ" }],
  ["Thạch cà phê", { en: "Coffee jelly", ko: "커피 젤리", zh: "咖啡冻", ja: "コーヒーゼリー" }],
  ["Thạch", { en: "Jelly", ko: "젤리", zh: "果冻", ja: "ゼリー" }],
  ["Pudding", { en: "Egg pudding", ko: "푸딩", zh: "布丁", ja: "プリン" }],
  ["Flan", { en: "Caramel flan", ko: "플랜 푸딩", zh: "焦糖布丁", ja: "カスタードプリン" }],
  ["Kem cheese", { en: "Cheese foam", ko: "치즈폼", zh: "芝士奶盖", ja: "チーズフォーム" }],
  ["Kem muối", { en: "Salted cream", ko: "소금 크림", zh: "海盐奶盖", ja: "塩クリーム" }],
  ["Kem trứng", { en: "Egg cream", ko: "에그 크림", zh: "蛋奶霜", ja: "エッグクリーム" }],
  ["Nha đam", { en: "Aloe vera", ko: "알로에", zh: "芦荟", ja: "アロエ" }],
  ["Đậu đỏ", { en: "Red beans", ko: "팥", zh: "红豆", ja: "小豆" }],
  ["Khúc bạch", { en: "Panna cotta cubes", ko: "판나코타", zh: "奶冻", ja: "パンナコッタ" }],
  ["Sương sáo", { en: "Grass jelly", ko: "선초 젤리", zh: "仙草", ja: "仙草ゼリー" }],
  ["Hạt é", { en: "Basil seeds", ko: "바질 씨앗", zh: "罗勒籽", ja: "バジルシード" }],
  ["Thêm shot cà phê", { en: "Extra coffee shot", ko: "샷 추가", zh: "加一份浓缩", ja: "ショット追加" }],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();
const TOPPING_INDEX = new Map(TOPPING_ROWS.map(([vi, name]) => [norm(vi), name]));

export function toppingName(vi: string): ML | null {
  return TOPPING_INDEX.get(norm(vi)) ?? null;
}

/** Starting topping list for a milk-tea shop; the vendor edits prices. */
export const DEFAULT_TOPPINGS: Topping[] = [
  { vi: "Trân châu đen", price: 5000 },
  { vi: "Thạch trái cây", price: 5000 },
  { vi: "Pudding", price: 7000 },
  { vi: "Kem cheese", price: 10000 },
].map((t) => ({ ...t, name: toppingName(t.vi) }));

/** Options a newly added drink gets, by shop type. Food stalls start with none. */
export function defaultOpts(kind: ShopKind, price: number): DrinkOpts | null {
  if (kind === "cafe") return { sugar: true, ice: true };
  if (kind === "tea") {
    const m = price || 30000;
    return { sizes: [{ k: "M", price: m }, { k: "L", price: m + 10000 }], sugar: true, ice: true, tops: true };
  }
  return null;
}

export const hasOpts = (d: Dish) => !!(d.opts && (d.opts.sizes?.length || d.opts.sugar || d.opts.ice || d.opts.tops));

/** Price of one drink with its chosen size and toppings. */
export function unitPrice(d: Dish, line: Line, toppings: Topping[]): number {
  const base = (line.size && d.opts?.sizes?.find((s) => s.k === line.size)?.price) || d.price;
  return base + (line.tops ?? []).reduce((t, k) => t + (toppings[k]?.price ?? 0), 0);
}

/** "Trà sữa (L) · 50% đường · ít đá · + Trân châu đen" */
export function lineVi(d: Dish, line: Line, toppings: Topping[]): string {
  const name = d.vi.replace(/\s*\(.*?\)\s*/g, " ").trim() + (line.size ? ` (${line.size})` : "");
  const bits = [
    line.sugar !== undefined && line.sugar !== 100 ? VI.sugar(line.sugar) : "",
    line.ice && line.ice !== "normal" ? VI.ice[line.ice] : "",
    ...(line.tops ?? []).map((k) => (toppings[k] ? `+ ${toppings[k].vi}` : "")),
  ].filter(Boolean);
  return [name, ...bits].join(" · ");
}

/** Lines are the same order when every choice matches, so adding one again just bumps the count. */
export const sameLine = (a: Line, b: Line) =>
  a.i === b.i && a.size === b.size && a.sugar === b.sugar && a.ice === b.ice &&
  (a.tops ?? []).slice().sort().join() === (b.tops ?? []).slice().sort().join();
