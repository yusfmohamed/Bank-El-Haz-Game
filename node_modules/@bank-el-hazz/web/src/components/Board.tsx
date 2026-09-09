import { TILES } from "@bank-el-hazz/engine";
import type { GameState } from "@bank-el-hazz/engine";
import Tile from "./Tile";

const PLAYER_COLORS = ["#f0b429", "#c0392b", "#2f7fb0", "#2fa562"];

// Start bottom-left, flow clockwise — matches the RTL board reference.
function posForIndex(i: number): { col: number; row: number } {
  if (i <= 10) return { col: i + 1, row: 11 };
  if (i <= 20) return { col: 11, row: 11 - (i - 10) };
  if (i <= 30) return { col: 11 - (i - 20), row: 1 };
  return { col: 1, row: 1 + (i - 30) };
}

interface BoardProps {
  gameState: GameState;
  onTileClick?: (index: number) => void;
}

export default function Board({ gameState, onTileClick }: BoardProps) {
  const { d1, d2 } = gameState.lastRollDetail ?? { d1: 1, d2: 1 };

  return (
    <div className="board-wrap">
      <div className="board">
        <div className="grid">
          {TILES.map((tile, i) => {
            const { col, row } = posForIndex(i);
            const ownerId = gameState.ownedBy[tile.name];
            const ownerIdx = ownerId ? gameState.players.findIndex((p) => p.id === ownerId) : -1;
            const tokenColors = gameState.players
              .filter((p) => !p.bankrupt && p.pos === i)
              .map((p) => PLAYER_COLORS[gameState.players.indexOf(p) % PLAYER_COLORS.length]);

            return (
              <div key={tile.name + i} style={{ gridColumn: col, gridRow: row }}>
                <Tile
                  tile={tile}
                  ownerColor={ownerIdx >= 0 ? PLAYER_COLORS[ownerIdx % PLAYER_COLORS.length] : null}
                  houses={gameState.houses[tile.name] || 0}
                  tokenColors={tokenColors}
                  onClick={() => onTileClick?.(i)}
                />
              </div>
            );
          })}

          <div className="board-center" style={{ gridColumn: "2 / 11", gridRow: "2 / 11" }}>
            <div className="bank-icon">
              <svg width="110" height="66" viewBox="0 0 120 72">
                <polygon points="60,4 112,26 8,26" fill="#e0c060" />
                <rect x="8" y="26" width="104" height="4" fill="#a8791c" />
                {[16, 32, 48, 64, 80, 96].map((x) => (
                  <rect key={x} x={x} y="30" width="8" height="34" fill="#f0dfa0" />
                ))}
                <rect x="10" y="64" width="100" height="6" fill="#a8791c" />
              </svg>
            </div>
            <h1 className="board-title">بنك الحظ</h1>
            <div className="board-subtitle">اللعبة المصرية اللي مليهاش آخر</div>
            <div className="dice-wrap">
              <Die value={d1} />
              <Die value={d2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PIP_LAYOUTS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function Die({ value }: { value: number }) {
  const active = new Set(PIP_LAYOUTS[value] || []);
  return (
    <div className="die">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="pip" style={{ opacity: active.has(i) ? 1 : 0 }} />
      ))}
    </div>
  );
}
