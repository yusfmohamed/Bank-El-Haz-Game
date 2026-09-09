import type { GameState, GameAction } from "@bank-el-hazz/engine";

interface BankruptModalProps {
  gameState: GameState;
  myId: string;
  dispatch: (action: GameAction) => void;
}

export default function BankruptModal({ gameState, myId, dispatch }: BankruptModalProps) {
  return (
    <div className="overlay open">
      <div className="modal" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 46, marginBottom: 10 }}>💸</div>
        <div className="modal-title">إفلاس!</div>
        <div className="modal-sub" style={{ fontSize: 14, color: "#e07a6f" }}>
          {gameState.log[0] || "لاعب فلس"}
        </div>
        <button className="btn-ok" onClick={() => dispatch({ type: "ACK_BANKRUPT", playerId: myId })}>
          تابع ←
        </button>
      </div>
    </div>
  );
}
