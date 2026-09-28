function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export interface ServerConfig {
  port: number;
  redisUrl: string | null;
  roomTtlSeconds: number;
  forfeitGraceMs: number;
  maxActiveRooms: number;
  maxEventsPerWindow: number;
  rateLimitWindowMs: number;
  webOrigins: string[];
  webDistPath?: string;
}

export const config: ServerConfig = {
  port: positiveInt(process.env.PORT, 4000),
  redisUrl: process.env.REDIS_URL?.trim() || null,
  roomTtlSeconds: positiveInt(process.env.ROOM_TTL_SECONDS, 24 * 60 * 60),
  forfeitGraceMs: positiveInt(process.env.FORFEIT_GRACE_MS, 60_000),
  maxActiveRooms: positiveInt(process.env.MAX_ACTIVE_ROOMS, 500),
  maxEventsPerWindow: positiveInt(process.env.RATE_LIMIT_EVENTS, 80),
  rateLimitWindowMs: positiveInt(process.env.RATE_LIMIT_WINDOW_MS, 10_000),
  webOrigins: (process.env.WEB_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  webDistPath: process.env.WEB_DIST_PATH?.trim() || undefined,
};
