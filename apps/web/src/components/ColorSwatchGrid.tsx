import { PLAYER_COLORS } from "@bank-el-hazz/engine";
import type { PlayerColor } from "@bank-el-hazz/engine";

interface ColorSwatchGridProps {
  takenByOthers: PlayerColor[];
  current?: PlayerColor;
  onSelect: (color: PlayerColor) => void;
}

export default function ColorSwatchGrid({ takenByOthers, current, onSelect }: ColorSwatchGridProps) {
  return (
    <div className="color-grid">
      {PLAYER_COLORS.map((c) => {
        const taken = takenByOthers.includes(c.key);
        const selected = current === c.key;
        return (
          <button
            key={c.key}
            className={`color-swatch-btn ${selected ? "color-swatch-selected" : ""}`}
            disabled={taken}
            onClick={() => onSelect(c.key)}
            title={taken ? `${c.label} — متاخد` : c.label}
          >
            <span className="color-swatch" style={{ background: c.hex }} />
            <span className="color-label">{c.label}</span>
            {taken && <span className="color-taken-note">متاخد</span>}
            {selected && <span className="color-selected-check">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
