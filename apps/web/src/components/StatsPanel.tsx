import { netWorth, colorHex } from "@bank-el-hazz/engine";
import type { GameState } from "@bank-el-hazz/engine";

interface StatsPanelProps {
  gameState: GameState;
  myId: string | undefined;
  onClose: () => void;
}

export default function StatsPanel({ gameState, myId, onClose }: StatsPanelProps) {
  const ranked = [...gameState.players].sort((a, b) => netWorth(gameState, b) - netWorth(gameState, a));

  return (
    <div className="overlay open">
      <div className="modal">
        <button className="close-btn" onClick={onClose}>✕</button>
        <div className="modal-title">📊 الإحصائيات</div>
        <div className="modal-sub">صافي الثروة = الفلوس النقدية + قيمة العقارات + قيمة المباني.</div>
        <div>
          {ranked.map((p) => (
            <div key={p.id} className="stat-row">
              <div className="p-avatar" style={{ background: `${colorHex(p.color)}33`, border: `2px solid ${colorHex(p.color)}` }}>
                {p.bankrupt ? "💸" : "👤"}
              </div>
              <div className="sinfo">
                <div className="sname">{p.name} {p.id === myId && <span className="p-you">(انت)</span>}</div>
                <div className="sdetail">{p.bankrupt ? "خرج من اللعبة" : `${p.props.length} عقار · ${p.coins.toLocaleString()} جنيه كاش`}</div>
              </div>
              <div className="snet">{p.bankrupt ? "—" : `${netWorth(gameState, p).toLocaleString()} ج`}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
