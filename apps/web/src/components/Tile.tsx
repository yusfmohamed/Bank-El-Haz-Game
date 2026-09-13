import type { Tile as TileData } from "@bank-el-hazz/engine";
import { GROUPS } from "@bank-el-hazz/engine";

interface TileProps {
  tile: TileData;
  ownerColor: string | null;
  houses: number; // 0-4 = houses, 5 = hotel
  tokenColors: string[]; // colors of players currently standing here
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function tileIcon(tile: TileData): string {
  if (tile.displayName === "toktok") return "🛺";
  if (tile.type === "start") return "🚀";
  if (tile.type === "rail") return "🚄";
  if (tile.type === "util") return tile.name.includes("كهرباء") ? "💡" : "🚰";
  if (tile.type === "event") return tile.pool === "luck" ? "🎲" : "🎁";
  if (tile.name === "اذهب للسجن") return "🚔";
  if (tile.name === "استراحة") return "☕";
  if (tile.type === "corner") return "⛓️";
  return "";
}

export default function Tile({ tile, ownerColor, houses, tokenColors, selectable, selected, disabled, onClick }: TileProps) {
  const groupColor = tile.type === "prop" ? GROUPS[tile.group]?.color : undefined;
  const groupFlag = tile.type === "prop" ? GROUPS[tile.group]?.flag : undefined;
  const flagAlt = tile.type === "prop" ? `${tile.group} flag` : "";
  const displayName = tile.displayName ?? tile.name;
  const tileGraphic = tileIcon(tile);

  return (
    <div
      className={`tile tile-${tile.type} ${selectable ? "tile-selectable" : ""} ${selected ? "tile-selected" : ""} ${disabled ? "tile-disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      style={ownerColor ? { boxShadow: `inset 0 -5px 0 ${ownerColor}, 0 0 0 1px ${ownerColor}aa` } : undefined}
    >
      {groupColor && <div className="tile-group-strip" style={{ background: groupColor }} />}
      {tileGraphic && tile.type !== "start" && (tile.type !== "prop" || tile.displayName === "toktok") && (
        <span className="tile-ic">{tileGraphic}</span>
      )}
      <div className="tile-name">{displayName}</div>
      {groupFlag && tile.displayName !== "toktok" && <img src={groupFlag} alt={flagAlt} className="tile-flag" />}
      {"price" in tile && <div className="tile-price">💰{tile.price}</div>}

      {houses > 0 && (
        <div className={`tile-badge ${houses === 5 ? "tile-badge-hotel" : "tile-badge-house"}`}>
          {houses === 5 ? "🏨" : `🏠${houses}`}
        </div>
      )}

      {tokenColors.length > 0 && (
        <div className="tile-tokens">
          {tokenColors.map((c, i) => (
            <span key={i} className="tile-token" style={{ background: c }} />
          ))}
        </div>
      )}
    </div>
  );
}
