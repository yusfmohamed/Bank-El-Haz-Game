import { customAlphabet } from "nanoid";
import {
  applyAction,
  assignColor,
  createInitialState,
  MAX_PLAYERS,
  setPlayerConnected,
} from "@bank-el-hazz/engine";
import type { GameAction, GameState, PlayerColor } from "@bank-el-hazz/engine";
import type { RoomStore } from "./store";

const genRoomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);
const genPlayerId = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 12);

export interface LobbyPlayer {
  id: string;
  name: string;
  color: PlayerColor;
}

export interface Room {
  code: string;
  hostId: string;
  lobby: LobbyPlayer[];
  state: GameState | null;
  credentials: Record<string, string>;
  forfeitDeadlines: Record<string, number>;
}

export interface RoomServiceOptions {
  forfeitGraceMs: number;
  maxActiveRooms: number;
}

export type RoomError = { error: string; fatal?: boolean };
export type CreateOutcome = { room: Room; playerId: string } | RoomError;
export type JoinOutcome = {
  room: Room;
  playerId: string;
  reconnected: boolean;
} | RoomError;

type RoomChanged = (room: Room) => void | Promise<void>;

function playerIdForToken(room: Room, token: string): string | undefined {
  return room.credentials[token];
}

export class RoomService {
  private readonly locks = new Map<string, Promise<void>>();
  private readonly forfeitTimers = new Map<string, NodeJS.Timeout>();
  private onForfeit: RoomChanged = () => {};

  constructor(
    private readonly store: RoomStore,
    private readonly options: RoomServiceOptions,
  ) {}

  get storageKind(): RoomStore["kind"] {
    return this.store.kind;
  }

  async start(onForfeit: RoomChanged): Promise<void> {
    this.onForfeit = onForfeit;
    const rooms = await this.store.list();
    for (const room of rooms) {
      for (const [playerId, deadline] of Object.entries(room.forfeitDeadlines)) {
        this.scheduleForfeit(room.code, playerId, deadline);
      }
    }
  }

  async close(): Promise<void> {
    for (const timer of this.forfeitTimers.values()) clearTimeout(timer);
    this.forfeitTimers.clear();
    await this.store.close();
  }

  async healthy(): Promise<boolean> {
    return this.store.ping();
  }

  async createRoom(
    hostToken: string,
    hostName: string,
    requestedColor?: PlayerColor,
  ): Promise<CreateOutcome> {
    return this.withRoomLock("__room_creation__", async () => {
      if (await this.store.count() >= this.options.maxActiveRooms) {
        return { error: "السيرفر مليان مؤقتًا. جرب كمان شوية." };
      }

      let code = genRoomCode();
      while (await this.store.get(code)) code = genRoomCode();

      const playerId = genPlayerId();
      const color = assignColor([], requestedColor)!;
      const room: Room = {
        code,
        hostId: playerId,
        lobby: [{ id: playerId, name: hostName, color }],
        state: null,
        credentials: { [hostToken]: playerId },
        forfeitDeadlines: {},
      };
      await this.store.save(room);
      return { room, playerId };
    });
  }

  async joinRoom(
    code: string,
    token: string,
    name: string,
    requestedColor?: PlayerColor,
  ): Promise<JoinOutcome> {
    return this.withRoomLock(code, async () => {
      const room = await this.store.get(code);
      if (!room) return { error: "الغرفة مش موجودة. اتأكد من الكود.", fatal: true };

      const knownPlayerId = playerIdForToken(room, token);
      if (room.state) {
        if (!knownPlayerId || !room.state.players.some((player) => player.id === knownPlayerId)) {
          return { error: "اللعبة دي بدأت خلاص.", fatal: true };
        }

        this.clearForfeit(room, knownPlayerId);
        room.state = setPlayerConnected(room.state, knownPlayerId, true);
        await this.store.save(room);
        return { room, playerId: knownPlayerId, reconnected: true };
      }

      if (knownPlayerId) {
        const existing = room.lobby.find((player) => player.id === knownPlayerId);
        if (existing) {
          existing.name = name;
          await this.store.save(room);
          return { room, playerId: knownPlayerId, reconnected: true };
        }
      }

      if (room.lobby.length >= MAX_PLAYERS) {
        return { error: `الغرفة كاملة (${MAX_PLAYERS} لاعبين بحد أقصى).` };
      }

      const color = assignColor(room.lobby.map((player) => player.color), requestedColor);
      if (!color) return { error: "مفيش ألوان فاضية في الغرفة دي." };

      const playerId = genPlayerId();
      room.credentials[token] = playerId;
      room.lobby.push({ id: playerId, name, color });
      await this.store.save(room);
      return { room, playerId, reconnected: false };
    });
  }

  async setLobbyColor(
    code: string,
    playerId: string,
    requestedColor: PlayerColor,
  ): Promise<Room | RoomError> {
    return this.withRoomLock(code, async () => {
      const room = await this.store.get(code);
      if (!room) return { error: "الغرفة مش موجودة.", fatal: true };
      if (room.state) return { error: "اللعبة بدأت خلاص، مينفعش تغير اللون دلوقتي." };

      const player = room.lobby.find((item) => item.id === playerId);
      if (!player) return { error: "مش موجود في الغرفة دي.", fatal: true };

      const takenByOthers = room.lobby
        .filter((item) => item.id !== playerId)
        .map((item) => item.color);
      if (takenByOthers.includes(requestedColor)) {
        return { error: "اللون ده متاخد بالفعل." };
      }

      player.color = requestedColor;
      await this.store.save(room);
      return room;
    });
  }

  async startGame(code: string, requesterId: string): Promise<Room | RoomError> {
    return this.withRoomLock(code, async () => {
      const room = await this.store.get(code);
      if (!room) return { error: "الغرفة مش موجودة.", fatal: true };
      if (room.hostId !== requesterId) return { error: "بس صاحب الغرفة يقدر يبدأ اللعبة." };
      if (room.lobby.length < 2) return { error: "محتاج لاعبين اتنين على الأقل." };

      room.state = createInitialState(room.lobby);
      await this.store.save(room);
      return room;
    });
  }

  async dispatchAction(
    code: string,
    socketPlayerId: string,
    action: GameAction,
  ): Promise<Room | RoomError> {
    return this.withRoomLock(code, async () => {
      const room = await this.store.get(code);
      if (!room || !room.state) return { error: "اللعبة لسه ما بدأتش.", fatal: !room };
      if (!room.state.players.some((player) => player.id === socketPlayerId)) {
        return { error: "اللاعب مش موجود في الغرفة دي.", fatal: true };
      }
      if (action.playerId !== socketPlayerId) {
        return { error: "تم رفض الحركة لأنها لا تخص اللاعب المتصل." };
      }

      room.state = applyAction(room.state, { ...action, playerId: socketPlayerId });
      await this.store.save(room);
      return room;
    });
  }

  async leaveLobby(code: string, playerId: string): Promise<Room | undefined> {
    return this.withRoomLock(code, async () => {
      const room = await this.store.get(code);
      if (!room || room.state) return room;

      room.lobby = room.lobby.filter((player) => player.id !== playerId);
      for (const [token, mappedPlayerId] of Object.entries(room.credentials)) {
        if (mappedPlayerId === playerId) delete room.credentials[token];
      }

      if (room.lobby.length === 0) {
        await this.store.delete(code);
        return undefined;
      }

      if (room.hostId === playerId) room.hostId = room.lobby[0].id;
      await this.store.save(room);
      return room;
    });
  }

  async markDisconnected(
    code: string,
    playerId: string,
  ): Promise<Room | undefined> {
    return this.withRoomLock(code, async () => {
      const room = await this.store.get(code);
      if (!room || !room.state) return room;

      room.state = setPlayerConnected(room.state, playerId, false);
      const deadline = Date.now() + this.options.forfeitGraceMs;
      room.forfeitDeadlines[playerId] = deadline;
      await this.store.save(room);
      this.scheduleForfeit(room.code, playerId, deadline);
      return room;
    });
  }

  async getRoom(code: string): Promise<Room | undefined> {
    return this.store.get(code);
  }

  private clearForfeit(room: Room, playerId: string): void {
    const key = this.timerKey(room.code, playerId);
    const timer = this.forfeitTimers.get(key);
    if (timer) clearTimeout(timer);
    this.forfeitTimers.delete(key);
    delete room.forfeitDeadlines[playerId];
  }

  private scheduleForfeit(code: string, playerId: string, deadline: number): void {
    const key = this.timerKey(code, playerId);
    const existing = this.forfeitTimers.get(key);
    if (existing) clearTimeout(existing);

    const delay = Math.max(0, Math.min(deadline - Date.now(), 2_147_000_000));
    const timer = setTimeout(() => {
      this.forfeitTimers.delete(key);
      void this.forfeitIfDue(code, playerId);
    }, delay);
    timer.unref();
    this.forfeitTimers.set(key, timer);
  }

  private async forfeitIfDue(code: string, playerId: string): Promise<void> {
    const updated = await this.withRoomLock(code, async () => {
      const room = await this.store.get(code);
      if (!room || !room.state) return undefined;

      const deadline = room.forfeitDeadlines[playerId];
      if (!deadline) return undefined;
      if (deadline > Date.now()) {
        this.scheduleForfeit(code, playerId, deadline);
        return undefined;
      }

      const player = room.state.players.find((item) => item.id === playerId);
      delete room.forfeitDeadlines[playerId];
      if (!player || player.bankrupt || player.connected) {
        await this.store.save(room);
        return undefined;
      }

      room.state = applyAction(room.state, {
        type: "DECLARE_BANKRUPTCY",
        playerId,
      });
      await this.store.save(room);
      return room;
    });

    if (updated) await this.onForfeit(updated);
  }

  private timerKey(code: string, playerId: string): string {
    return `${code.toUpperCase()}:${playerId}`;
  }

  private async withRoomLock<T>(code: string, operation: () => Promise<T>): Promise<T> {
    const lockKey = code.toUpperCase();
    const previous = this.locks.get(lockKey) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => gate);
    this.locks.set(lockKey, queued);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.locks.get(lockKey) === queued) this.locks.delete(lockKey);
    }
  }
}
