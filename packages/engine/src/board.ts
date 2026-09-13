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
  { index: 0, name: "tile_0", displayName: "Start", type: "start" },
  { index: 1, name: "tile_1", displayName: "Cairo", type: "prop", group: "Egypt", price: 180 },
  { index: 2, name: "tile_2", displayName: "toktok", type: "toktok" },
  { index: 3, name: "tile_3", displayName: "beni suef", type: "prop", group: "Egypt", price: 140 },
  { index: 4, name: "tile_4", displayName: "alex", type: "prop", group: "Egypt", price: 160 },
  { index: 5, name: "tile_5", displayName: "matar elkahera", type: "rail", price: 200 },
  { index: 6, name: "tile_6", displayName: "drayb", type: "event", pool: "luck" },
  { index: 7, name: "tile_7", displayName: "barcelona", type: "prop", group: "Spain", price: 220 },
  { index: 8, name: "tile_8", displayName: "surprise", type: "event", pool: "chest" },
  { index: 9, name: "tile_9", displayName: "madrid", type: "prop", group: "Spain", price: 240 },
  { index: 10, name: "tile_10", displayName: "Prison", type: "corner" },
  { index: 11, name: "tile_11", displayName: "shanghai", type: "prop", group: "China", price: 200 },
  { index: 12, name: "tile_12", displayName: "hagz padel", type: "util", price: 150 },
  { index: 13, name: "tile_13", displayName: "bejing", type: "prop", group: "China", price: 180 },
  { index: 14, name: "tile_14", displayName: "shenzhen", type: "prop", group: "China", price: 220 },
  { index: 15, name: "tile_15", displayName: "matar", type: "rail", price: 200 },
  { index: 16, name: "tile_16", displayName: "gada", type: "prop", group: "Saudi Arabia", price: 260 },
  { index: 17, name: "tile_17", displayName: "riad", type: "prop", group: "Saudi Arabia", price: 280 },
  { index: 18, name: "tile_18", displayName: "treasure", type: "event", pool: "chest" },
  { index: 19, name: "tile_19", displayName: "dammam", type: "prop", group: "Saudi Arabia", price: 300 },
  { index: 20, name: "tile_20", displayName: "shop", type: "corner" },
  { index: 21, name: "tile_21", displayName: "doha", type: "prop", group: "Qatar", price: 260 },
  { index: 22, name: "tile_22", displayName: "lusail", type: "prop", group: "Qatar", price: 240 },
  { index: 23, name: "tile_23", displayName: "surprise", type: "event", pool: "luck" },
  { index: 24, name: "tile_24", displayName: "al wakrah", type: "prop", group: "Qatar", price: 220 },
  { index: 25, name: "tile_25", displayName: "matar", type: "rail", price: 200 },
  { index: 26, name: "tile_26", displayName: "berlin", type: "prop", group: "Germany", price: 300 },
  { index: 27, name: "tile_27", displayName: "hagz khomasy", type: "util", price: 150 },
  { index: 28, name: "tile_28", displayName: "frankfurt", type: "prop", group: "Germany", price: 280 },
  { index: 29, name: "tile_29", displayName: "munich", type: "prop", group: "Germany", price: 320 },
  { index: 30, name: "tile_30", displayName: "roh segn", type: "corner" },
  { index: 31, name: "tile_31", displayName: "lyon", type: "prop", group: "France", price: 340 },
  { index: 32, name: "tile_32", displayName: "treasure", type: "event", pool: "chest" },
  { index: 33, name: "tile_33", displayName: "paris", type: "prop", group: "France", price: 400 },
  { index: 34, name: "tile_34", displayName: "toluse", type: "prop", group: "France", price: 300 },
  { index: 35, name: "tile_35", displayName: "matar", type: "rail", price: 200 },
  { index: 36, name: "tile_36", displayName: "veince", type: "prop", group: "Italy", price: 350 },
  { index: 37, name: "tile_37", displayName: "milan", type: "prop", group: "Italy", price: 360 },
  { index: 38, name: "tile_38", displayName: "drayb", type: "event", pool: "luck" },
  { index: 39, name: "tile_39", displayName: "roma", type: "prop", group: "Italy", price: 400 },
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
