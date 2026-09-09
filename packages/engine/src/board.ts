import type { Tile, GameEventCard } from "./types";

export const GROUPS: Record<string, { color: string; houseCost: number }> = {
  "الصعيد":            { color: "#8b5e34", houseCost: 100 },
  "توك توك":            { color: "#e67e22", houseCost: 100 },
  "الساحل الشمالي":      { color: "#2f7fb0", houseCost: 120 },
  "الدلتا":             { color: "#2fa562", houseCost: 140 },
  "القناة":             { color: "#c0392b", houseCost: 150 },
  "البحر الأحمر":        { color: "#16a085", houseCost: 160 },
  "القاهرة الكبرى":      { color: "#8e44ad", houseCost: 180 },
  "الجونة والساحل":      { color: "#d4a017", houseCost: 200 },
  "العاصمة الإدارية":    { color: "#e74c3c", houseCost: 220 },
};

export const TILES: Tile[] = [
  { index: 0,  name: "الانطلاق",        type: "start" },
  { index: 1,  name: "الأقصر",           type: "prop", group: "الصعيد", price: 180 },
  { index: 2,  name: "توك توك",          type: "prop", group: "توك توك", price: 120 },
  { index: 3,  name: "أسوان",            type: "prop", group: "الصعيد", price: 140 },
  { index: 4,  name: "قنا",              type: "prop", group: "الصعيد", price: 160 },
  { index: 5,  name: "محطة القاهرة",     type: "rail", price: 200 },
  { index: 6,  name: "حظ",               type: "event", pool: "luck" },
  { index: 7,  name: "الإسكندرية",       type: "prop", group: "الساحل الشمالي", price: 220 },
  { index: 8,  name: "فرصة",             type: "event", pool: "chest" },
  { index: 9,  name: "مطروح",            type: "prop", group: "الساحل الشمالي", price: 240 },
  { index: 10, name: "زيارة السجن",      type: "corner" },
  { index: 11, name: "المنصورة",         type: "prop", group: "الدلتا", price: 200 },
  { index: 12, name: "شركة الكهرباء",    type: "util", price: 150 },
  { index: 13, name: "طنطا",             type: "prop", group: "الدلتا", price: 180 },
  { index: 14, name: "الزقازيق",         type: "prop", group: "الدلتا", price: 220 },
  { index: 15, name: "محطة الإسكندرية",  type: "rail", price: 200 },
  { index: 16, name: "بورسعيد",          type: "prop", group: "القناة", price: 260 },
  { index: 17, name: "الإسماعيلية",      type: "prop", group: "القناة", price: 280 },
  { index: 18, name: "فرصة",             type: "event", pool: "chest" },
  { index: 19, name: "السويس",           type: "prop", group: "القناة", price: 300 },
  { index: 20, name: "استراحة",          type: "corner" },
  { index: 21, name: "الغردقة",          type: "prop", group: "البحر الأحمر", price: 260 },
  { index: 22, name: "شرم الشيخ",        type: "prop", group: "البحر الأحمر", price: 240 },
  { index: 23, name: "حظ",               type: "event", pool: "luck" },
  { index: 24, name: "مرسى علم",         type: "prop", group: "البحر الأحمر", price: 220 },
  { index: 25, name: "محطة أسوان",       type: "rail", price: 200 },
  { index: 26, name: "الجيزة",           type: "prop", group: "القاهرة الكبرى", price: 300 },
  { index: 27, name: "شركة المياه",      type: "util", price: 150 },
  { index: 28, name: "مدينة نصر",        type: "prop", group: "القاهرة الكبرى", price: 280 },
  { index: 29, name: "المعادي",          type: "prop", group: "القاهرة الكبرى", price: 320 },
  { index: 30, name: "اذهب للسجن",       type: "corner" },
  { index: 31, name: "العين السخنة",     type: "prop", group: "الجونة والساحل", price: 340 },
  { index: 32, name: "فرصة",             type: "event", pool: "chest" },
  { index: 33, name: "الجونة",           type: "prop", group: "الجونة والساحل", price: 400 },
  { index: 34, name: "رأس الحكمة",       type: "prop", group: "الجونة والساحل", price: 300 },
  { index: 35, name: "محطة الغردقة",     type: "rail", price: 200 },
  { index: 36, name: "الشيخ زايد",       type: "prop", group: "العاصمة الإدارية", price: 350 },
  { index: 37, name: "التجمع الخامس",    type: "prop", group: "العاصمة الإدارية", price: 360 },
  { index: 38, name: "حظ",               type: "event", pool: "luck" },
  { index: 39, name: "العاصمة الإدارية", type: "prop", group: "العاصمة الإدارية", price: 400 },
];

export const EVENT_POOLS: Record<"luck" | "chest", GameEventCard[]> = {
  luck: [
    { id: "l1", icon: "🚨", title: "غرامة مرور!",    effect: "ادفع 100 جنيه غرامة",              type: "coins", coins: -100 },
    { id: "l2", icon: "📸", title: "كاميرا سرعة!",   effect: "ادفع 80 جنيه غرامة",               type: "coins", coins: -80 },
    { id: "l3", icon: "🏦", title: "أزمة مالية!",    effect: "ادفع 300 جنيه للبنك",              type: "coins", coins: -300 },
    { id: "l4", icon: "🚔", title: "مسكتك الشرطة!",  effect: "هتقعد دورة كاملة من غير ما تلعب",  type: "jail" },
    { id: "l5", icon: "🎉", title: "ربحت اليانصيب!", effect: "كسبت 150 جنيه",                    type: "coins", coins: 150 },
    { id: "l6", icon: "💎", title: "لقيت كنز!",      effect: "كسبت 200 جنيه",                    type: "coins", coins: 200 },
    { id: "l7", icon: "🚫", title: "احظر لاعب!",     effect: "اختار لاعب يقعد دورة من غير ما يلعب", type: "block" },
  ],
  chest: [
    { id: "c1", icon: "🎁", title: "عيدية من العيلة!",   effect: "كسبت 100 جنيه",         type: "coins", coins: 100 },
    { id: "c2", icon: "💡", title: "فاتورة كهرباء متأخرة", effect: "ادفع 60 جنيه غرامة",  type: "coins", coins: -60 },
    { id: "c3", icon: "💰", title: "لقيت فلوس في الشارع!", effect: "كسبت 120 جنيه",        type: "coins", coins: 120 },
    { id: "c4", icon: "📉", title: "غرامة ضريبية!",       effect: "ادفع 250 جنيه للبنك",  type: "coins", coins: -250 },
    { id: "c5", icon: "🚫", title: "احظر لاعب!",          effect: "اختار لاعب يقعد دورة من غير ما يلعب", type: "block" },
  ],
};

export function tileByName(name: string): Tile {
  const tile = TILES.find((t) => t.name === name);
  if (!tile) throw new Error(`Unknown tile: ${name}`);
  return tile;
}
