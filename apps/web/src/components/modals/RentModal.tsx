import type { GameState, GameAction } from "@bank-el-hazz/engine";

interface RentModalProps {
  gameState: GameState;
  myId: string | undefined;
  isMyTurn: boolean;
  dispatch: (action: GameAction) => void;
  inline?: boolean;
}

export default function RentModal({ gameState, myId, isMyTurn, dispatch, inline = false }: RentModalProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const content = (
    <div className={inline ? "board-inline-panel" : "modal"} style={{ textAlign: "center" }}>
      <div style={{ fontSize: 46, marginBottom: 10 }}>🏠</div>
      <div className="modal-title">إيجار!</div>
      <div className="modal-sub" style={{ fontSize: 14, color: "#e07a6f" }}>
        {gameState.log[0] || "لازم يدفع إيجار"}
      </div>
      {isMyTurn && myId ? (
        <button className="btn-ok" onClick={() => dispatch({ type: "ACK_RENT", playerId: myId })}>
          تابع ←
        </button>
      ) : (
        <div className="waiting-note">⏳ دور {currentPlayer.name}...</div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="overlay open">
      {content}
    </div>
  );
}
