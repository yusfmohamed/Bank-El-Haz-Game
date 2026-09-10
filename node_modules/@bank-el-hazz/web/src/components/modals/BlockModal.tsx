import type { GameState, GameAction } from "@bank-el-hazz/engine";

interface BlockModalProps {
  gameState: GameState;
  myId: string | undefined;
  isMyTurn: boolean;
  dispatch: (action: GameAction) => void;
}

export default function BlockModal({ gameState, myId, isMyTurn, dispatch }: BlockModalProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  if (!isMyTurn || !myId) {
    return (
      <div className="overlay open">
        <div className="modal" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚫</div>
          <div className="modal-title">كارت حظر!</div>
          <div className="waiting-note">⏳ {currentPlayer.name} بيختار حد يحظره...</div>
        </div>
      </div>
    );
  }

  const targets = gameState.players.filter((p) => p.id !== myId && !p.bankrupt);

  return (
    <div className="overlay open">
      <div className="modal" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🚫</div>
        <div className="modal-title">اختار لاعب تحظره!</div>
        <div className="modal-sub">هيقعد دورة كاملة من غير ما يلعب.</div>
        {targets.map((t) => (
          <button
            key={t.id}
            className="block-target-btn"
            onClick={() => dispatch({ type: "CHOOSE_BLOCK_TARGET", playerId: myId, targetPlayerId: t.id })}
          >
            {t.name} <span style={{ opacity: 0.8 }}>({t.coins.toLocaleString()} ج)</span>
          </button>
        ))}
      </div>
    </div>
  );
}
