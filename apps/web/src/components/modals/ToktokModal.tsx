import { TILES } from "@bank-el-hazz/engine";
import type { GameAction, GameState } from "@bank-el-hazz/engine";

interface ToktokModalProps {
  gameState: GameState;
  myId: string | undefined;
  isMyTurn: boolean;
  dispatch: (action: GameAction) => void;
}

export default function ToktokModal({ gameState, myId, isMyTurn, dispatch }: ToktokModalProps) {
  if (gameState.pendingTileIndex === null) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentTile = TILES[gameState.pendingTileIndex];
  const canAfford = currentPlayer.coins >= 50;

  return (
    <div className="overlay open">
      <div className="modal wide">
        <div className="modal-title">🛺 توكتوك</div>
        <div className="modal-sub">
          {currentTile.displayName ?? currentTile.name} · ادفع 50 جنيه واختر أي مكان تروحله.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(120px, 1fr))", gap: 8, marginTop: 14 }}>
          {TILES.filter((tile) => tile.index !== currentTile.index).map((tile) => (
            <button
              key={tile.index}
              className="block-target-btn"
              style={{ marginBottom: 0 }}
              disabled={!canAfford || !isMyTurn || !myId}
              onClick={() => myId && dispatch({ type: "USE_TOKTOK", playerId: myId, targetIndex: tile.index })}
            >
              {tile.displayName ?? tile.name}
            </button>
          ))}
        </div>

        <div className="info-row" style={{ marginTop: 16 }}>
          <span>رصيدك الحالي</span>
          <strong>{currentPlayer.coins.toLocaleString()} جنيه</strong>
        </div>
        <div className="info-row">
          <span>الرصيد بعد الاستخدام</span>
          <strong>{Math.max(0, currentPlayer.coins - 50).toLocaleString()} جنيه</strong>
        </div>

        {!canAfford && (
          <div className="waiting-note" style={{ color: "#e07a6f" }}>
            ❌ مش عندك 50 جنيه عشان تستخدم التوكتوك.
          </div>
        )}
      </div>
    </div>
  );
}
