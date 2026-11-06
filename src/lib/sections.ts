import type { Dish, Lang, ML } from "./types";

/**
 * Menu sections ("Đồ uống", "Món chính"…). A dish keeps its section as plain Vietnamese text; the
 * common ones below translate themselves for customers, and any other name is shown as typed.
 */
const ROWS: [string, ML][] = [
  ["Món ăn", { en: "Food", ko: "음식", zh: "菜品", ja: "料理" }],
  ["Món chính", { en: "Mains", ko: "메인 요리", zh: "主菜", ja: "メイン料理" }],
  ["Khai vị", { en: "Starters", ko: "전채 요리", zh: "开胃菜", ja: "前菜" }],
  ["Ăn vặt", { en: "Snacks", ko: "간식", zh: "小吃", ja: "軽食" }],
  ["Món thêm", { en: "Extras", ko: "추가 메뉴", zh: "加点", ja: "追加メニュー" }],
  ["Ăn sáng", { en: "Breakfast", ko: "아침 식사", zh: "早餐", ja: "朝食" }],
  ["Phở", { en: "Phở (noodle soup)", ko: "쌀국수 (퍼)", zh: "河粉", ja: "フォー" }],
  ["Bún", { en: "Rice vermicelli", ko: "분 (쌀국수)", zh: "米线", ja: "ブン（米麺）" }],
  ["Mì & hủ tiếu", { en: "Noodles", ko: "면 요리", zh: "面类", ja: "麺類" }],
  ["Cơm", { en: "Rice dishes", ko: "밥 요리", zh: "米饭类", ja: "ご飯もの" }],
  ["Bánh mì", { en: "Bánh mì", ko: "반미", zh: "越南面包", ja: "バインミー" }],
  ["Cháo", { en: "Rice porridge", ko: "죽", zh: "粥", ja: "お粥" }],
  ["Lẩu", { en: "Hotpot", ko: "전골 (러우)", zh: "火锅", ja: "鍋料理" }],
  ["Nướng", { en: "Grilled", ko: "구이", zh: "烧烤", ja: "焼き物" }],
  ["Hải sản", { en: "Seafood", ko: "해산물", zh: "海鲜", ja: "シーフード" }],
  ["Gỏi & salad", { en: "Salads", ko: "샐러드", zh: "沙拉", ja: "サラダ" }],
  ["Món chay", { en: "Vegetarian", ko: "채식", zh: "素食", ja: "ベジタリアン" }],
  ["Combo", { en: "Combos", ko: "세트 메뉴", zh: "套餐", ja: "セット" }],
  ["Tráng miệng", { en: "Desserts", ko: "디저트", zh: "甜品", ja: "デザート" }],
  ["Chè", { en: "Chè (sweet soups)", ko: "쩨 (베트남 디저트)", zh: "越南甜汤", ja: "チェー" }],
  ["Bánh ngọt", { en: "Cakes & pastries", ko: "케이크·빵", zh: "糕点", ja: "ケーキ・焼き菓子" }],
  ["Đồ uống", { en: "Drinks", ko: "음료", zh: "饮品", ja: "ドリンク" }],
  ["Cà phê", { en: "Coffee", ko: "커피", zh: "咖啡", ja: "コーヒー" }],
  ["Trà", { en: "Tea", ko: "차", zh: "茶", ja: "お茶" }],
  ["Trà sữa", { en: "Milk tea", ko: "밀크티", zh: "奶茶", ja: "ミルクティー" }],
  ["Sinh tố & nước ép", { en: "Smoothies & juices", ko: "스무디·주스", zh: "奶昔和果汁", ja: "スムージー・ジュース" }],
  ["Bia & rượu", { en: "Beer & alcohol", ko: "맥주·주류", zh: "啤酒和酒", ja: "ビール・お酒" }],
];

/** Other ways vendors write the same sections. */
const ALIASES: [string, string][] = [
  ["Đồ ăn", "Món ăn"], ["Thức ăn", "Món ăn"], ["Food", "Món ăn"],
  ["Nước uống", "Đồ uống"], ["Thức uống", "Đồ uống"], ["Nước", "Đồ uống"], ["Beverages", "Đồ uống"],
  ["Cafe", "Cà phê"], ["Coffee", "Cà phê"], ["Mì", "Mì & hủ tiếu"], ["Hủ tiếu", "Mì & hủ tiếu"], ["Noodles", "Mì & hủ tiếu"],
  ["Gỏi", "Gỏi & salad"], ["Salad", "Gỏi & salad"], ["Sinh tố", "Sinh tố & nước ép"], ["Nước ép", "Sinh tố & nước ép"],
  ["Bia", "Bia & rượu"], ["Beer", "Bia & rượu"], ["Đồ nướng", "Nướng"], ["Món nướng", "Nướng"], ["Chay", "Món chay"],
  ["Bánh", "Bánh ngọt"], ["Dessert", "Tráng miệng"], ["Món ăn kèm", "Món thêm"], ["Gọi thêm", "Món thêm"],
];

/** Lower case, no tone marks, single spaces: "  Đồ  Uống " → "do uong". */
export const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();

const NAMES = new Map(ROWS);
const INDEX = new Map<string, string>();
for (const [vi, ml] of ROWS) { INDEX.set(fold(vi), vi); INDEX.set(fold(ml.en), vi); }
for (const [alias, vi] of ALIASES) if (!INDEX.has(fold(alias))) INDEX.set(fold(alias), vi);

/** Sections offered as suggestions in the editor. */
export const SECTION_SUGGESTIONS = ROWS.map(([vi]) => vi);

/** The usual spelling of a section the vendor typed ("do uong", "Drinks" → "Đồ uống"); other names stay as typed. */
export function tidySection(s: string): string {
  const t = s.replace(/\s+/g, " ").trim().slice(0, 40);
  return INDEX.get(fold(t)) ?? t;
}

/** What customers see for dishes without a section, when other dishes have one. */
const OTHER: ML = { en: "More", ko: "기타", zh: "其他", ja: "その他" };

/** A section's name in the customer's language. Names the app doesn't know stay in Vietnamese. */
export function sectionName(vi: string, lang: Lang): string {
  if (!vi) return OTHER[lang];
  const ml = NAMES.get(vi);
  return ml ? ml[lang] || ml.en : vi;
}

/** Whether customers see this section in their own language (not just the Vietnamese name). */
export const sectionKnown = (vi: string) => !vi || NAMES.has(vi);

export interface Section {
  /** The section's Vietnamese name; "" holds the dishes without one. */
  cat: string;
  /** Positions of its dishes in the menu. */
  idx: number[];
}

/**
 * The menu's dishes by section, sections in the order they first appear and dishes without a
 * section last. Null when no dish has a section: the menu is then one plain list.
 */
export function sectionsOf(dishes: Pick<Dish, "cat">[]): Section[] | null {
  if (!dishes.some((d) => d.cat)) return null;
  const out: Section[] = [];
  const rest: number[] = [];
  const at = new Map<string, Section>();
  dishes.forEach((d, i) => {
    if (!d.cat) return void rest.push(i);
    let s = at.get(d.cat);
    if (!s) { s = { cat: d.cat, idx: [] }; at.set(d.cat, s); out.push(s); }
    s.idx.push(i);
  });
  if (rest.length) out.push({ cat: "", idx: rest });
  return out;
}

/** Reorders dishes so each section's dishes sit together, keeping their order (as customers see them). */
export function arrange<T extends Pick<Dish, "cat">>(dishes: T[]): T[] {
  const s = sectionsOf(dishes);
  return s ? s.flatMap((x) => x.idx.map((i) => dishes[i])) : dishes;
}

const DRINK_SECTIONS = new Set(["Đồ uống", "Cà phê", "Trà", "Trà sữa", "Sinh tố & nước ép", "Bia & rượu"]);

/** A likely section from the dish's name alone ("Phở bò tái" → "Phở"). */
const GUESS: [RegExp, string][] = [
  [/^pho\b/, "Phở"],
  [/^bun\b/, "Bún"],
  [/^(mi|hu tieu|hu tiu|banh canh|mien|nui)\b/, "Mì & hủ tiếu"],
  [/^com\b/, "Cơm"],
  [/^banh mi\b/, "Bánh mì"],
  [/^chao\b/, "Cháo"],
  [/^lau\b/, "Lẩu"],
  [/^(goi|nom|salad)\b/, "Gỏi & salad"],
  [/^che\b/, "Chè"],
  [/^(ca phe|cafe|coffee|bac xiu|espresso|latte|cappuccino|americano|cold brew)\b/, "Cà phê"],
  [/^(tra sua|milk tea|hong tra sua|sua tuoi tran chau)\b/, "Trà sữa"],
  [/^(tra|tea)\b/, "Trà"],
  [/^(sinh to|nuoc ep|nuoc cam|nuoc dua|dua tuoi|nuoc mia|da me|chanh day|smoothie|juice)\b/, "Sinh tố & nước ép"],
  [/^(bia|ruou|beer|wine)\b/, "Bia & rượu"],
  [/^(nuoc|soda|coca|pepsi|7 ?up|sting|redbull|sua)\b/, "Đồ uống"],
];

/**
 * Sections for the dishes that have none. Big menus get specific sections ("Phở", "Cà phê") where
 * three or more dishes share one; everything else is "Món ăn" or "Đồ uống". `isDrink` says what the
 * built-in dish list knows. Returns the menu unchanged when it wouldn't have two sections.
 */
export function autoSections<T extends Pick<Dish, "vi" | "cat" | "opts">>(dishes: T[], isDrink: (vi: string) => boolean): T[] {
  const guess = dishes.map((d) => {
    if (d.cat) return { fine: d.cat, coarse: d.cat };
    const f = fold(d.vi);
    const fine = GUESS.find(([re]) => re.test(f))?.[1] ?? "";
    const drink = DRINK_SECTIONS.has(fine) || !!d.opts || isDrink(d.vi);
    return { fine, coarse: drink ? "Đồ uống" : "Món ăn" };
  });
  const count = new Map<string, number>();
  for (const g of guess) if (g.fine) count.set(g.fine, (count.get(g.fine) ?? 0) + 1);
  const big = dishes.length >= 10;
  const next = dishes.map((d, i) => {
    if (d.cat) return d;
    const g = guess[i];
    return { ...d, cat: big && g.fine && (count.get(g.fine) ?? 0) >= 3 ? g.fine : g.coarse };
  });
  return new Set(next.map((d) => d.cat)).size >= 2 ? arrange(next) : dishes;
}
