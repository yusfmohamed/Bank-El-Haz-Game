import { useEffect, useRef, useState } from "react";
import type { GameState, GameAction } from "@bank-el-hazz/engine";
import { clearLastRoom } from "../lib/identity";
import Board from "../components/Board";
import PlayerStrip from "../components/PlayerStrip";
import PropertiesPanel from "../components/PropertiesPanel";
import StatsPanel from "../components/StatsPanel";
import BuyModal from "../components/modals/BuyModal";
import EventModal from "../components/modals/EventModal";
import RentModal from "../components/modals/RentModal";
import BankruptModal from "../components/modals/BankruptModal";
import BlockModal from "../components/modals/BlockModal";

interface GameScreenProps {
  gameState: GameState;
  myId: string | undefined;
  dispatch: (action: GameAction) => void;
}

const ROLL_ANIM_MS = 650;

function GameOverScreen({ winnerName }: { winnerName?: string }) {
  // A finished game should never be auto-resumed into — forget it immediately.
  useEffect(() => { clearLastRoom(); }, []);

  return (
    <div className="win-overlay open">
      <div className="win-card">
        <div className="win-trophy">🏆</div>
        <div className="win-title">{winnerName ? `${winnerName} كسب اللعبة!` : "اللعبة خلصت!"}</div>
        <div className="win-sub">كل اللاعبين التانيين فلسوا</div>
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
          🎲 لعبة جديدة
        </button>
      </div>
    </div>
  );
}

export default function GameScreen({ gameState, myId, dispatch }: GameScreenProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = !!myId && currentPlayer.id === myId;

  const [panel, setPanel] = useState<"none" | "properties" | "stats">("none");

  // Dice animation: purely cosmetic, decoupled from the server round-trip.
  // We play a short random-face flicker locally the instant the button is
  // clicked, then let the real result (already broadcast by the time the
  // animation ends, on any reasonable connection) take over.
  const [rollingDice, setRollingDice] = useState<{ d1: number; d2: number } | null>(null);
  const animTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRollSeen = useRef(gameState.lastRoll);

  useEffect(() => {
    // If the server's roll total changed while we weren't the one animating
    // (e.g. we're a spectator), no animation needed — Board just shows it.
    lastRollSeen.current = gameState.lastRoll;
  }, [gameState.lastRoll]);

  function handleRoll() {
    if (!myId || !isMyTurn || gameState.turnPhase !== "awaiting_roll") return;
    dispatch({ type: "ROLL_DICE", playerId: myId });

    setRollingDice({ d1: 1, d2: 1 });
    animTimer.current = setInterval(() => {
      setRollingDice({ d1: 1 + Math.floor(Math.random() * 6), d2: 1 + Math.floor(Math.random() * 6) });
    }, 80);
    setTimeout(() => {
      if (animTimer.current) clearInterval(animTimer.current);
      setRollingDice(null);
    }, ROLL_ANIM_MS);
  }

  useEffect(() => () => { if (animTimer.current) clearInterval(animTimer.current); }, []);

  function handleExit() {
    if (!confirm("متأكد عايز تخرج؟ هترجع لصفحة البداية.")) return;
    clearLastRoom();
    window.location.reload();
  }

  if (gameState.turnPhase === "game_over") {
    const winner = gameState.players.find((p) => p.id === gameState.winnerId);
    return (
      <GameOverScreen winnerName={winner?.name} />
    );
  }

  return (
    <div className="game-screen">
      <div className="app-shell">
        <div className="topbar">
          <div className="player-chip">
            <div className="cur-avatar">{isMyTurn ? "👤" : "⏳"}</div>
            <div>
              <div className="cur-name">{currentPlayer.name}</div>
              <div className="cur-coins">💰 {currentPlayer.coins.toLocaleString()} جنيه</div>
            </div>
          </div>
          <div className="board-title" style={{ fontSize: 22 }}>بنك الحظ</div>
          <div className="topbar-right">
            <button className="icon-btn" title="الممتلكات" onClick={() => setPanel("properties")}>🏘️</button>
            <button className="icon-btn" title="الإحصائيات" onClick={() => setPanel("stats")}>📊</button>
            <button className="icon-btn" title="اخرج من اللعبة" onClick={handleExit}>🚪</button>
          </div>
        </div>

        <Board gameState={gameState} rollingDice={rollingDice} />

        <div className="bottombar">
          <PlayerStrip gameState={gameState} myId={myId} />
          <button
            className="roll-btn"
            disabled={!isMyTurn || gameState.turnPhase !== "awaiting_roll" || !!rollingDice}
            onClick={handleRoll}
          >
            🎲 رمي النرد
          </button>
        </div>

        <div className="status-strip">
          {isMyTurn
            ? gameState.turnPhase === "awaiting_roll"
              ? "دورك — ارمي النرد!"
              : "..."
            : `في انتظار ${currentPlayer.name}...`}
        </div>
      </div>

      {gameState.turnPhase === "awaiting_buy_decision" && (
        <BuyModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} />
      )}
      {gameState.turnPhase === "awaiting_event_ack" && (
        <EventModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} />
      )}
      {gameState.turnPhase === "awaiting_rent_ack" && (
        <RentModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} />
      )}
      {gameState.turnPhase === "awaiting_bankrupt_ack" && (
        <BankruptModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} />
      )}
      {gameState.turnPhase === "awaiting_block_target" && (
        <BlockModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} />
      )}

      {panel === "properties" && (
        <PropertiesPanel gameState={gameState} myId={myId} dispatch={dispatch} onClose={() => setPanel("none")} />
      )}
      {panel === "stats" && (
        <StatsPanel gameState={gameState} myId={myId} onClose={() => setPanel("none")} />
      )}
    </div>
  );
}
