import type { Allergen, Lang } from "./types";

export const ALLERGENS: Record<Allergen, Record<Lang, string>> = {
  peanut: { en: "Peanuts", ko: "땅콩", zh: "花生", ja: "ピーナッツ" },
  shellfish: { en: "Shellfish", ko: "갑각류", zh: "甲壳类", ja: "甲殻類" },
  fish: { en: "Fish sauce", ko: "생선", zh: "鱼露", ja: "魚" },
  egg: { en: "Egg", ko: "계란", zh: "蛋", ja: "卵" },
  dairy: { en: "Dairy", ko: "유제품", zh: "乳制品", ja: "乳" },
  gluten: { en: "Gluten", ko: "글루텐", zh: "麸质", ja: "小麦" },
  soy: { en: "Soy", ko: "대두", zh: "大豆", ja: "大豆" },
  pork: { en: "Pork", ko: "돼지고기", zh: "猪肉", ja: "豚肉" },
  beef: { en: "Beef", ko: "소고기", zh: "牛肉", ja: "牛肉" },
};

export interface LangInfo {
  label: string;
  say: string;
  show: (n: number) => string;
  show0: string;
  head: string;
  close: string;
  note: string;
  empty: string;
  soldOut: string;
  mustTry: string;
  pay: string;
  payHint: string;
  copyAcct: string;
  copied: string;
  order: string;
  review: string;
  reviewAsk: string;
  table: (n: string) => string;
  readOrder: string;
  search: string;
  noMatch: string;
  /** Closed today, and when it opens again (a short date in this language). */
  closed: string;
  reopens: (day: string) => string;
  closedHint: string;
  /** Ordering more after showing an order, and paying at the end. */
  showMore: (n: number) => string;
  bill: string;
  billHead: string;
  before: string;
  newOrder: string;
  newOrderAsk: string;
  /** Allergy filter. */
  avoid: string;
  avoidHint: string;
  hidden: (n: number) => string;
  avoidNote: string;
  currency: string;
  sections: string;
}

export const RATES_UPDATED = "2026-10";

export const LANGS: Record<Lang, LangInfo> = {
  en: { label: "English", say: "Say it", show: (n) => `Show order to vendor (${n})`, show0: "Show order to vendor", head: "Show this screen", close: "Back to menu", note: "Prices set by the stall. Other currencies are approximate.", empty: "This menu has no dishes yet.",
    soldOut: "Sold out today", mustTry: "Must-try", pay: "Pay by bank transfer", payHint: "Scan with your banking app (VietQR). The amount is already filled in. Cash is fine too.", copyAcct: "Copy account number", copied: "Copied", order: "Order", review: "Review us on Google Maps", reviewAsk: "Enjoyed it?",
    table: (n) => `Table ${n}`, readOrder: "Read the order aloud", search: "Search the menu", noMatch: "No dishes match.",
    closed: "Closed today", reopens: (d) => `Open again ${d}`, closedHint: "You can still look at the menu.",
    showMore: (n) => `Show added dishes (${n})`, bill: "See the bill", billHead: "Your bill · show this screen", before: "Ordered before", newOrder: "Start a new order", newOrderAsk: "Clear this order and start a new one?",
    avoid: "Allergies", avoidHint: "Hide dishes that contain:", hidden: (n) => `${n} ${n === 1 ? "dish" : "dishes"} hidden`, avoidNote: "Based on what the stall entered. Ask the staff to be sure.",
    currency: "Prices in", sections: "Menu sections" },
  ko: { label: "한국어", say: "발음", show: (n) => `주문 보여주기 (${n})`, show0: "주문 보여주기", head: "이 화면을 보여주세요", close: "메뉴로 돌아가기", note: "가격은 가게에서 정합니다. 외화 금액은 대략적인 값입니다.", empty: "아직 메뉴가 없습니다.",
    soldOut: "오늘 품절", mustTry: "추천 메뉴", pay: "계좌이체로 결제", payHint: "은행 앱으로 스캔하세요 (VietQR). 금액이 자동으로 입력됩니다. 현금도 됩니다.", copyAcct: "계좌번호 복사", copied: "복사됨", order: "주문", review: "구글 지도에 리뷰 남기기", reviewAsk: "맛있게 드셨나요?",
    table: (n) => `${n}번 테이블`, readOrder: "주문 소리로 읽기", search: "메뉴 검색", noMatch: "일치하는 메뉴가 없습니다.",
    closed: "오늘 휴무", reopens: (d) => `${d} 영업 재개`, closedHint: "메뉴는 계속 볼 수 있습니다.",
    showMore: (n) => `추가 주문 보여주기 (${n})`, bill: "계산서 보기", billHead: "계산서 · 이 화면을 보여주세요", before: "이전 주문", newOrder: "새 주문 시작", newOrderAsk: "이 주문을 지우고 새로 시작할까요?",
    avoid: "알레르기", avoidHint: "다음이 들어간 메뉴 숨기기:", hidden: (n) => `메뉴 ${n}개 숨김`, avoidNote: "가게에서 입력한 정보입니다. 꼭 직원에게 확인하세요.",
    currency: "통화", sections: "메뉴 분류" },
  zh: { label: "中文", say: "发音", show: (n) => `给老板看订单 (${n})`, show0: "给老板看订单", head: "请出示此页面", close: "返回菜单", note: "价格由店家设定，外币金额为约数。", empty: "菜单暂无菜品。",
    soldOut: "今日售罄", mustTry: "招牌必点", pay: "银行转账付款", payHint: "用银行App扫码（VietQR），金额已自动填好。也可以付现金。", copyAcct: "复制账号", copied: "已复制", order: "订单", review: "在谷歌地图上评价我们", reviewAsk: "吃得满意吗？",
    table: (n) => `${n}号桌`, readOrder: "朗读订单", search: "搜索菜品", noMatch: "没有匹配的菜品。",
    closed: "今日休息", reopens: (d) => `${d}恢复营业`, closedHint: "仍可浏览菜单。",
    showMore: (n) => `给老板看加点的菜 (${n})`, bill: "查看账单", billHead: "账单 · 请出示此页面", before: "之前点的", newOrder: "开始新订单", newOrderAsk: "清空此订单并重新开始？",
    avoid: "过敏", avoidHint: "隐藏含有以下成分的菜品：", hidden: (n) => `已隐藏 ${n} 道菜`, avoidNote: "信息由店家填写，请向店员确认。",
    currency: "币种", sections: "菜单分类" },
  ja: { label: "日本語", say: "発音", show: (n) => `店員に注文を見せる (${n})`, show0: "店員に注文を見せる", head: "この画面を見せてください", close: "メニューに戻る", note: "価格は店が設定。外貨は概算です。", empty: "メニューはまだありません。",
    soldOut: "本日売り切れ", mustTry: "おすすめ", pay: "銀行振込で支払う", payHint: "銀行アプリでスキャンしてください（VietQR）。金額は入力済みです。現金でも大丈夫です。", copyAcct: "口座番号をコピー", copied: "コピーしました", order: "注文", review: "Googleマップで口コミを書く", reviewAsk: "お気に召しましたか？",
    table: (n) => `テーブル${n}`, readOrder: "注文を読み上げる", search: "メニューを検索", noMatch: "該当するメニューがありません。",
    closed: "本日休業", reopens: (d) => `${d}から営業`, closedHint: "メニューは引き続きご覧いただけます。",
    showMore: (n) => `追加注文を見せる (${n})`, bill: "お会計を見る", billHead: "お会計 · この画面を見せてください", before: "注文済み", newOrder: "新しい注文を始める", newOrderAsk: "この注文を消して新しく始めますか？",
    avoid: "アレルギー", avoidHint: "次を含む料理を隠す：", hidden: (n) => `${n}品を非表示`, avoidNote: "店が入力した情報です。必ず店員に確認してください。",
    currency: "通貨", sections: "メニューの分類" },
};

/** A YYYY-MM-DD day as a short date in the customer's language ("Thu, 7 Nov"). */
export function shortDay(day: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(day + "T00:00:00Z"));
  } catch {
    return day;
  }
}

export const vnd = (n: number) => (Number(n) || 0).toLocaleString("vi-VN") + " ₫";

/**
 * Currencies customers can see prices in. `rate` is VND per unit, a fallback for when live rates
 * (rates.ts) can't be fetched; update RATES_UPDATED when changing them.
 */
export const CURRENCIES = {
  USD: { sym: "$", dec: 2, rate: 26300 },
  EUR: { sym: "€", dec: 2, rate: 30500 },
  GBP: { sym: "£", dec: 2, rate: 35000 },
  AUD: { sym: "A$", dec: 2, rate: 17200 },
  CAD: { sym: "C$", dec: 2, rate: 19000 },
  NZD: { sym: "NZ$", dec: 2, rate: 15500 },
  SGD: { sym: "S$", dec: 2, rate: 20300 },
  KRW: { sym: "₩", dec: 0, rate: 19 },
  CNY: { sym: "¥", dec: 1, rate: 3650 },
  JPY: { sym: "¥", dec: 0, rate: 175 },
  TWD: { sym: "NT$", dec: 0, rate: 820 },
  HKD: { sym: "HK$", dec: 1, rate: 3380 },
  THB: { sym: "฿", dec: 0, rate: 780 },
  MYR: { sym: "RM", dec: 2, rate: 6000 },
  INR: { sym: "₹", dec: 0, rate: 310 },
  RUB: { sym: "₽", dec: 0, rate: 300 },
} as const;
export type Currency = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as Currency[];
export const isCurrency = (v: unknown): v is Currency => typeof v === "string" && Object.hasOwn(CURRENCIES, v);

/** Each menu language's usual currency. */
export const LANG_CURRENCY: Record<Lang, Currency> = { en: "USD", ko: "KRW", zh: "CNY", ja: "JPY" };

/** Approximate price in another currency. `rate` (VND per unit) overrides the fixed rate when a live one is known. */
export function inCurrency(n: number, cur: Currency, rate?: number) {
  const C = CURRENCIES[cur];
  const v = (Number(n) || 0) / (rate && rate > 0 ? rate : C.rate);
  return "≈ " + C.sym + v.toLocaleString("en-US", { minimumFractionDigits: C.dec, maximumFractionDigits: C.dec });
}

/** Approximate price in the usual currency for a menu language. */
export const foreign = (n: number, lang: Lang, rate?: number) => inCurrency(n, LANG_CURRENCY[lang], rate);

/** The currency a visitor most likely uses, from their phone's language and region ("en-AU" → AUD). */
export function guessCurrency(): Currency {
  if (typeof navigator === "undefined") return "USD";
  const [lang = "en", region = ""] = (navigator.language || "en-US").toLowerCase().split("-");
  const byRegion: Record<string, Currency> = {
    gb: "GBP", au: "AUD", ca: "CAD", nz: "NZD", sg: "SGD", kr: "KRW", cn: "CNY", jp: "JPY",
    tw: "TWD", hk: "HKD", th: "THB", my: "MYR", in: "INR", ru: "RUB", ie: "EUR",
  };
  if (byRegion[region]) return byRegion[region];
  if (/^(de|fr|es|it|nl|pt|fi|el|sk|sl|et|lv|lt|ga|mt|hr)$/.test(lang) && region !== "br") return "EUR";
  const byLang: Record<string, Currency> = { ko: "KRW", ja: "JPY", zh: "CNY", th: "THB", ms: "MYR", ru: "RUB", hi: "INR" };
  return byLang[lang] ?? "USD";
}

export function guessLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const l = (navigator.language || "en").toLowerCase();
  if (l.startsWith("ko")) return "ko";
  if (l.startsWith("zh")) return "zh";
  if (l.startsWith("ja")) return "ja";
  return "en";
}
