import { TILES, EVENT_POOLS, GROUPS, tileByName } from "./board";
import type {
  GameState, Player, Tile, PropertyTile, RailOrUtilTile, GameAction, GameEventCard, PlayerColor, TurnPhase,
} from "./types";

const STARTING_COINS = 1500;
const GO_BONUS = 200;
const HAGZ_SINGLE_MULTIPLIER = 8;
const HAGZ_PAIR_MULTIPLIER = 16;
const JAIL_INDEX = 10;
const GO_TO_JAIL_INDEX = 30;
const JAIL_FINE = 50;
const FREE_ON_JAIL_ATTEMPT = 3;

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
      inJail: false,
      jailAttempts: 0,
      connected: true,
    })),
    currentPlayerIndex: 0,
    ownedBy: {},
    houses: {},
    lastRoll: 0,
    lastRollDetail: null,
    lastRollAllowsExtraTurn: false,
    rollCount: 0,
    turnPhase: "awaiting_roll",
    pendingTileIndex: null,
    pendingEvent: null,
    pendingTrade: null,
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

function rolledDoubleFromDetail(state: GameState): boolean {
  return state.lastRollDetail !== null && state.lastRollDetail.d1 === state.lastRollDetail.d2;
}

function rolledDouble(state: GameState): boolean {
  return state.lastRollAllowsExtraTurn === true;
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

export function groupHasBuildings(state: GameState, group: string | undefined): boolean {
  if (!group) return false;
  return TILES.some((t) =>
    t.type === "prop" &&
    (t as PropertyTile).group === group &&
    (state.houses[t.name] || 0) > 0
  );
}

function tileLockedByGroupBuildings(state: GameState, tileName: string): boolean {
  const tile = tileByName(tileName);
  return tile.type === "prop" && groupHasBuildings(state, tile.group);
}

function normalizeState(state: GameState) {
  if (typeof state.lastRollAllowsExtraTurn !== "boolean") {
    state.lastRollAllowsExtraTurn = rolledDoubleFromDetail(state);
  }
  if (typeof state.rollCount !== "number") {
    state.rollCount = 0;
  }
  state.players.forEach((player) => {
    player.inJail ??= false;
    player.jailAttempts ??= 0;
  });
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
    return { amount: scale[owned] || 25, desc: `${owned} مطار مملوك` };
  }
  if (tile.type === "util") {
    const owned = TILES.filter((t) => t.type === "util" && state.ownedBy[t.name] === ownerId).length;
    const rollTotal = state.lastRollDetail ? state.lastRollDetail.d1 + state.lastRollDetail.d2 : roll;
    const multiplier = owned >= 2 ? HAGZ_PAIR_MULTIPLIER : HAGZ_SINGLE_MULTIPLIER;
    return {
      amount: multiplier * rollTotal,
      desc: owned >= 2
        ? `الحجزين مع نفس المالك (×${HAGZ_PAIR_MULTIPLIER} مجموع النرد ${rollTotal})`
        : `حجز واحد مع المالك (×${HAGZ_SINGLE_MULTIPLIER} مجموع النرد ${rollTotal})`,
    };
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

function sendPlayerToJail(state: GameState, player: Player, reason: string) {
  player.pos = JAIL_INDEX;
  player.inJail = true;
  player.jailAttempts = 0;
  state.lastRollAllowsExtraTurn = false;
  state.pendingTileIndex = null;
  log(state, `🚔 ${player.name} ${reason} وراح السجن.`);
}

function goBankrupt(state: GameState, player: Player, creditorId: string | null) {
  if (player.bankrupt) return;
  player.bankrupt = true;
  player.inJail = false;
  player.jailAttempts = 0;
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
  state.lastRollAllowsExtraTurn = false;
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

  if (tile.type === "toktok") {
    state.pendingTileIndex = tileIndex;
    state.turnPhase = "awaiting_toktok_choice";
    return;
  }

  if (tile.index === GO_TO_JAIL_INDEX) {
    sendPlayerToJail(state, player, "اتقبض عليه");
    advanceTurn(state);
    return;
  }

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
      log(state, `${player.name} دفع ${rent.amount} جنيه إيجار لـ ${owner.name} (${tile.displayName ?? tile.name}). ${rent.desc}`);
      state.turnPhase = "awaiting_rent_ack";
      return;
    }
    log(state, `${player.name} على أرضه — آمن!`);
    state.turnPhase = "player_turn";
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
      sendPlayerToJail(state, player, "اتسحب بكارت الشرطة");
      state.turnPhase = "awaiting_event_ack";
      return;
    }
    // block — needs a target choice after the card is acknowledged
    state.turnPhase = "awaiting_event_ack";
    return;
  }

  // corner / start — no effect beyond the GO bonus already applied on move
  state.turnPhase = rolledDouble(state) ? "awaiting_roll" : "player_turn";
  if (state.turnPhase !== "awaiting_roll") {
    advanceTurn(state);
  }
}

// ----------------------------------------------------------------------------
// The reducer — the ONLY way game state changes. Server calls this; nothing
// else is allowed to mutate a GameState directly.
// ----------------------------------------------------------------------------

export function applyAction(prevState: GameState, action: GameAction, rng: () => number = Math.random): GameState {
  const state: GameState = structuredClone(prevState);
  normalizeState(state);
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
      state.rollCount = (state.rollCount || 0) + 1;
      const isDouble = d1 === d2;

      if (actor.inJail) {
        state.lastRollAllowsExtraTurn = false;

        if (isDouble) {
          actor.inJail = false;
          actor.jailAttempts = 0;
          log(state, `${actor.name} رمى ${d1}+${d2} وطلع من السجن لأنه جاب نفس الرقم.`);
        } else if (actor.jailAttempts + 1 >= FREE_ON_JAIL_ATTEMPT) {
          actor.inJail = false;
          actor.jailAttempts = 0;
          log(state, `${actor.name} رمى ${d1}+${d2} وخرج من السجن في المحاولة التالتة.`);
        } else {
          actor.jailAttempts += 1;
          log(state, `${actor.name} رمى ${d1}+${d2} ولسه في السجن. المحاولة ${actor.jailAttempts} من 2.`);
          advanceTurn(state);
          return state;
        }
      } else {
        state.lastRollAllowsExtraTurn = isDouble;
      }

      const oldPos = actor.pos;
      const newPos = (actor.pos + total) % TILES.length;
      if (newPos <= oldPos && oldPos !== 0) {
        actor.coins += GO_BONUS;
        log(state, `${actor.name} فات على الانطلاق — +${GO_BONUS} جنيه!`);
      }
      actor.pos = newPos;
      const destinationLabel = TILES[newPos].displayName ?? TILES[newPos].name;
      log(state, `${actor.name} رمى ${d1}+${d2}=${total} وتحرك لـ ${destinationLabel}`);
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
      log(state, `${actor.name} اشترى ${tile.displayName ?? tile.name} بـ ${tile.price} جنيه!`);
      state.pendingTileIndex = null;
      state.turnPhase = rolledDouble(state) ? "awaiting_roll" : "player_turn";
      return state;
    }

    case "SKIP_PURCHASE": {
      if (state.turnPhase !== "awaiting_buy_decision" || currentPlayer(state).id !== actor.id) return state;
      state.pendingTileIndex = null;
      state.turnPhase = rolledDouble(state) ? "awaiting_roll" : "player_turn";
      return state;
    }

    case "SELL_PROPERTY": {
      if (currentPlayer(state).id !== actor.id) return state;
      const tile = tileByName(action.tileName) as PropertyTile | RailOrUtilTile;
      if (state.ownedBy[tile.name] !== actor.id) return state;
      if (tile.type === "prop" && groupHasBuildings(state, tile.group)) return state;

      const refund = Math.floor(tile.price / 2);
      actor.coins += refund;
      delete state.ownedBy[tile.name];
      actor.props = actor.props.filter((name) => name !== tile.name);
      log(state, `${actor.name} باع ${tile.displayName ?? tile.name} بمبلغ ${refund} جنيه!`);
      return state;
    }

    case "TRADE_PROPERTY": {
      const tile = tileByName(action.tileName) as PropertyTile | RailOrUtilTile;
      if (state.ownedBy[tile.name] !== actor.id) return state;
      if (tile.type === "prop" && groupHasBuildings(state, tile.group)) return state;

      const target = state.players.find((p) => p.id === action.targetPlayerId);
      if (!target || target.bankrupt || target.id === actor.id) return state;

      const cash = Math.max(0, Math.floor(action.cash));
      if (target.coins < cash) return state;

      state.ownedBy[tile.name] = target.id;
      actor.props = actor.props.filter((name) => name !== tile.name);
      target.props.push(tile.name);
      actor.coins += cash;
      target.coins -= cash;
      log(state, `${actor.name} باع ${tile.displayName ?? tile.name} لـ ${target.name} بمبلغ ${cash} جنيه.`);
      return state;
    }

    case "REQUEST_TRADE": {
      const target = state.players.find((p) => p.id === action.targetPlayerId);
      if (!target || target.bankrupt || target.id === actor.id) return state;

      const giveTileNames = [...new Set(action.giveTileNames ?? [])];
      const takeTileNames = [...new Set(action.takeTileNames ?? [])];
      const giveCash = Math.max(0, Math.floor(action.giveCash ?? 0));
      const takeCash = Math.max(0, Math.floor(action.takeCash ?? 0));

      if (giveTileNames.some((name) => state.ownedBy[name] !== actor.id)) return state;
      if (takeTileNames.some((name) => state.ownedBy[name] !== target.id)) return state;
      if (giveTileNames.some((name) => takeTileNames.includes(name))) return state;
      if ([...giveTileNames, ...takeTileNames].some((name) => tileLockedByGroupBuildings(state, name))) return state;
      if (actor.coins < giveCash || target.coins < takeCash) return state;

      state.pendingTrade = {
        playerId: actor.id,
        targetPlayerId: target.id,
        giveTileNames,
        takeTileNames,
        giveCash,
        takeCash,
      };
      state.turnPhase = "player_turn";
      log(state, `${actor.name} طلب تجارة مع ${target.name}. بانتظار موافقة ${target.name}.`);
      return state;
    }

    case "ACCEPT_TRADE": {
      if (!state.pendingTrade || state.pendingTrade.targetPlayerId !== actor.id) return state;

      const { playerId: sellerId, targetPlayerId, giveTileNames, takeTileNames, giveCash, takeCash } = state.pendingTrade;
      const seller = state.players.find((p) => p.id === sellerId);
      const target = state.players.find((p) => p.id === targetPlayerId);
      if (!seller || !target || seller.bankrupt || target.bankrupt) return state;

      if (giveTileNames.some((name) => state.ownedBy[name] !== sellerId)) return state;
      if (takeTileNames.some((name) => state.ownedBy[name] !== targetPlayerId)) return state;
      if ([...giveTileNames, ...takeTileNames].some((name) => tileLockedByGroupBuildings(state, name))) return state;
      if (seller.coins < giveCash || target.coins < takeCash) return state;

      giveTileNames.forEach((tileName) => {
        state.ownedBy[tileName] = targetPlayerId;
        seller.props = seller.props.filter((name) => name !== tileName);
        if (!target.props.includes(tileName)) target.props.push(tileName);
      });

      takeTileNames.forEach((tileName) => {
        state.ownedBy[tileName] = sellerId;
        target.props = target.props.filter((name) => name !== tileName);
        if (!seller.props.includes(tileName)) seller.props.push(tileName);
      });

      seller.coins -= giveCash;
      seller.coins += takeCash;
      target.coins -= takeCash;
      target.coins += giveCash;

      log(state, `${target.name} وافق على التجارة مع ${seller.name}.`);
      state.pendingTrade = null;
      return state;
    }

    case "REJECT_TRADE": {
      if (!state.pendingTrade || state.pendingTrade.targetPlayerId !== actor.id) return state;
      const sender = state.players.find((p) => p.id === state.pendingTrade?.playerId);
      log(state, `${actor.name} رفض عرض التجارة من ${sender?.name ?? "لاعب"}.`);
      state.pendingTrade = null;
      return state;
    }

    case "PAY_JAIL_FINE": {
      if (state.turnPhase !== "awaiting_roll" || currentPlayer(state).id !== actor.id) return state;
      if (!actor.inJail || actor.coins < JAIL_FINE) return state;
      actor.coins -= JAIL_FINE;
      actor.inJail = false;
      actor.jailAttempts = 0;
      state.lastRollAllowsExtraTurn = false;
      log(state, `${actor.name} دفع ${JAIL_FINE} جنيه وخرج من السجن. يقدر يرمي النرد دلوقتي.`);
      return state;
    }

    case "USE_TOKTOK": {
      if (state.turnPhase !== "awaiting_toktok_choice" || state.pendingTileIndex === null) return state;
      if (currentPlayer(state).id !== actor.id) return state;
      if (actor.coins < 50) return state;

      const targetIndex = action.targetIndex;
      if (targetIndex < 0 || targetIndex >= TILES.length) return state;

      actor.coins -= 50;
      actor.pos = targetIndex;
      state.pendingTileIndex = null;
      const tokTokTargetLabel = TILES[targetIndex].displayName ?? TILES[targetIndex].name;
      log(state, `${actor.name} استخدم توكتوك ودفع 50 جنيه وذهب لـ ${tokTokTargetLabel}`);
      resolveLanding(state, targetIndex);
      return state;
    }

    case "SKIP_TOKTOK": {
      if (state.turnPhase !== "awaiting_toktok_choice" || state.pendingTileIndex === null) return state;
      if (currentPlayer(state).id !== actor.id) return state;

      state.pendingTileIndex = null;
      log(state, `${actor.name} تخطى توكتوك وراح في دوره.`);
      state.turnPhase = rolledDouble(state) ? "awaiting_roll" : "player_turn";
      return state;
    }

    case "ACK_RENT": {
      if (state.turnPhase !== "awaiting_rent_ack" || currentPlayer(state).id !== actor.id) return state;
      state.turnPhase = rolledDouble(state) ? "awaiting_roll" : "player_turn";
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
      if (ev?.type === "jail") {
        advanceTurn(state);
        return state;
      }
      state.turnPhase = rolledDouble(state) ? "awaiting_roll" : "player_turn";
      return state;
    }

    case "END_TURN": {
      if (currentPlayer(state).id !== actor.id) return state;
      const allowedPhases: TurnPhase[] = [
        "player_turn",
        "awaiting_buy_decision",
        "awaiting_toktok_choice",
        "awaiting_rent_ack",
        "awaiting_event_ack",
        "awaiting_block_target",
      ];
      if (!allowedPhases.includes(state.turnPhase)) return state;

      if (state.turnPhase === "awaiting_buy_decision" && state.pendingTileIndex !== null) {
        log(state, `${actor.name} انتهى وقته أو تخطى الشراء وأنهى دوره.`);
      }

      state.pendingTileIndex = null;
      state.pendingEvent = null;
      advanceTurn(state);
      return state;
    }

    case "CHOOSE_BLOCK_TARGET": {
      if (state.turnPhase !== "awaiting_block_target" || currentPlayer(state).id !== actor.id) return state;
      const target = state.players.find((p) => p.id === action.targetPlayerId);
      if (!target || target.bankrupt || target.id === actor.id) return state;
      target.skipTurns += 1;
      log(state, `🚫 ${actor.name} حظر ${target.name} لدورة واحدة!`);
      state.turnPhase = rolledDouble(state) ? "awaiting_roll" : "player_turn";
      return state;
    }

    case "BUILD_HOUSE": {
      if (currentPlayer(state).id !== actor.id) return state;
      const tile = tileByName(action.tileName);
      if (tile.type !== "prop") return state;
      if (state.ownedBy[tile.name] !== actor.id) return state;
      if (!hasMonopoly(state, actor.id, tile.group)) return state;
      const cost = GROUPS[tile.group].houseCost;
      const level = state.houses[tile.name] || 0;
      if (actor.coins < cost || level >= 5) return state;
      actor.coins -= cost;
      state.houses[tile.name] = level + 1;
      log(state, `🏠 ${actor.name} بنى على ${tile.displayName ?? tile.name} (مستوى ${level + 1})`);
      return state;
    }

    case "SELL_HOUSE": {
      if (currentPlayer(state).id !== actor.id) return state;
      const tile = tileByName(action.tileName);
      if (tile.type !== "prop") return state;
      if (state.ownedBy[tile.name] !== actor.id) return state;
      const level = state.houses[tile.name] || 0;
      if (level <= 0) return state;
      const refund = Math.floor(GROUPS[tile.group].houseCost / 2);
      actor.coins += refund;
      state.houses[tile.name] = level - 1;
      log(state, `${actor.name} باع ${level === 5 ? "الفندق" : "بيت"} من ${tile.displayName ?? tile.name} واسترد ${refund} جنيه.`);
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
