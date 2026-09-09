import type { GameState, GameAction } from "@bank-el-hazz/engine";
import Board from "../components/Board";
import PlayerStrip from "../components/PlayerStrip";
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

export default function GameScreen({ gameState, myId, dispatch }: GameScreenProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = !!myId && currentPlayer.id === myId;

  if (gameState.turnPhase === "game_over") {
    const winner = gameState.players.find((p) => p.id === gameState.winnerId);
    return (
      <div className="win-overlay open">
        <div className="win-card">
          <div className="win-trophy">🏆</div>
          <div className="win-title">{winner ? `${winner.name} كسب اللعبة!` : "اللعبة خلصت!"}</div>
          <div className="win-sub">كل اللاعبين التانيين فلسوا</div>
        </div>
      </div>
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
          <div className="brand-wrap">
            <div className="board-title" style={{ fontSize: 22 }}>بنك الحظ</div>
          </div>
          <div style={{ width: 46 }} />
        </div>

        <Board gameState={gameState} />

        <div className="bottombar">
          <PlayerStrip gameState={gameState} myId={myId} />
          <button
            className="roll-btn"
            disabled={!isMyTurn || gameState.turnPhase !== "awaiting_roll"}
            onClick={() => myId && dispatch({ type: "ROLL_DICE", playerId: myId })}
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

      {isMyTurn && myId && gameState.turnPhase === "awaiting_buy_decision" && (
        <BuyModal gameState={gameState} myId={myId} dispatch={dispatch} />
      )}
      {isMyTurn && myId && gameState.turnPhase === "awaiting_event_ack" && (
        <EventModal gameState={gameState} myId={myId} dispatch={dispatch} />
      )}
      {isMyTurn && myId && gameState.turnPhase === "awaiting_rent_ack" && (
        <RentModal gameState={gameState} myId={myId} dispatch={dispatch} />
      )}
      {isMyTurn && myId && gameState.turnPhase === "awaiting_bankrupt_ack" && (
        <BankruptModal gameState={gameState} myId={myId} dispatch={dispatch} />
      )}
      {isMyTurn && myId && gameState.turnPhase === "awaiting_block_target" && (
        <BlockModal gameState={gameState} myId={myId} dispatch={dispatch} />
      )}
    </div>
  );
}
