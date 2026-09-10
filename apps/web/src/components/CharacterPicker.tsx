import { PLAYER_COLORS } from "@bank-el-hazz/engine";
import type { PlayerColor } from "@bank-el-hazz/engine";

interface CharacterPickerProps {
  takenColors?: PlayerColor[]; // colors already used by other players, if known
  onConfirm: (color: PlayerColor) => void;
  onBack: () => void;
}

export default function CharacterPicker({ takenColors = [], onConfirm, onBack }: CharacterPickerProps) {
  return (
    <div className="screen-center">
      <div className="card">
        <div className="brand-title" style={{ fontSize: 22 }}>اختار شخصيتك</div>
        <div className="brand-subtitle">اختار اللون اللي هيميزك في اللعبة</div>

        <div className="color-grid">
          {PLAYER_COLORS.map((c) => {
            const taken = takenColors.includes(c.key);
            return (
              <button
                key={c.key}
                className="color-swatch-btn"
                disabled={taken}
                onClick={() => onConfirm(c.key)}
                title={taken ? `${c.label} — متاخد` : c.label}
              >
                <span className="color-swatch" style={{ background: c.hex }} />
                <span className="color-label">{c.label}</span>
                {taken && <span className="color-taken-note">متاخد</span>}
              </button>
            );
          })}
        </div>

        <button className="btn-secondary" onClick={onBack} style={{ marginTop: 8 }}>
          ← رجوع
        </button>
      </div>
    </div>
  );
}
