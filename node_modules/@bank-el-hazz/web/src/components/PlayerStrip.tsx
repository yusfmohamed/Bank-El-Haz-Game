import { colorHex } from "@bank-el-hazz/engine";
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
            <div className="p-avatar" style={{ background: `${hex}33`, border: `2px solid ${hex}` }}>
              {p.bankrupt ? "💸" : !p.connected ? "🔌" : "👤"}
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
