import { createClient } from "redis";
import type { Room } from "./rooms";

export interface RoomStore {
  readonly kind: "memory" | "redis";
  get(code: string): Promise<Room | undefined>;
  save(room: Room): Promise<void>;
  delete(code: string): Promise<void>;
  list(): Promise<Room[]>;
  count(): Promise<number>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

function cloneRoom(room: Room): Room {
  return structuredClone(room);
}

export class MemoryRoomStore implements RoomStore {
  readonly kind = "memory" as const;

  constructor(private readonly rooms = new Map<string, Room>()) {}

  async get(code: string): Promise<Room | undefined> {
    const room = this.rooms.get(code.toUpperCase());
    return room ? cloneRoom(room) : undefined;
  }

  async save(room: Room): Promise<void> {
    this.rooms.set(room.code, cloneRoom(room));
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code.toUpperCase());
  }

  async list(): Promise<Room[]> {
    return [...this.rooms.values()].map(cloneRoom);
  }

  async count(): Promise<number> {
    return this.rooms.size;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {}
}

export class RedisRoomStore implements RoomStore {
  readonly kind = "redis" as const;
  private readonly client;
  private readonly prefix = "bank-el-hazz:room:";

  private constructor(
    redisUrl: string,
    private readonly ttlSeconds: number,
  ) {
    this.client = createClient({ url: redisUrl });
    this.client.on("error", (error) => {
      console.error("Redis error", error);
    });
  }

  static async connect(redisUrl: string, ttlSeconds: number): Promise<RedisRoomStore> {
    const store = new RedisRoomStore(redisUrl, ttlSeconds);
    await store.client.connect();
    return store;
  }

  private key(code: string): string {
    return `${this.prefix}${code.toUpperCase()}`;
  }

  async get(code: string): Promise<Room | undefined> {
    const raw = await this.client.get(this.key(code));
    return raw ? JSON.parse(raw) as Room : undefined;
  }

  async save(room: Room): Promise<void> {
    await this.client.set(this.key(room.code), JSON.stringify(room), {
      EX: this.ttlSeconds,
    });
  }

  async delete(code: string): Promise<void> {
    await this.client.del(this.key(code));
  }

  async list(): Promise<Room[]> {
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length === 0) return [];
    const values = await this.client.mGet(keys);
    return values
      .filter((value): value is string => value !== null)
      .map((value) => JSON.parse(value) as Room);
  }

  async count(): Promise<number> {
    return (await this.client.keys(`${this.prefix}*`)).length;
  }

  async ping(): Promise<boolean> {
    return (await this.client.ping()) === "PONG";
  }

  async close(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
}

export async function createRoomStore(
  redisUrl: string | null,
  ttlSeconds: number,
): Promise<RoomStore> {
  if (redisUrl) return RedisRoomStore.connect(redisUrl, ttlSeconds);
  if (process.env.NODE_ENV === "production") {
    throw new Error("REDIS_URL is required when NODE_ENV=production");
  }
  return new MemoryRoomStore();
}
