import { TILES, colorHex } from "@bank-el-hazz/engine";
import type { GameState } from "@bank-el-hazz/engine";
import Tile from "./Tile";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

// Start top-left, flow clockwise around the outer ring.
function posForIndex(i: number): { col: number; row: number } {
  if (i <= 10) return { col: i + 1, row: 1 };
  if (i <= 20) return { col: 11, row: i - 10 + 1 };
  if (i <= 30) return { col: 11 - (i - 20), row: 11 };
  return { col: 1, row: 11 - (i - 30) };
}

function sideForIndex(i: number): "top" | "right" | "bottom" | "left" | "corner" {
  if (i === 0 || i === 10 || i === 20 || i === 30) return "corner";
  if (i < 10) return "top";
  if (i < 20) return "right";
  if (i < 30) return "bottom";
  return "left";
}

interface BoardProps {
  gameState: GameState;
  rollingDice?: { d1: number; d2: number } | null; // client-side animation override, while a roll is in flight
  onTileClick?: (index: number) => void;
  centerPanel?: ReactNode;
  centerControls?: ReactNode;
  displayedPositions?: Record<string, number>;
  tokTokSelectedIndex?: number | null;
}

export default function Board({ gameState, rollingDice, onTileClick, centerPanel, centerControls, displayedPositions, tokTokSelectedIndex }: BoardProps) {
  const shown = rollingDice ?? gameState.lastRollDetail ?? { d1: 1, d2: 1 };

  return (
    <div className="board-wrap">
      <div className="board">
        <div className="grid">
          {TILES.map((tile, i) => {
            const { col, row } = posForIndex(i);
            const ownerId = gameState.ownedBy[tile.name];
            const owner = ownerId ? gameState.players.find((p) => p.id === ownerId) : undefined;
            const tokenColors = gameState.players
              .filter((p) => !p.bankrupt && (displayedPositions?.[p.id] ?? p.pos) === i)
              .map((p) => colorHex(p.color));
            const tokTokActive = gameState.turnPhase === "awaiting_toktok_choice";
            const isSelectable = tokTokActive && gameState.pendingTileIndex !== null && i !== gameState.pendingTileIndex;
            const isCurrentTile = gameState.pendingTileIndex === i;
            const isSelectedTile = tokTokSelectedIndex === i;

            return (
              <div key={tile.name + i} className="tile-cell" style={{ gridColumn: col, gridRow: row }}>
                <Tile
                  tile={tile}
                  side={sideForIndex(i)}
                  ownerColor={owner ? colorHex(owner.color) : null}
                  houses={gameState.houses[tile.name] || 0}
                  tokenColors={tokenColors}
                  selectable={isSelectable}
                  selected={isCurrentTile || isSelectedTile}
                  disabled={tokTokActive && !isSelectable}
                  onClick={() => onTileClick?.(i)}
                />
              </div>
            );
          })}

          <div className={`board-center${centerPanel ? " has-panel" : ""}`} style={{ gridColumn: "2 / 11", gridRow: "2 / 11" }}>
            {centerControls && <div className="board-center-actions">{centerControls}</div>}
            <div className="board-center-brand">
              <div className="bank-icon" aria-hidden>
                <svg width="110" height="66" viewBox="0 0 120 72">
                  <polygon points="60,4 112,26 8,26" fill="#e0c060" />
                  <rect x="8" y="26" width="104" height="4" fill="#a8791c" />
                  {[16, 32, 48, 64, 80, 96].map((x) => (
                    <rect key={x} x={x} y="30" width="8" height="34" fill="#f0dfa0" />
                  ))}
                  <rect x="10" y="64" width="100" height="6" fill="#a8791c" />
                </svg>
              </div>
              <img
                // src="/assets/background.jpg"
                alt="بنك الحظ"
                className="board-logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {/* <div className="board-subtitle">اللعبة المصرية اللي مليهاش آخر</div> */}
            </div>
            {centerPanel && <div className="board-center-panel">{centerPanel}</div>}
            <div className={`dice-wrap ${rollingDice ? "dice-rolling" : ""}`}>
              <Die value={shown.d1} />
              <Die value={shown.d2} />
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

// Which cube rotation (degrees) brings each numbered face to point at the
// viewer. Opposite faces sum to 7, same as a real die: 1↔6, 2↔5, 3↔4.
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

function Pips({ n }: { n: number }) {
  const active = new Set(PIP_LAYOUTS[n] || []);
  return (
    <>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="pip" style={{ opacity: active.has(i) ? 1 : 0 }} />
      ))}
    </>
  );
}

// A real cube: 6 faces positioned in 3D space, rotated so the correct face
// points at the viewer. Works with the existing flicker-then-settle roll
// animation unchanged — every time `value` changes (including the rapid
// flicker updates while rolling) the cube smoothly re-targets its rotation,
// so a fast-changing value naturally reads as tumbling, and the final
// settled value reads as a clean landing.
function Die({ value }: { value: number }) {
  const spinsRef = useRef(0);
  const prevValueRef = useRef<number | null>(null);
  const [rot, setRot] = useState(() => FACE_ROTATION[value] ?? FACE_ROTATION[1]);

  useEffect(() => {
    if (prevValueRef.current === value) return; // don't re-spin for an unchanged value
    prevValueRef.current = value;
    spinsRef.current += 1; // keep adding turns so it always spins forward, never snaps back
    const base = FACE_ROTATION[value] ?? FACE_ROTATION[1];
    setRot({ x: base.x + spinsRef.current * 360, y: base.y + spinsRef.current * 360 });
  }, [value]);

  return (
    <div className="dice3d-scene">
      <div className="dice3d-cube" style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
        <div className="dice3d-face dice3d-front"><Pips n={1} /></div>
        <div className="dice3d-face dice3d-back"><Pips n={6} /></div>
        <div className="dice3d-face dice3d-right"><Pips n={2} /></div>
        <div className="dice3d-face dice3d-left"><Pips n={5} /></div>
        <div className="dice3d-face dice3d-top"><Pips n={3} /></div>
        <div className="dice3d-face dice3d-bottom"><Pips n={4} /></div>
      </div>
    </div>
  );
}