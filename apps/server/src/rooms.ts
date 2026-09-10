import { customAlphabet } from "nanoid";
import { createInitialState, applyAction, setPlayerConnected, assignColor, MAX_PLAYERS } from "@bank-el-hazz/engine";
import type { GameState, GameAction, PlayerColor } from "@bank-el-hazz/engine";

// Short, unambiguous room codes — no 0/O/1/I confusion when someone reads
// it out loud to a friend.
const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

export interface LobbyPlayer {
  id: string;      // stable player token, NOT a socket id — survives refreshes/reconnects
  name: string;
  color: PlayerColor;
}

export interface Room {
  code: string;
  hostId: string;                              // token of the host
  lobby: LobbyPlayer[];
  state: GameState | null;                      // null until the host starts the game
  forfeitTimers: Map<string, NodeJS.Timeout>;   // token -> pending auto-forfeit timer
}

const rooms = new Map<string, Room>();

function getR(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

function clearForfeitTimer(room: Room, token: string) {
  const t = room.forfeitTimers.get(token);
  if (t) {
    clearTimeout(t);
    room.forfeitTimers.delete(token);
  }
}

// ----------------------------------------------------------------------------
// Lobby
// ----------------------------------------------------------------------------

export function createRoom(hostToken: string, hostName: string, requestedColor?: PlayerColor): Room {
  let code = genCode();
  while (rooms.has(code)) code = genCode(); // astronomically unlikely, guard anyway
  const color = assignColor([], requestedColor)!; // empty room — always succeeds
  const room: Room = {
    code,
    hostId: hostToken,
    lobby: [{ id: hostToken, name: hostName, color }],
    state: null,
    forfeitTimers: new Map(),
  };
  rooms.set(code, room);
  return room;
}

export type JoinOutcome = { room: Room; reconnected: boolean } | { error: string };

export function joinRoom(code: string, token: string, name: string, requestedColor?: PlayerColor): JoinOutcome {
  const room = getR(code);
  if (!room) return { error: "الغرفة مش موجودة. اتأكد من الكود." };

  // Game already running — only a known token (rejoining after a disconnect)
  // is allowed back in. A brand-new player can't join a game in progress.
  if (room.state) {
    const existing = room.state.players.find((p) => p.id === token);
    if (!existing) return { error: "اللعبة دي بدأت خلاص." };
    clearForfeitTimer(room, token);
    room.state = setPlayerConnected(room.state, token, true);
    return { room, reconnected: true };
  }

  if (room.lobby.some((p) => p.id === token)) return { room, reconnected: false };
  if (room.lobby.length >= MAX_PLAYERS) return { error: `الغرفة كاملة (${MAX_PLAYERS} لاعبين بحد أقصى).` };

  const color = assignColor(room.lobby.map((p) => p.color), requestedColor);
  if (!color) return { error: "مفيش ألوان فاضية في الغرفة دي." };
  room.lobby.push({ id: token, name, color });
  return { room, reconnected: false };
}

export function getRoom(code: string): Room | undefined {
  return getR(code);
}

export function startGame(code: string, requesterToken: string): Room | { error: string } {
  const room = getR(code);
  if (!room) return { error: "الغرفة مش موجودة." };
  if (room.hostId !== requesterToken) return { error: "بس صاحب الغرفة يقدر يبدأ اللعبة." };
  if (room.lobby.length < 2) return { error: "محتاج لاعبين اتنين على الأقل." };
  room.state = createInitialState(room.lobby.map((p) => ({ id: p.id, name: p.name, color: p.color })));
  return room;
}

export function dispatchAction(code: string, action: GameAction): Room | { error: string } {
  const room = getR(code);
  if (!room || !room.state) return { error: "اللعبة لسه ما بدأتش." };
  room.state = applyAction(room.state, action);
  return room;
}

// Removes a player from a room's LOBBY only (pre-game). Cleans up the room
// entirely if it's left empty, and hands the host crown to whoever's left.
export function leaveLobby(code: string, token: string): Room | undefined {
  const room = getR(code);
  if (!room || room.state) return room;
  room.lobby = room.lobby.filter((p) => p.id !== token);
  if (room.lobby.length === 0) {
    rooms.delete(code.toUpperCase());
    return undefined;
  }
  if (room.hostId === token) room.hostId = room.lobby[0].id;
  return room;
}

export function findRoomByToken(token: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.lobby.some((p) => p.id === token) || room.state?.players.some((p) => p.id === token)) {
      return room;
    }
  }
  return undefined;
}

// ----------------------------------------------------------------------------
// Disconnect / reconnect grace period
// ----------------------------------------------------------------------------

const FORFEIT_GRACE_MS = Number(process.env.FORFEIT_GRACE_MS) || 60_000; // how long a dropped player's seat is held before auto-forfeit

// Marks a player as disconnected in-game and starts the grace-period clock.
// If they don't reconnect (via joinRoom) before it fires, onForfeit runs —
// the caller (server/index.ts) is responsible for broadcasting the result.
export function markDisconnected(code: string, token: string, onForfeit: (room: Room) => void): Room | undefined {
  const room = getR(code);
  if (!room || !room.state) return room;
  room.state = setPlayerConnected(room.state, token, false);

  clearForfeitTimer(room, token);
  const timer = setTimeout(() => {
    const r = getR(code);
    if (!r || !r.state) return;
    const player = r.state.players.find((p) => p.id === token);
    if (!player || player.bankrupt || player.connected) return; // already resolved somehow
    r.state = applyAction(r.state, { type: "DECLARE_BANKRUPTCY", playerId: token });
    r.forfeitTimers.delete(token);
    onForfeit(r);
  }, FORFEIT_GRACE_MS);
  room.forfeitTimers.set(token, timer);

  return room;
}
