import type { Tile, GameEventCard } from "./types";

export const GROUPS: Record<string, { color: string; houseCost: number; flag: string }> = {
  Egypt:           { color: "#8b5e34", houseCost: 100, flag: "https://flagcdn.com/w40/eg.png" },
  Spain:           { color: "#2f7fb0", houseCost: 120, flag: "https://flagcdn.com/w40/es.png" },
  China:           { color: "#2fa562", houseCost: 140, flag: "https://flagcdn.com/w40/cn.png" },
  "Saudi Arabia":  { color: "#c0392b", houseCost: 150, flag: "https://flagcdn.com/w40/sa.png" },
  Qatar:           { color: "#16a085", houseCost: 160, flag: "https://flagcdn.com/w40/qa.png" },
  Germany:         { color: "#8e44ad", houseCost: 180, flag: "https://flagcdn.com/w40/de.png" },
  France:          { color: "#d4a017", houseCost: 200, flag: "https://flagcdn.com/w40/fr.png" },
  Italy:           { color: "#e74c3c", houseCost: 220, flag: "https://flagcdn.com/w40/it.png" },
};

export const TILES: Tile[] = [
  { index: 0, name: "tile_0", displayName: "البداية", type: "start" },
  { index: 1, name: "tile_1", displayName: "القاهرة", type: "prop", group: "Egypt", price: 180 },
  { index: 2, name: "tile_2", displayName: "توك توك", type: "toktok" },
  { index: 3, name: "tile_3", displayName: "الجيزة", type: "prop", group: "Egypt", price: 140 },
  { index: 4, name: "tile_4", displayName: "الإسكندرية", type: "prop", group: "Egypt", price: 160 },
  { index: 5, name: "tile_5", displayName: "مطار القاهرة", type: "rail", price: 200 },
  { index: 6, name: "tile_6", displayName: "ضرائب", type: "event", pool: "luck" },
  { index: 7, name: "tile_7", displayName: "برشلونة", type: "prop", group: "Spain", price: 220 },
  { index: 8, name: "tile_8", displayName: "مفاجأة", type: "event", pool: "chest" },
  { index: 9, name: "tile_9", displayName: "مدريد", type: "prop", group: "Spain", price: 240 },
  { index: 10, name: "tile_10", displayName: "السجن", type: "corner" },
  { index: 11, name: "tile_11", displayName: "شنغهاي", type: "prop", group: "China", price: 200 },
  { index: 12, name: "tile_12", displayName: "حجز بادل", type: "util", price: 150 },
  { index: 13, name: "tile_13", displayName: "بكين", type: "prop", group: "China", price: 180 },
  { index: 14, name: "tile_14", displayName: "شنجن", type: "prop", group: "China", price: 220 },
  { index: 15, name: "tile_15", displayName: "مطار الصين", type: "rail", price: 200 },
  { index: 16, name: "tile_16", displayName: "جدة", type: "prop", group: "Saudi Arabia", price: 260 },
  { index: 17, name: "tile_17", displayName: "الرياض", type: "prop", group: "Saudi Arabia", price: 280 },
  { index: 18, name: "tile_18", displayName: "كنز", type: "event", pool: "chest" },
  { index: 19, name: "tile_19", displayName: "الدمام", type: "prop", group: "Saudi Arabia", price: 300 },
  { index: 20, name: "tile_20", displayName: "استراحة", type: "corner" },
  { index: 21, name: "tile_21", displayName: "الدوحة", type: "prop", group: "Qatar", price: 260 },
  { index: 22, name: "tile_22", displayName: "لوسيل", type: "prop", group: "Qatar", price: 240 },
  { index: 23, name: "tile_23", displayName: "مفاجأة", type: "event", pool: "luck" },
  { index: 24, name: "tile_24", displayName: "الوكرة", type: "prop", group: "Qatar", price: 220 },
  { index: 25, name: "tile_25", displayName: "مطار قطر", type: "rail", price: 200 },
  { index: 26, name: "tile_26", displayName: "برلين", type: "prop", group: "Germany", price: 300 },
  { index: 27, name: "tile_27", displayName: "حجز خماسي", type: "util", price: 150 },
  { index: 28, name: "tile_28", displayName: "فرانكفورت", type: "prop", group: "Germany", price: 280 },
  { index: 29, name: "tile_29", displayName: "ميونخ", type: "prop", group: "Germany", price: 320 },
  { index: 30, name: "tile_30", displayName: "اتقبض عليك", type: "corner" },
  { index: 31, name: "tile_31", displayName: "ليون", type: "prop", group: "France", price: 340 },
  { index: 32, name: "tile_32", displayName: "كنز", type: "event", pool: "chest" },
  { index: 33, name: "tile_33", displayName: "باريس", type: "prop", group: "France", price: 400 },
  { index: 34, name: "tile_34", displayName: "تولوز", type: "prop", group: "France", price: 300 },
  { index: 35, name: "tile_35", displayName: "مطار فرنسا", type: "rail", price: 200 },
  { index: 36, name: "tile_36", displayName: "البندقية", type: "prop", group: "Italy", price: 350 },
  { index: 37, name: "tile_37", displayName: "ميلانو", type: "prop", group: "Italy", price: 360 },
  { index: 38, name: "tile_38", displayName: "ضرائب", type: "event", pool: "luck" },
  { index: 39, name: "tile_39", displayName: "روما", type: "prop", group: "Italy", price: 400 },
];

export const EVENT_POOLS: Record<"luck" | "chest", GameEventCard[]> = {
  luck: [
    { id: "l1", icon: "🚨", title: "غرامة مرور!",    effect: "ادفع 100 جنيه غرامة",              type: "coins", coins: -100 },
    { id: "l2", icon: "📸", title: "كاميرا سرعة!",   effect: "ادفع 80 جنيه غرامة",               type: "coins", coins: -80 },
    { id: "l3", icon: "🏦", title: "أزمة مالية!",    effect: "ادفع 300 جنيه للبنك",              type: "coins", coins: -300 },
    { id: "l4", icon: "🚔", title: "مسكتك الشرطة!",  effect: "ادخل السجن: اطلع بدبل، ادفع 50 جنيه، أو اخرج في المحاولة التالتة",  type: "jail" },
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
