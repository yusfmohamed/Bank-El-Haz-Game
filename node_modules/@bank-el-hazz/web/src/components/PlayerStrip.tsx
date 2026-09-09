import type { GameState } from "@bank-el-hazz/engine";

const PLAYER_COLORS = ["#f0b429", "#c0392b", "#2f7fb0", "#2fa562"];
const AVATARS = ["👤", "🧑", "🧕", "👨"];

interface PlayerStripProps {
  gameState: GameState;
  myId: string | undefined;
}

export default function PlayerStrip({ gameState, myId }: PlayerStripProps) {
  return (
    <div className="player-strip">
      {gameState.players.map((p, i) => (
        <div
          key={p.id}
          className={`p-card ${i === gameState.currentPlayerIndex && !p.bankrupt ? "p-card-active" : ""}`}
          style={p.bankrupt ? { opacity: 0.45 } : undefined}
        >
          <div className="p-avatar" style={{ background: `${PLAYER_COLORS[i]}22`, border: `2px solid ${PLAYER_COLORS[i]}` }}>
            {p.bankrupt ? "💸" : AVATARS[i % AVATARS.length]}
          </div>
          <div>
            <div className="p-name">
              {p.name} {p.id === myId && <span className="p-you">(انت)</span>}
            </div>
            <div className="p-coins">{p.bankrupt ? "مفلس" : `${p.coins.toLocaleString()} ج`}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
