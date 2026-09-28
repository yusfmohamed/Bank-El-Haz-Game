import test from "node:test";
import assert from "node:assert/strict";
import {
  gameActionPayload,
  joinRoomPayload,
  sanitizeNickname,
} from "../src/validation";

test("runtime validation rejects malformed room and action payloads", () => {
  assert.equal(
    joinRoomPayload.safeParse({
      token: "short",
      nickname: "x",
      code: "DROP TABLE",
    }).success,
    false,
  );
  assert.equal(
    gameActionPayload.safeParse({
      code: "ABCDE",
      action: {
        type: "USE_TOKTOK",
        playerId: "player-one",
        targetIndex: 400,
      },
    }).success,
    false,
  );
});

test("nickname sanitization removes control characters and enforces length", () => {
  const cleaned = sanitizeNickname("  يوسف\u202E   محمد  12345678901234567890  ");
  assert.equal(cleaned.includes("\u202E"), false);
  assert.equal([...cleaned].length <= 20, true);
  assert.equal(cleaned.includes("  "), false);
});
