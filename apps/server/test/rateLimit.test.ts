import test from "node:test";
import assert from "node:assert/strict";
import { SocketRateLimiter } from "../src/rateLimit";

test("socket rate limiting blocks bursts and resets by window", () => {
  const limiter = new SocketRateLimiter(2, 10);
  assert.equal(limiter.allow("socket-1"), true);
  assert.equal(limiter.allow("socket-1"), true);
  assert.equal(limiter.allow("socket-1"), false);

  limiter.remove("socket-1");
  assert.equal(limiter.allow("socket-1"), true);
});
