import { customAlphabet } from "nanoid";
import { createInitialState, applyAction } from "@bank-el-hazz/engine";
import type { GameState, GameAction } from "@bank-el-hazz/engine";

// Short, unambiguous room codes — no 0/O/1/I confusion when someone reads
// it out loud to a friend.
const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

export interface LobbyPlayer {
  id: string;      // socket.id
  name: string;
}

export interface Room {
  code: string;
  hostId: string;
  lobby: LobbyPlayer[];
  state: GameState | null; // null until the host starts the game
}

const rooms = new Map<string, Room>();

export function createRoom(hostId: string, hostName: string): Room {
  let code = genCode();
  while (rooms.has(code)) code = genCode(); // astronomically unlikely, guard anyway
  const room: Room = {
    code,
    hostId,
    lobby: [{ id: hostId, name: hostName }],
    state: null,
  };
  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, playerId: string, name: string): Room | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: "الغرفة مش موجودة. اتأكد من الكود." };
  if (room.state) return { error: "اللعبة دي بدأت خلاص." };
  if (room.lobby.length >= 4) return { error: "الغرفة كاملة (٤ لاعبين بحد أقصى)." };
  if (room.lobby.some((p) => p.id === playerId)) return room;
  room.lobby.push({ id: playerId, name });
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function startGame(code: string, requesterId: string): Room | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: "الغرفة مش موجودة." };
  if (room.hostId !== requesterId) return { error: "بس صاحب الغرفة يقدر يبدأ اللعبة." };
  if (room.lobby.length < 2) return { error: "محتاج لاعبين اتنين على الأقل." };
  room.state = createInitialState(room.lobby.map((p) => ({ id: p.id, name: p.name })));
  return room;
}

export function dispatchAction(code: string, action: GameAction): Room | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room || !room.state) return { error: "اللعبة لسه ما بدأتش." };
  room.state = applyAction(room.state, action);
  return room;
}

// Removes a player from a room's lobby (pre-game only) and cleans up
// the room entirely if it's left empty. In-progress games currently
// leave the disconnected player's state as-is — reconnect/forfeit
// handling is a deliberate follow-up, not covered by this pass.
export function leaveLobby(code: string, playerId: string): Room | undefined {
  const room = rooms.get(code.toUpperCase());
  if (!room || room.state) return room;
  room.lobby = room.lobby.filter((p) => p.id !== playerId);
  if (room.lobby.length === 0) {
    rooms.delete(code.toUpperCase());
    return undefined;
  }
  if (room.hostId === playerId) room.hostId = room.lobby[0].id;
  return room;
}

export function findRoomBySocket(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.lobby.some((p) => p.id === playerId) || room.state?.players.some((p) => p.id === playerId)) {
      return room;
    }
  }
  return undefined;
}
