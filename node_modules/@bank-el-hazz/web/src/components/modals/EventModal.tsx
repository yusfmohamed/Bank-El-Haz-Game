import type { GameState, GameAction } from "@bank-el-hazz/engine";

interface EventModalProps {
  gameState: GameState;
  myId: string;
  dispatch: (action: GameAction) => void;
}

export default function EventModal({ gameState, myId, dispatch }: EventModalProps) {
  const ev = gameState.pendingEvent;
  if (!ev) return null;

  return (
    <div className="overlay open">
      <div className="modal" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 46, marginBottom: 10 }}>{ev.icon}</div>
        <div className="modal-title">{ev.title}</div>
        <div className="modal-sub" style={{ fontSize: 14 }}>{ev.effect}</div>
        <button className="btn-ok" onClick={() => dispatch({ type: "ACK_EVENT", playerId: myId })}>
          تابع ←
        </button>
      </div>
    </div>
  );
}
