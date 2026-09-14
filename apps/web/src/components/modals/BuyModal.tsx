import { TILES, rentBase } from "@bank-el-hazz/engine";
import type { GameState, GameAction, PropertyTile, RailOrUtilTile } from "@bank-el-hazz/engine";

const GROUP_LABELS: Record<string, string> = {
  Egypt: "مصر",
  Spain: "إسبانيا",
  China: "الصين",
  "Saudi Arabia": "السعودية",
  Qatar: "قطر",
  Germany: "ألمانيا",
  France: "فرنسا",
  Italy: "إيطاليا",
};

interface BuyModalProps {
  gameState: GameState;
  myId: string | undefined;
  isMyTurn: boolean;
  dispatch: (action: GameAction) => void;
  inline?: boolean;
}

export default function BuyModal({ gameState, myId, isMyTurn, dispatch, inline = false }: BuyModalProps) {
  if (gameState.pendingTileIndex === null) return null;
  const tile = TILES[gameState.pendingTileIndex] as PropertyTile | RailOrUtilTile;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const tileLabel = tile.displayName ?? tile.name;
  const groupLabel = "group" in tile ? GROUP_LABELS[tile.group] ?? tile.group : "";

  let rentText: string;
  if (tile.type === "rail") rentText = "١ = ٢٥ · ٢ = ٥٠ · ٣ = ١٠٠ · ٤ = ٢٠٠ جنيه";
  else if (tile.type === "util") rentText = "حجز واحد = ٨ × مجموع النرد · الحجزين = ١٦ × مجموع النرد";
  else rentText = `${rentBase(tile)} جنيه (يتضاعف مع الاحتكار الكامل)`;

  const canAfford = currentPlayer.coins >= tile.price;

  const content = (
    <div className={inline ? "board-inline-panel" : "modal"}>
      <div className="modal-title">{tileLabel}</div>
      <div className="modal-sub">{groupLabel ? `عقار للبيع · ${groupLabel}` : "عقار للبيع"}</div>
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
  );

  if (inline) return content;

  return (
    <div className="overlay open">
      {content}
    </div>
  );
}
