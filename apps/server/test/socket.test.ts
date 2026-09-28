import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { io as createClient, type Socket } from "socket.io-client";
import { buildServer } from "../src/server";
import { MemoryRoomStore } from "../src/store";

function event<T>(socket: Socket, name: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), 3_000);
    socket.once(name, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

test("production server serves the site and secures a real socket room", async () => {
  const webRoot = await mkdtemp(join(tmpdir(), "bank-el-hazz-web-"));
  await writeFile(join(webRoot, "index.html"), "<!doctype html><title>Bank El Hazz</title>");

  const server = await buildServer(
    {
      webDistPath: webRoot,
      webOrigins: ["http://127.0.0.1"],
      forfeitGraceMs: 60_000,
    },
    new MemoryRoomStore(),
  );
  await server.app.listen({ port: 0, host: "127.0.0.1" });
  const address = server.app.server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;

  const health = await server.app.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { ok: true, storage: "memory" });

  const page = await server.app.inject({ method: "GET", url: "/" });
  assert.equal(page.statusCode, 200);
  assert.match(page.body, /Bank El Hazz/);

  const host = createClient(url, { transports: ["websocket"] });
  const guest = createClient(url, { transports: ["websocket"] });
  await Promise.all([event(host, "connect"), event(guest, "connect")]);

  const hostSession = event<{ playerId: string }>(host, "session_ready");
  const roomCreated = event<{ code: string }>(host, "room_created");
  host.emit("create_room", {
    token: "host-private-credential-123",
    nickname: "المضيف",
  });
  const [{ playerId: hostId }, { code }] = await Promise.all([
    hostSession,
    roomCreated,
  ]);

  const guestSession = event<{ playerId: string }>(guest, "session_ready");
  guest.emit("join_room", {
    token: "guest-private-credential-456",
    nickname: "الضيف",
    code,
  });
  const { playerId: guestId } = await guestSession;
  assert.notEqual(hostId, "host-private-credential-123");
  assert.notEqual(guestId, "guest-private-credential-456");

  const started = event(host, "game_state");
  host.emit("start_game", { code });
  await started;

  const rejected = event<{ message: string }>(host, "room_error");
  host.emit("game_action", {
    code,
    action: { type: "ROLL_DICE", playerId: guestId },
  });
  assert.match((await rejected).message, /رفض الحركة/);

  host.close();
  guest.close();
  await server.app.close();
  await rm(webRoot, { recursive: true, force: true });
});
