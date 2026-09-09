import Fastify from "fastify";
import { Server } from "socket.io";
import type { GameAction } from "@bank-el-hazz/engine";
import { createRoom, joinRoom, getRoom, startGame, dispatchAction, leaveLobby, findRoomBySocket } from "./rooms";

const PORT = Number(process.env.PORT) || 4000;

const app = Fastify();
app.get("/health", async () => ({ ok: true }));

const httpServer = app.server;
const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_ORIGIN || "http://localhost:5173" },
});

io.on("connection", (socket) => {
  socket.on("create_room", ({ nickname }: { nickname: string }) => {
    const room = createRoom(socket.id, nickname.trim().slice(0, 20));
    socket.join(room.code);
    socket.emit("room_created", { code: room.code });
    io.to(room.code).emit("lobby_update", { code: room.code, hostId: room.hostId, players: room.lobby });
  });

  socket.on("join_room", ({ code, nickname }: { code: string; nickname: string }) => {
    const result = joinRoom(code, socket.id, nickname.trim().slice(0, 20));
    if ("error" in result) { socket.emit("room_error", { message: result.error }); return; }
    socket.join(result.code);
    io.to(result.code).emit("lobby_update", { code: result.code, hostId: result.hostId, players: result.lobby });
  });

  socket.on("start_game", ({ code }: { code: string }) => {
    const result = startGame(code, socket.id);
    if ("error" in result) { socket.emit("room_error", { message: result.error }); return; }
    io.to(result.code).emit("game_state", result.state);
  });

  socket.on("game_action", ({ code, action }: { code: string; action: GameAction }) => {
    const result = dispatchAction(code, action);
    if ("error" in result) { socket.emit("room_error", { message: result.error }); return; }
    io.to(result.code).emit("game_state", result.state);
  });

  socket.on("disconnect", () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const updated = leaveLobby(room.code, socket.id);
    if (updated) {
      io.to(updated.code).emit("lobby_update", { code: updated.code, hostId: updated.hostId, players: updated.lobby });
    }
  });
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`🏦 بنك الحظ server running on :${PORT}`);
});
