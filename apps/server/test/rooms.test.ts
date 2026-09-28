import test from "node:test";
import assert from "node:assert/strict";
import { RoomService } from "../src/rooms";
import { MemoryRoomStore } from "../src/store";

const hostToken = "host-secret-credential-123";
const guestToken = "guest-secret-credential-456";

function service(store = new MemoryRoomStore()): RoomService {
  return new RoomService(store, {
    forfeitGraceMs: 60_000,
    maxActiveRooms: 10,
  });
}

test("join assigns public IDs without exposing private credentials", async () => {
  const rooms = service();
  await rooms.start(() => {});

  const created = await rooms.createRoom(hostToken, "المضيف", "red");
  assert.ok(!("error" in created));
  if ("error" in created) return;

  const joined = await rooms.joinRoom(
    created.room.code,
    guestToken,
    "الضيف",
    "blue",
  );
  assert.ok(!("error" in joined));
  if ("error" in joined) return;

  assert.notEqual(created.playerId, hostToken);
  assert.notEqual(joined.playerId, guestToken);
  assert.deepEqual(
    created.room.lobby.map((player) => player.id).includes(hostToken),
    false,
  );
  assert.equal(joined.room.credentials[guestToken], joined.playerId);
  await rooms.close();
});

test("actions are bound to the player authenticated on the socket", async () => {
  const rooms = service();
  await rooms.start(() => {});
  const created = await rooms.createRoom(hostToken, "المضيف");
  assert.ok(!("error" in created));
  if ("error" in created) return;
  const joined = await rooms.joinRoom(created.room.code, guestToken, "الضيف");
  assert.ok(!("error" in joined));
  if ("error" in joined) return;

  const started = await rooms.startGame(created.room.code, created.playerId);
  assert.ok(!("error" in started));

  const spoofed = await rooms.dispatchAction(
    created.room.code,
    created.playerId,
    { type: "ROLL_DICE", playerId: joined.playerId },
  );
  assert.ok("error" in spoofed);
  const unchanged = await rooms.getRoom(created.room.code);
  assert.equal(unchanged?.state?.rollCount, 0);

  const valid = await rooms.dispatchAction(
    created.room.code,
    created.playerId,
    { type: "ROLL_DICE", playerId: created.playerId },
  );
  assert.ok(!("error" in valid));
  if (!("error" in valid)) assert.equal(valid.state?.rollCount, 1);
  await rooms.close();
});

test("a player reconnects with the same public ID after a service restart", async () => {
  const backingRooms = new Map();
  const store = new MemoryRoomStore(backingRooms);
  const firstService = service(store);
  await firstService.start(() => {});

  const created = await firstService.createRoom(hostToken, "المضيف");
  assert.ok(!("error" in created));
  if ("error" in created) return;
  const joined = await firstService.joinRoom(created.room.code, guestToken, "الضيف");
  assert.ok(!("error" in joined));
  if ("error" in joined) return;
  await firstService.startGame(created.room.code, created.playerId);
  await firstService.markDisconnected(created.room.code, joined.playerId);
  await firstService.close();

  const restartedService = service(new MemoryRoomStore(backingRooms));
  await restartedService.start(() => {});
  const rejoined = await restartedService.joinRoom(
    created.room.code,
    guestToken,
    "الضيف",
  );

  assert.ok(!("error" in rejoined));
  if (!("error" in rejoined)) {
    assert.equal(rejoined.reconnected, true);
    assert.equal(rejoined.playerId, joined.playerId);
    const player = rejoined.room.state?.players.find(
      (item) => item.id === joined.playerId,
    );
    assert.equal(player?.connected, true);
  }
  await restartedService.close();
});

test("room creation stops at the configured server capacity", async () => {
  const rooms = new RoomService(new MemoryRoomStore(), {
    forfeitGraceMs: 60_000,
    maxActiveRooms: 1,
  });
  await rooms.start(() => {});

  const first = await rooms.createRoom(hostToken, "الأول");
  const second = await rooms.createRoom(guestToken, "الثاني");

  assert.ok(!("error" in first));
  assert.ok("error" in second);
  await rooms.close();
});
