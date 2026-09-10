import { TILES, rentBase } from "@bank-el-hazz/engine";
import type { GameState, GameAction, PropertyTile, RailOrUtilTile } from "@bank-el-hazz/engine";

interface BuyModalProps {
  gameState: GameState;
  myId: string | undefined;
  isMyTurn: boolean;
  dispatch: (action: GameAction) => void;
}

export default function BuyModal({ gameState, myId, isMyTurn, dispatch }: BuyModalProps) {
  if (gameState.pendingTileIndex === null) return null;
  const tile = TILES[gameState.pendingTileIndex] as PropertyTile | RailOrUtilTile;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  let rentText: string;
  if (tile.type === "rail") rentText = "١ = ٢٥ · ٢ = ٥٠ · ٣ = ١٠٠ · ٤ = ٢٠٠ جنيه";
  else if (tile.type === "util") rentText = "مرفق واحد = ×٤ النرد · الاتنين = ×١٠ النرد";
  else rentText = `${rentBase(tile)} جنيه (يتضاعف مع الاحتكار الكامل)`;

  const canAfford = currentPlayer.coins >= tile.price;

  return (
    <div className="overlay open">
      <div className="modal">
        <div className="modal-title">{tile.name}</div>
        <div className="modal-sub">{"group" in tile ? tile.group : ""} · عقار للبيع</div>
        <div className="modal-price">💰 <span>{tile.price.toLocaleString()}</span> جنيه</div>
        <div className="info-row"><span>الإيجار</span><strong>{rentText}</strong></div>
        <div className="info-row"><span>رصيد {currentPlayer.name}</span><strong>{currentPlayer.coins.toLocaleString()} جنيه</strong></div>
        <div className="info-row"><span>الرصيد بعد الشراء</span><strong>{(currentPlayer.coins - tile.price).toLocaleString()} جنيه</strong></div>

        {isMyTurn && myId ? (
          <div className="modal-btns">
            <button className="btn-buy" disabled={!canAfford} onClick={() => dispatch({ type: "BUY_PROPERTY", playerId: myId })}>
              {canAfford ? "🏠 اشتري" : "❌ فلوسك مش كفاية"}
            </button>
            <button className="btn-skip" onClick={() => dispatch({ type: "SKIP_PURCHASE", playerId: myId })}>
              تخطي
            </button>
          </div>
        ) : (
          <div className="waiting-note">⏳ في انتظار قرار {currentPlayer.name}...</div>
        )}
      </div>
    </div>
  );
}
