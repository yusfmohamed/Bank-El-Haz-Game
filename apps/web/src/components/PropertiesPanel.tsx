import { TILES, GROUPS, hasMonopoly, groupHasBuildings } from "@bank-el-hazz/engine";
import type { GameState, GameAction, PropertyTile } from "@bank-el-hazz/engine";

interface PropertiesPanelProps {
  gameState: GameState;
  myId: string | undefined;
  dispatch: (action: GameAction) => void;
  onClose: () => void;
}

export default function PropertiesPanel({ gameState, myId, dispatch, onClose }: PropertiesPanelProps) {
  const me = gameState.players.find((p) => p.id === myId);
  if (!me) return null;
  const playerId = me.id;

  const owned = TILES.filter((t) => gameState.ownedBy[t.name] === myId);

  return (
    <div className="overlay open">
      <div className="modal wide">
        <button className="close-btn" onClick={onClose}>✕</button>
        <div className="modal-title">🏘️ ممتلكاتك</div>
        <div className="modal-sub">لما تجمع كل عقارات المنطقة (احتكار كامل) هيفتحلك زرار البناء.</div>

        {owned.length === 0 ? (
          <div className="empty-note">لسه معكش عقارات — انزل على بلاطة فاضية واشتريها!</div>
        ) : (
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {owned.map((tile) => {
              const houses = gameState.houses[tile.name] || 0;
              const isProp = tile.type === "prop";
              const monop = isProp && myId ? hasMonopoly(gameState, myId, (tile as PropertyTile).group) : false;
              const groupColor = isProp ? GROUPS[(tile as PropertyTile).group]?.color : "#888";

              let levelText = tile.type === "rail" ? "🚄 محطة" : tile.type === "util" ? "💡 مرفق" : houses === 5 ? "🏨 فندق" : houses > 0 ? `🏠×${houses}` : "بدون بناء";

              const group = isProp ? (tile as PropertyTile).group : undefined;
              const groupLocked = isProp ? groupHasBuildings(gameState, group) : false;
              const houseCost = isProp ? GROUPS[(tile as PropertyTile).group].houseCost : 0;
              const houseRefund = Math.floor(houseCost / 2);
              const canBuild = isProp && monop && houses < 5;
              const canSellBuilding = isProp && houses > 0;

              return (
                <div key={tile.name} className="prop-row">
                  <span className="dot" style={{ background: groupColor }} />
                  <span className="pname">{tile.displayName ?? tile.name}</span>
                  <span className="plevel">{levelText}</span>
                  {isProp && (
                    <span className="property-actions">
                      {canBuild && (
                        <button
                          className="build-btn"
                          disabled={me.coins < houseCost}
                          onClick={() => dispatch({ type: "BUILD_HOUSE", playerId, tileName: tile.name })}
                        >
                          {houses === 4 ? `ابني فندق (${houseCost}ج)` : `ابني بيت (${houseCost}ج)`}
                        </button>
                      )}
                      {canSellBuilding && (
                        <button
                          className="build-btn sell-building-btn"
                          onClick={() => dispatch({ type: "SELL_HOUSE", playerId, tileName: tile.name })}
                        >
                          {houses === 5 ? `بيع الفندق (+${houseRefund}ج)` : `بيع بيت (+${houseRefund}ج)`}
                        </button>
                      )}
                      {!monop && <span className="need-monopoly-note">محتاج البلد كاملة للبناء</span>}
                      {groupLocked && <span className="need-monopoly-note">البيع والتجارة مقفولين لحد بيع المباني</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
