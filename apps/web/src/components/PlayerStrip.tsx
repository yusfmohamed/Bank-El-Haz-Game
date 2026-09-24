import { colorHex, playerAvatar } from "@bank-el-hazz/engine";
import type { GameState } from "@bank-el-hazz/engine";

interface PlayerStripProps {
  gameState: GameState;
  myId: string | undefined;
}

export default function PlayerStrip({ gameState, myId }: PlayerStripProps) {
  return (
    <div className="player-strip">
      {gameState.players.map((p, i) => {
        const hex = colorHex(p.color);
        return (
          <div
            key={p.id}
            className={`p-card ${i === gameState.currentPlayerIndex && !p.bankrupt ? "p-card-active" : ""}`}
            style={p.bankrupt ? { opacity: 0.45 } : undefined}
          >
            <div className="p-avatar" style={{ border: `2.5px solid ${hex}`, background: `${hex}22` }}>
              <img src={playerAvatar(p.color)} alt={p.name} className="p-avatar-img" />
              {p.bankrupt && <span className="p-avatar-badge" title="مفلس">💸</span>}
              {!p.bankrupt && !p.connected && <span className="p-avatar-badge" title="مقطوع">🔌</span>}
            </div>
            <div>
              <div className="p-name">
                {p.name} {p.id === myId && <span className="p-you">(انت)</span>}
              </div>
              <div className="p-coins">
                {p.bankrupt ? "مفلس" : !p.connected ? "مقطوع..." : `${p.coins.toLocaleString()} ج`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
