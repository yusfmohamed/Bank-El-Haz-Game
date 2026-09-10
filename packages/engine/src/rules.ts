import { TILES, EVENT_POOLS, GROUPS, tileByName } from "./board";
import type {
  GameState, Player, Tile, PropertyTile, GameAction, GameEventCard, PlayerColor,
} from "./types";

const STARTING_COINS = 1500;
const GO_BONUS = 200;

// ----------------------------------------------------------------------------
// Setup
// ----------------------------------------------------------------------------

export function createInitialState(
  playerInputs: { id: string; name: string; color: PlayerColor }[]
): GameState {
  return {
    players: playerInputs.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      coins: STARTING_COINS,
      pos: 0,
      props: [],
      bankrupt: false,
      skipTurns: 0,
      connected: true,
    })),
    currentPlayerIndex: 0,
    ownedBy: {},
    houses: {},
    lastRoll: 0,
    lastRollDetail: null,
    turnPhase: "awaiting_roll",
    pendingTileIndex: null,
    pendingEvent: null,
    winnerId: null,
    log: [],
  };
}

// Server-only mutation — NOT a GameAction, because a connection dropping is
// not something a client should ever be able to claim happened to someone
// else. The server calls this directly on socket disconnect/reconnect and
// broadcasts the result, same as it would for applyAction.
export function setPlayerConnected(state: GameState, playerId: string, connected: boolean): GameState {
  const next: GameState = structuredClone(state);
  const player = next.players.find((p) => p.id === playerId);
  if (player) player.connected = connected;
  return next;
}

// ----------------------------------------------------------------------------
// Pure queries
// ----------------------------------------------------------------------------

export function isBuyable(tile: Tile): tile is PropertyTile | (Tile & { price: number }) {
  return tile.type === "prop" || tile.type === "rail" || tile.type === "util";
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.bankrupt);
}

export function rentBase(tile: Tile & { price?: number }): number {
  return Math.round((tile.price ?? 100) * 0.28);
}

export function hasMonopoly(state: GameState, playerId: string, group: string | undefined): boolean {
  if (!group) return false;
  const props = TILES.filter((t) => t.type === "prop" && (t as PropertyTile).group === group);
  return props.length > 0 && props.every((t) => state.ownedBy[t.name] === playerId);
}

export function netWorth(state: GameState, player: Player): number {
  return (
    player.coins +
    player.props.reduce((sum, name) => {
      const tile = tileByName(name) as PropertyTile;
      const houseVal = (state.houses[name] || 0) * (GROUPS[tile.group]?.houseCost || 0);
      return sum + (("price" in tile ? tile.price : 0) || 0) + houseVal;
    }, 0)
  );
}

export function calcRent(state: GameState, tileName: string, roll: number): { amount: number; desc: string } {
  const tile = tileByName(tileName);
  const ownerId = state.ownedBy[tileName];
  if (!ownerId || !isBuyable(tile)) return { amount: 0, desc: "" };

  if (tile.type === "rail") {
    const owned = TILES.filter((t) => t.type === "rail" && state.ownedBy[t.name] === ownerId).length;
    const scale: Record<number, number> = { 1: 25, 2: 50, 3: 100, 4: 200 };
    return { amount: scale[owned] || 25, desc: `${owned} محطة قطار مملوكة` };
  }
  if (tile.type === "util") {
    const owned = TILES.filter((t) => t.type === "util" && state.ownedBy[t.name] === ownerId).length;
    const mult = owned >= 2 ? 10 : 4;
    return { amount: mult * roll, desc: `${owned >= 2 ? "المرفقين مملوكين (×10 النرد)" : "مرفق واحد (×4 النرد)"}` };
  }
  // prop
  const base = rentBase(tile as PropertyTile);
  const houses = state.houses[tileName] || 0;
  const monop = hasMonopoly(state, ownerId, (tile as PropertyTile).group);
  if (houses === 0) {
    return monop
      ? { amount: base * 2, desc: "احتكار كامل للمنطقة (×2)" }
      : { amount: base, desc: "إيجار أساسي" };
  }
  if (houses <= 4) {
    const mults = [1, 3, 6, 10, 14];
    return { amount: Math.round(base * mults[houses]), desc: `${houses} بيوت` };
  }
  return { amount: Math.round(base * 20), desc: "فندق مبني!" };
}

// ----------------------------------------------------------------------------
// Internal mutation helpers (operate on a draft clone, never the caller's state)
// ----------------------------------------------------------------------------

function log(state: GameState, msg: string) {
  state.log.unshift(msg);
  if (state.log.length > 50) state.log.pop();
}

function goBankrupt(state: GameState, player: Player, creditorId: string | null) {
  if (player.bankrupt) return;
  player.bankrupt = true;
  const creditor = creditorId ? state.players.find((p) => p.id === creditorId) : undefined;
  player.props.forEach((name) => {
    if (creditor) {
      state.ownedBy[name] = creditor.id;
      creditor.props.push(name);
    } else {
      delete state.ownedBy[name];
      state.houses[name] = 0;
    }
  });
  player.props = [];
  player.coins = 0;
  log(state, creditor
    ? `💸 ${player.name} فلس! كل عقاراته راحت لـ ${creditor.name}.`
    : `💸 ${player.name} فلس! عقاراته رجعت للبنك.`);
}

function checkWin(state: GameState) {
  const active = activePlayers(state);
  if (active.length <= 1) {
    state.turnPhase = "game_over";
    state.winnerId = active[0]?.id ?? null;
  }
}

function advanceTurn(state: GameState) {
  do {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  } while (state.players[state.currentPlayerIndex].bankrupt);

  const next = currentPlayer(state);
  if (next.skipTurns > 0) {
    next.skipTurns -= 1;
    log(state, `🚫 ${next.name} محظور الدور ده — بيتفرج بس!`);
    advanceTurn(state);
    return;
  }
  state.turnPhase = "awaiting_roll";
}

function resolveLanding(state: GameState, tileIndex: number) {
  const tile = TILES[tileIndex];
  const player = currentPlayer(state);

  if (isBuyable(tile)) {
    const ownerId = state.ownedBy[tile.name];
    if (!ownerId) {
      state.pendingTileIndex = tileIndex;
      state.turnPhase = "awaiting_buy_decision";
      return;
    }
    if (ownerId !== player.id) {
      const owner = state.players.find((p) => p.id === ownerId)!;
      const rent = calcRent(state, tile.name, state.lastRoll);
      if (player.coins < rent.amount) {
        owner.coins += player.coins;
        player.coins = 0;
        goBankrupt(state, player, owner.id);
        state.turnPhase = "awaiting_bankrupt_ack";
        checkWin(state);
        return;
      }
      player.coins -= rent.amount;
      owner.coins += rent.amount;
      log(state, `${player.name} دفع ${rent.amount} جنيه إيجار لـ ${owner.name} (${tile.name}). ${rent.desc}`);
      state.turnPhase = "awaiting_rent_ack";
      return;
    }
    log(state, `${player.name} على أرضه — آمن!`);
    advanceTurn(state);
    return;
  }

  if (tile.type === "event") {
    const pool = EVENT_POOLS[tile.pool];
    const ev = pool[Math.floor(Math.random() * pool.length)];
    state.pendingEvent = ev;

    if (ev.type === "coins") {
      if (player.coins + (ev.coins ?? 0) < 0) {
        goBankrupt(state, player, null);
        state.turnPhase = "awaiting_bankrupt_ack";
        checkWin(state);
        return;
      }
      player.coins += ev.coins ?? 0;
      log(state, `${ev.icon} ${player.name}: ${ev.title} — ${ev.effect}`);
      state.turnPhase = "awaiting_event_ack";
      return;
    }
    if (ev.type === "jail") {
      player.skipTurns += 1;
      log(state, `${ev.icon} ${player.name}: ${ev.title}`);
      state.turnPhase = "awaiting_event_ack";
      return;
    }
    // block — needs a target choice after the card is acknowledged
    state.turnPhase = "awaiting_event_ack";
    return;
  }

  // corner / start — no effect beyond the GO bonus already applied on move
  advanceTurn(state);
}

// ----------------------------------------------------------------------------
// The reducer — the ONLY way game state changes. Server calls this; nothing
// else is allowed to mutate a GameState directly.
// ----------------------------------------------------------------------------

export function applyAction(prevState: GameState, action: GameAction, rng: () => number = Math.random): GameState {
  const state: GameState = structuredClone(prevState);
  const actor = state.players.find((p) => p.id === action.playerId);
  if (!actor || actor.bankrupt) return state; // ignore actions from unknown/bankrupt players
  if (state.turnPhase === "game_over") return state;

  switch (action.type) {
    case "ROLL_DICE": {
      if (state.turnPhase !== "awaiting_roll" || currentPlayer(state).id !== actor.id) return state;
      const d1 = 1 + Math.floor(rng() * 6);
      const d2 = 1 + Math.floor(rng() * 6);
      const total = d1 + d2;
      state.lastRoll = total;
      state.lastRollDetail = { d1, d2 };

      const oldPos = actor.pos;
      const newPos = (actor.pos + total) % TILES.length;
      if (newPos <= oldPos && oldPos !== 0) {
        actor.coins += GO_BONUS;
        log(state, `${actor.name} فات على الانطلاق — +${GO_BONUS} جنيه!`);
      }
      actor.pos = newPos;
      log(state, `${actor.name} رمى ${d1}+${d2}=${total} وتحرك لـ ${TILES[newPos].name}`);
      resolveLanding(state, newPos);
      return state;
    }

    case "BUY_PROPERTY": {
      if (state.turnPhase !== "awaiting_buy_decision" || state.pendingTileIndex === null) return state;
      const tile = TILES[state.pendingTileIndex] as PropertyTile & { price: number };
      if (currentPlayer(state).id !== actor.id || actor.coins < tile.price) return state;
      actor.coins -= tile.price;
      state.ownedBy[tile.name] = actor.id;
      actor.props.push(tile.name);
      log(state, `${actor.name} اشترى ${tile.name} بـ ${tile.price} جنيه!`);
      state.pendingTileIndex = null;
      advanceTurn(state);
      return state;
    }

    case "SKIP_PURCHASE": {
      if (state.turnPhase !== "awaiting_buy_decision" || currentPlayer(state).id !== actor.id) return state;
      state.pendingTileIndex = null;
      advanceTurn(state);
      return state;
    }

    case "ACK_RENT": {
      if (state.turnPhase !== "awaiting_rent_ack" || currentPlayer(state).id !== actor.id) return state;
      advanceTurn(state);
      return state;
    }

    case "ACK_BANKRUPT": {
      if (state.turnPhase !== "awaiting_bankrupt_ack") return state;
      advanceTurn(state);
      return state;
    }

    case "ACK_EVENT": {
      if (state.turnPhase !== "awaiting_event_ack" || currentPlayer(state).id !== actor.id) return state;
      const ev = state.pendingEvent as GameEventCard | null;
      state.pendingEvent = null;
      if (ev?.type === "block") {
        state.turnPhase = "awaiting_block_target";
        return state;
      }
      advanceTurn(state);
      return state;
    }

    case "CHOOSE_BLOCK_TARGET": {
      if (state.turnPhase !== "awaiting_block_target" || currentPlayer(state).id !== actor.id) return state;
      const target = state.players.find((p) => p.id === action.targetPlayerId);
      if (!target || target.bankrupt || target.id === actor.id) return state;
      target.skipTurns += 1;
      log(state, `🚫 ${actor.name} حظر ${target.name} لدورة واحدة!`);
      advanceTurn(state);
      return state;
    }

    case "BUILD_HOUSE": {
      const tile = tileByName(action.tileName) as PropertyTile;
      if (state.ownedBy[tile.name] !== actor.id) return state;
      if (!hasMonopoly(state, actor.id, tile.group)) return state;
      const cost = GROUPS[tile.group].houseCost;
      const level = state.houses[tile.name] || 0;
      if (actor.coins < cost || level >= 5) return state;
      actor.coins -= cost;
      state.houses[tile.name] = level + 1;
      log(state, `🏠 ${actor.name} بنى على ${tile.name} (مستوى ${level + 1})`);
      return state;
    }

    case "DECLARE_BANKRUPTCY": {
      goBankrupt(state, actor, null);
      checkWin(state);
      if (state.winnerId === null && currentPlayer(state).id === actor.id) {
        advanceTurn(state);
      }
      return state;
    }

    default:
      return state;
  }
}
