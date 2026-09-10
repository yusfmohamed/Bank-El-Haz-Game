import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import type { GameAction, PlayerColor } from "@bank-el-hazz/engine";
import {
  createRoom, joinRoom, startGame, dispatchAction,
  leaveLobby, findRoomByToken, markDisconnected, type Room,
} from "./rooms";

const PORT = Number(process.env.PORT) || 4000;
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify();
app.get("/health", async () => ({ ok: true }));

// Serve the built web app (apps/web/dist) from this same server, so the
// whole game — frontend + Socket.IO — lives behind one port/URL. This is
// what lets you share a single tunnel link with friends instead of running
// two separate processes with CORS between them.
const webDist = join(__dirname, "../../web/dist");
if (existsSync(webDist)) {
  app.register(fastifyStatic, { root: webDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.method === "GET" && !req.url.startsWith("/socket.io")) {
      reply.sendFile("index.html");
    } else {
      reply.code(404).send({ error: "Not found" });
    }
  });
}

const httpServer = app.server;
const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_ORIGIN || "http://localhost:5173" },
});

function broadcastLobby(room: Room) {
  io.to(room.code).emit("lobby_update", { code: room.code, hostId: room.hostId, players: room.lobby });
}
function broadcastGameState(room: Room) {
  if (room.state) io.to(room.code).emit("game_state", room.state);
}

// Every connected socket maps to exactly one stable player token, once
// they've created or joined a room. This is how we tell "the same person
// refreshed their tab" apart from "a stranger connected" on disconnect.
const socketToToken = new Map<string, string>();

io.on("connection", (socket) => {
  socket.on("create_room", ({ token, nickname, color }: { token: string; nickname: string; color?: PlayerColor }) => {
    socketToToken.set(socket.id, token);
    const room = createRoom(token, nickname.trim().slice(0, 20), color);
    socket.join(room.code);
    socket.emit("room_created", { code: room.code });
    broadcastLobby(room);
  });

  socket.on("join_room", ({ token, code, nickname, color }: { token: string; code: string; nickname: string; color?: PlayerColor }) => {
    socketToToken.set(socket.id, token);
    const result = joinRoom(code, token, nickname.trim().slice(0, 20), color);
    if ("error" in result) { socket.emit("room_error", { message: result.error }); return; }
    socket.join(result.room.code);
    if (result.reconnected) {
      broadcastGameState(result.room);
    } else {
      broadcastLobby(result.room);
    }
  });

  socket.on("start_game", ({ code }: { code: string }) => {
    const result = startGame(code, socketToToken.get(socket.id) || "");
    if ("error" in result) { socket.emit("room_error", { message: result.error }); return; }
    broadcastGameState(result);
  });

  socket.on("game_action", ({ code, action }: { code: string; action: GameAction }) => {
    const result = dispatchAction(code, action);
    if ("error" in result) { socket.emit("room_error", { message: result.error }); return; }
    broadcastGameState(result);
  });

  socket.on("disconnect", () => {
    const token = socketToToken.get(socket.id);
    socketToToken.delete(socket.id);
    if (!token) return;

    const room = findRoomByToken(token);
    if (!room) return;

    if (room.state) {
      // In-game: hold their seat for a grace period rather than nuking it
      // immediately — a page refresh or a flaky connection shouldn't cost
      // someone their properties.
      const updated = markDisconnected(room.code, token, (r) => broadcastGameState(r));
      if (updated) broadcastGameState(updated);
    } else {
      // Still in the lobby: just remove them, no grace period needed.
      const updated = leaveLobby(room.code, token);
      if (updated) broadcastLobby(updated);
    }
  });
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`🏦 بنك الحظ server running on :${PORT}`);
});
