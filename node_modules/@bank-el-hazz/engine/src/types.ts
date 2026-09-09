// ============================================================================
// Core types. No React, no Socket.io, no HTML — this file describes the game
// and nothing else. Anything that imports this file can run in a browser,
// on a server, or on a phone.
// ============================================================================

export type TileType = "start" | "prop" | "rail" | "util" | "event" | "corner";

export interface PropertyTile {
  index: number;
  name: string;
  type: "prop";
  group: string;
  price: number;
}

export interface RailOrUtilTile {
  index: number;
  name: string;
  type: "rail" | "util";
  price: number;
}

export interface EventTile {
  index: number;
  name: string;
  type: "event";
  pool: "luck" | "chest";
}

export interface SimpleTile {
  index: number;
  name: string;
  type: "start" | "corner";
}

export type Tile = PropertyTile | RailOrUtilTile | EventTile | SimpleTile;

export type GameEventType = "coins" | "jail" | "block";

export interface GameEventCard {
  id: string;
  icon: string;
  title: string;
  effect: string;
  type: GameEventType;
  coins?: number;
}

export interface Player {
  id: string;          // socket id — stable per connection
  name: string;
  isAI: boolean;
  coins: number;
  pos: number;
  props: string[];      // tile names owned
  bankrupt: boolean;
  skipTurns: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  ownedBy: Record<string, string>;   // tileName -> playerId
  houses: Record<string, number>;    // tileName -> 0..5 (5 = hotel)
  lastRoll: number;
  lastRollDetail: { d1: number; d2: number } | null;
  turnPhase: TurnPhase;
  pendingTileIndex: number | null;   // tile awaiting a decision (buy prompt, etc.)
  pendingEvent: GameEventCard | null;
  winnerId: string | null;
  log: string[];                     // recent human-readable events, newest first
}

// A finite state machine for "what is the game waiting on right now".
// The UI reads this to decide which modal (if any) to show; it never
// invents its own notion of game phase.
export type TurnPhase =
  | "awaiting_roll"
  | "moving"
  | "awaiting_buy_decision"
  | "awaiting_event_ack"
  | "awaiting_rent_ack"
  | "awaiting_bankrupt_ack"
  | "awaiting_block_target"
  | "game_over";

// Actions a client can send. The server is the only place that decides
// whether an action is legal — clients just express intent.
export type GameAction =
  | { type: "ROLL_DICE"; playerId: string }
  | { type: "BUY_PROPERTY"; playerId: string }
  | { type: "SKIP_PURCHASE"; playerId: string }
  | { type: "ACK_EVENT"; playerId: string }
  | { type: "ACK_RENT"; playerId: string }
  | { type: "ACK_BANKRUPT"; playerId: string }
  | { type: "CHOOSE_BLOCK_TARGET"; playerId: string; targetPlayerId: string }
  | { type: "BUILD_HOUSE"; playerId: string; tileName: string }
  | { type: "DECLARE_BANKRUPTCY"; playerId: string };
