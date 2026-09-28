import { z } from "zod";

const playerColor = z.enum(["yellow", "red", "blue", "green", "purple", "grey"]);
const token = z.string().min(12).max(200);
const roomCode = z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{5}$/);
const playerId = z.string().min(6).max(40);
const tileName = z.string().regex(/^tile_(?:[0-9]|[1-3][0-9])$/);
const cash = z.number().int().min(0).max(1_000_000);

export const createRoomPayload = z.object({
  token,
  nickname: z.string().max(80),
  color: playerColor.optional(),
}).strict();

export const joinRoomPayload = createRoomPayload.extend({
  code: roomCode,
}).strict();

export const setColorPayload = z.object({
  code: roomCode,
  color: playerColor,
}).strict();

export const roomOnlyPayload = z.object({
  code: roomCode,
}).strict();

const actorOnly = <T extends string>(type: T) => z.object({
  type: z.literal(type),
  playerId,
}).strict();

export const gameAction = z.discriminatedUnion("type", [
  actorOnly("ROLL_DICE"),
  actorOnly("BUY_PROPERTY"),
  actorOnly("SKIP_PURCHASE"),
  actorOnly("SKIP_TOKTOK"),
  actorOnly("ACK_EVENT"),
  actorOnly("END_TURN"),
  actorOnly("ACK_RENT"),
  actorOnly("ACK_BANKRUPT"),
  actorOnly("ACCEPT_TRADE"),
  actorOnly("REJECT_TRADE"),
  actorOnly("PAY_JAIL_FINE"),
  actorOnly("DECLARE_BANKRUPTCY"),
  z.object({ type: z.literal("SELL_PROPERTY"), playerId, tileName }).strict(),
  z.object({ type: z.literal("BUILD_HOUSE"), playerId, tileName }).strict(),
  z.object({ type: z.literal("SELL_HOUSE"), playerId, tileName }).strict(),
  z.object({
    type: z.literal("TRADE_PROPERTY"),
    playerId,
    targetPlayerId: playerId,
    tileName,
    cash,
  }).strict(),
  z.object({
    type: z.literal("REQUEST_TRADE"),
    playerId,
    targetPlayerId: playerId,
    giveTileNames: z.array(tileName).max(40),
    takeTileNames: z.array(tileName).max(40),
    giveCash: cash,
    takeCash: cash,
  }).strict(),
  z.object({
    type: z.literal("USE_TOKTOK"),
    playerId,
    targetIndex: z.number().int().min(0).max(39),
  }).strict(),
  z.object({
    type: z.literal("CHOOSE_BLOCK_TARGET"),
    playerId,
    targetPlayerId: playerId,
  }).strict(),
]);

export const gameActionPayload = z.object({
  code: roomCode,
  action: gameAction,
}).strict();

export function sanitizeNickname(value: string): string {
  const withoutControls = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return [...withoutControls].slice(0, 20).join("") || "لاعب";
}
