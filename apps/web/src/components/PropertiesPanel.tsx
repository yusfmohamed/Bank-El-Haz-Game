import { TILES, GROUPS, hasMonopoly } from "@bank-el-hazz/engine";
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

              let action = null;
              if (isProp && monop && houses < 5 && myId) {
                const cost = GROUPS[(tile as PropertyTile).group].houseCost;
                const label = houses === 4 ? `فندق (${cost}ج)` : `+ بيت (${cost}ج)`;
                action = (
                  <button
                    className="build-btn"
                    disabled={me.coins < cost}
                    onClick={() => dispatch({ type: "BUILD_HOUSE", playerId: myId, tileName: tile.name })}
                  >
                    {label}
                  </button>
                );
              } else if (isProp && !monop) {
                action = <span className="need-monopoly-note">محتاج تجمع المنطقة كلها</span>;
              }

              return (
                <div key={tile.name} className="prop-row">
                  <span className="dot" style={{ background: groupColor }} />
                  <span className="pname">{tile.name}</span>
                  <span className="plevel">{levelText}</span>
                  {action}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
