import type { PlayerColor } from "./types";

export const PLAYER_COLORS: { key: PlayerColor; label: string; hex: string }[] = [
  { key: "yellow", label: "أصفر", hex: "#f0c419" },
  { key: "red", label: "أحمر", hex: "#c0392b" },
  { key: "blue", label: "أزرق", hex: "#2f7fb0" },
  { key: "green", label: "أخضر", hex: "#2fa562" },
  { key: "purple", label: "بنفسجي", hex: "#8e44ad" },
  { key: "grey", label: "رمادي", hex: "#7f8c8d" },
];

export const MAX_PLAYERS = PLAYER_COLORS.length; // 6 — one per color, by design

export function colorHex(color: PlayerColor): string {
  return PLAYER_COLORS.find((c) => c.key === color)?.hex ?? "#888888";
}

// Given colors already taken in a room, returns the requested color if it's
// free, otherwise the first free color, otherwise null if the room is full.
export function assignColor(taken: PlayerColor[], requested?: PlayerColor): PlayerColor | null {
  if (requested && !taken.includes(requested)) return requested;
  const free = PLAYER_COLORS.find((c) => !taken.includes(c.key));
  return free ? free.key : null;
}
