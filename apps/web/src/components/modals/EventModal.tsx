import type { GameState, GameAction } from "@bank-el-hazz/engine";

interface EventModalProps {
  gameState: GameState;
  myId: string | undefined;
  isMyTurn: boolean;
  dispatch: (action: GameAction) => void;
  inline?: boolean;
}

export default function EventModal({ gameState, myId, isMyTurn, dispatch, inline = false }: EventModalProps) {
  const ev = gameState.pendingEvent;
  if (!ev) return null;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const content = (
    <div className={inline ? "board-inline-panel" : "modal"} style={{ textAlign: "center" }}>
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
  );

  if (inline) return content;

  return (
    <div className="overlay open">
      {content}
    </div>
  );
}
