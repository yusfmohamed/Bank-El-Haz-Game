import test from "node:test";
import assert from "node:assert/strict";
import { applyAction, createInitialState } from "../src/index";
import type { GameState } from "../src/index";

function game(): GameState {
  return createInitialState([
    { id: "player-one", name: "الأول", color: "red" },
    { id: "player-two", name: "الثاني", color: "blue" },
  ]);
}

test("a trade transfers selected properties and cash", () => {
  let state = game();
  state.ownedBy.tile_1 = "player-one";
  state.ownedBy.tile_7 = "player-two";
  state.players[0].props = ["tile_1"];
  state.players[1].props = ["tile_7"];

  state = applyAction(state, {
    type: "REQUEST_TRADE",
    playerId: "player-one",
    targetPlayerId: "player-two",
    giveTileNames: ["tile_1"],
    takeTileNames: ["tile_7"],
    giveCash: 100,
    takeCash: 20,
  });
  state = applyAction(state, {
    type: "ACCEPT_TRADE",
    playerId: "player-two",
  });

  assert.equal(state.ownedBy.tile_1, "player-two");
  assert.equal(state.ownedBy.tile_7, "player-one");
  assert.equal(state.players[0].coins, 1420);
  assert.equal(state.players[1].coins, 1580);
  assert.equal(state.pendingTrade, null);
});

test("houses require ownership of the complete country set", () => {
  let state = game();
  state.ownedBy.tile_1 = "player-one";
  state.players[0].props = ["tile_1"];

  state = applyAction(state, {
    type: "BUILD_HOUSE",
    playerId: "player-one",
    tileName: "tile_1",
  });
  assert.equal(state.houses.tile_1 ?? 0, 0);

  state.ownedBy.tile_3 = "player-one";
  state.ownedBy.tile_4 = "player-one";
  state.players[0].props.push("tile_3", "tile_4");
  state = applyAction(state, {
    type: "BUILD_HOUSE",
    playerId: "player-one",
    tileName: "tile_1",
  });

  assert.equal(state.houses.tile_1, 1);
  assert.equal(state.players[0].coins, 1400);
});

test("a jailed player leaves after the third failed doubles attempt", () => {
  let state = game();
  state.players[0].inJail = true;
  state.players[0].pos = 10;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    state.currentPlayerIndex = 0;
    state.turnPhase = "awaiting_roll";
    const rolls = [0, 0.2];
    state = applyAction(
      state,
      { type: "ROLL_DICE", playerId: "player-one" },
      () => rolls.shift() ?? 0,
    );

    if (attempt < 3) {
      assert.equal(state.players[0].inJail, true);
      assert.equal(state.players[0].jailAttempts, attempt);
    }
  }

  assert.equal(state.players[0].inJail, false);
  assert.equal(state.players[0].jailAttempts, 0);
  assert.equal(state.players[0].pos, 13);
});

test("bankrupting the final opponent declares the winner", () => {
  const state = applyAction(game(), {
    type: "DECLARE_BANKRUPTCY",
    playerId: "player-two",
  });

  assert.equal(state.players[1].bankrupt, true);
  assert.equal(state.turnPhase, "game_over");
  assert.equal(state.winnerId, "player-one");
});
