import type { GameState, GameAction } from "@bank-el-hazz/engine";

interface EventModalProps {
  gameState: GameState;
  myId: string | undefined;
  isMyTurn: boolean;
  dispatch: (action: GameAction) => void;
}

export default function EventModal({ gameState, myId, isMyTurn, dispatch }: EventModalProps) {
  const ev = gameState.pendingEvent;
  if (!ev) return null;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="overlay open">
      <div className="modal" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 46, marginBottom: 10 }}>{ev.icon}</div>
        <div className="modal-title">{ev.title}</div>
        <div className="modal-sub" style={{ fontSize: 14 }}>{ev.effect}</div>
        {isMyTurn && myId ? (
          <button className="btn-ok" onClick={() => dispatch({ type: "ACK_EVENT", playerId: myId })}>
            تابع ←
          </button>
        ) : (
          <div className="waiting-note">⏳ دور {currentPlayer.name}...</div>
        )}
      </div>
    </div>
  );
}
