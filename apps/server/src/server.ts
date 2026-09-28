import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { Server } from "socket.io";
import type { GameAction } from "@bank-el-hazz/engine";
import type { ServerConfig } from "./config";
import { config as defaultConfig } from "./config";
import { SocketRateLimiter } from "./rateLimit";
import { RoomService, type Room, type RoomError } from "./rooms";
import { createRoomStore, type RoomStore } from "./store";
import {
  createRoomPayload,
  gameActionPayload,
  joinRoomPayload,
  roomOnlyPayload,
  sanitizeNickname,
  setColorPayload,
} from "./validation";

interface SessionData {
  roomCode?: string;
  playerId?: string;
}

function isRoomError(value: Room | RoomError): value is RoomError {
  return "error" in value;
}

export interface BuiltServer {
  app: ReturnType<typeof Fastify>;
  io: Server;
  rooms: RoomService;
  config: ServerConfig;
}

export async function buildServer(
  overrides: Partial<ServerConfig> = {},
  providedStore?: RoomStore,
): Promise<BuiltServer> {
  const config: ServerConfig = { ...defaultConfig, ...overrides };
  const app = Fastify({
    logger: process.env.NODE_ENV === "production",
    trustProxy: true,
    bodyLimit: 32 * 1024,
  });
  const io = new Server(app.server, {
    cors: {
      origin: config.webOrigins,
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 32 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000,
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      const forwardedHost = request.headers["x-forwarded-host"];
      const host = Array.isArray(forwardedHost)
        ? forwardedHost[0]
        : forwardedHost ?? request.headers.host;
      if (!origin || !host) return callback(null, true);

      try {
        const sameOrigin = new URL(origin).host === host;
        callback(null, sameOrigin || config.webOrigins.includes(origin));
      } catch {
        callback(null, false);
      }
    },
  });
  const store = providedStore ?? await createRoomStore(config.redisUrl, config.roomTtlSeconds);
  const rooms = new RoomService(store, {
    forfeitGraceMs: config.forfeitGraceMs,
    maxActiveRooms: config.maxActiveRooms,
  });
  const limiter = new SocketRateLimiter(
    config.maxEventsPerWindow,
    config.rateLimitWindowMs,
  );
  const activeConnections = new Map<string, number>();
  let shuttingDown = false;

  function broadcastLobby(room: Room): void {
    io.to(room.code).emit("lobby_update", {
      code: room.code,
      hostId: room.hostId,
      players: room.lobby,
    });
  }

  function broadcastGameState(room: Room): void {
    if (room.state) io.to(room.code).emit("game_state", room.state);
  }

  await rooms.start(broadcastGameState);

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "same-origin");
    reply.header("X-Frame-Options", "DENY");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: https://flagcdn.com; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss: http://localhost:4000; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    return payload;
  });

  app.get("/health", async (_request, reply) => {
    const storageHealthy = await rooms.healthy().catch(() => false);
    if (!storageHealthy) reply.code(503);
    return {
      ok: storageHealthy,
      storage: rooms.storageKind,
    };
  });

  const webDistPath = config.webDistPath
    ?? fileURLToPath(new URL("../../web/dist/", import.meta.url));
  if (existsSync(webDistPath)) {
    await app.register(fastifyStatic, {
      root: webDistPath,
      wildcard: false,
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === "GET" && !request.url.startsWith("/socket.io/")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "Not found" });
    });
  }

  function connectionKey(code: string, playerId: string): string {
    return `${code}:${playerId}`;
  }

  function attachSession(
    socketData: SessionData,
    code: string,
    playerId: string,
  ): void {
    if (socketData.roomCode === code && socketData.playerId === playerId) return;
    socketData.roomCode = code;
    socketData.playerId = playerId;
    const key = connectionKey(code, playerId);
    activeConnections.set(key, (activeConnections.get(key) ?? 0) + 1);
  }

  function detachSession(socketData: SessionData): number {
    if (!socketData.roomCode || !socketData.playerId) return 0;
    const key = connectionKey(socketData.roomCode, socketData.playerId);
    const remaining = Math.max(0, (activeConnections.get(key) ?? 1) - 1);
    if (remaining === 0) activeConnections.delete(key);
    else activeConnections.set(key, remaining);
    return remaining;
  }

  io.on("connection", (socket) => {
    const session = socket.data as SessionData;

    function emitError(message: string, fatal = false): void {
      socket.emit("room_error", { message, fatal });
    }

    function allowEvent(): boolean {
      if (limiter.allow(socket.id)) return true;
      emitError("طلبات كثيرة بسرعة. استنى لحظة وحاول تاني.");
      return false;
    }

    function requireSession(code: string): { playerId: string } | null {
      if (!session.playerId || session.roomCode !== code) {
        emitError("الجلسة غير صالحة. ادخل الغرفة من جديد.", true);
        return null;
      }
      return { playerId: session.playerId };
    }

    socket.on("create_room", (payload: unknown) => {
      if (!allowEvent()) return;
      void (async () => {
        if (session.roomCode) {
          return emitError("اخرج من الغرفة الحالية قبل إنشاء غرفة جديدة.");
        }
        const parsed = createRoomPayload.safeParse(payload);
        if (!parsed.success) return emitError("بيانات إنشاء الغرفة غير صالحة.");

        const result = await rooms.createRoom(
          parsed.data.token,
          sanitizeNickname(parsed.data.nickname),
          parsed.data.color,
        );
        if ("error" in result) return emitError(result.error, result.fatal);

        attachSession(session, result.room.code, result.playerId);
        await socket.join(result.room.code);
        socket.emit("session_ready", { playerId: result.playerId });
        socket.emit("room_created", { code: result.room.code });
        broadcastLobby(result.room);
      })().catch((error) => {
        app.log.error(error);
        emitError("حصل خطأ في السيرفر. حاول تاني.");
      });
    });

    socket.on("join_room", (payload: unknown) => {
      if (!allowEvent()) return;
      void (async () => {
        const parsed = joinRoomPayload.safeParse(payload);
        if (!parsed.success) return emitError("بيانات دخول الغرفة غير صالحة.", true);
        if (session.roomCode && session.roomCode !== parsed.data.code) {
          return emitError("اخرج من الغرفة الحالية قبل دخول غرفة أخرى.");
        }

        const result = await rooms.joinRoom(
          parsed.data.code,
          parsed.data.token,
          sanitizeNickname(parsed.data.nickname),
          parsed.data.color,
        );
        if ("error" in result) return emitError(result.error, result.fatal);

        attachSession(session, result.room.code, result.playerId);
        await socket.join(result.room.code);
        socket.emit("session_ready", { playerId: result.playerId });
        if (result.room.state) broadcastGameState(result.room);
        else broadcastLobby(result.room);
      })().catch((error) => {
        app.log.error(error);
        emitError("حصل خطأ في السيرفر. حاول تاني.");
      });
    });

    socket.on("set_color", (payload: unknown) => {
      if (!allowEvent()) return;
      void (async () => {
        const parsed = setColorPayload.safeParse(payload);
        if (!parsed.success) return emitError("اختيار اللون غير صالح.");
        const identity = requireSession(parsed.data.code);
        if (!identity) return;

        const result = await rooms.setLobbyColor(
          parsed.data.code,
          identity.playerId,
          parsed.data.color,
        );
        if (isRoomError(result)) return emitError(result.error, result.fatal);
        broadcastLobby(result);
      })().catch((error) => {
        app.log.error(error);
        emitError("حصل خطأ في السيرفر. حاول تاني.");
      });
    });

    socket.on("start_game", (payload: unknown) => {
      if (!allowEvent()) return;
      void (async () => {
        const parsed = roomOnlyPayload.safeParse(payload);
        if (!parsed.success) return emitError("كود الغرفة غير صالح.");
        const identity = requireSession(parsed.data.code);
        if (!identity) return;

        const result = await rooms.startGame(parsed.data.code, identity.playerId);
        if (isRoomError(result)) return emitError(result.error, result.fatal);
        broadcastGameState(result);
      })().catch((error) => {
        app.log.error(error);
        emitError("حصل خطأ في السيرفر. حاول تاني.");
      });
    });

    socket.on("game_action", (payload: unknown) => {
      if (!allowEvent()) return;
      void (async () => {
        const parsed = gameActionPayload.safeParse(payload);
        if (!parsed.success) return emitError("الحركة غير صالحة.");
        const identity = requireSession(parsed.data.code);
        if (!identity) return;

        const result = await rooms.dispatchAction(
          parsed.data.code,
          identity.playerId,
          parsed.data.action as GameAction,
        );
        if (isRoomError(result)) return emitError(result.error, result.fatal);
        broadcastGameState(result);
      })().catch((error) => {
        app.log.error(error);
        emitError("حصل خطأ في السيرفر. حاول تاني.");
      });
    });

    socket.on("disconnect", () => {
      limiter.remove(socket.id);
      const remainingConnections = detachSession(session);
      if (
        shuttingDown
        || remainingConnections > 0
        || !session.roomCode
        || !session.playerId
      ) return;

      void (async () => {
        const room = await rooms.getRoom(session.roomCode!);
        if (!room) return;
        if (room.state) {
          const updated = await rooms.markDisconnected(
            session.roomCode!,
            session.playerId!,
          );
          if (updated) broadcastGameState(updated);
        } else {
          const updated = await rooms.leaveLobby(
            session.roomCode!,
            session.playerId!,
          );
          if (updated) broadcastLobby(updated);
        }
      })().catch((error) => app.log.error(error));
    });
  });

  app.addHook("onClose", async () => {
    shuttingDown = true;
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await rooms.close();
  });

  return { app, io, rooms, config };
}
