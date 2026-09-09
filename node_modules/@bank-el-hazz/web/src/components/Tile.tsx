import type { Tile as TileData } from "@bank-el-hazz/engine";
import { GROUPS } from "@bank-el-hazz/engine";

interface TileProps {
  tile: TileData;
  ownerColor: string | null;
  houses: number; // 0-4 = houses, 5 = hotel
  tokenColors: string[]; // colors of players currently standing here
  onClick?: () => void;
}

function tileIcon(tile: TileData): string {
  if (tile.type === "start") return "🚀";
  if (tile.type === "rail") return "🚄";
  if (tile.type === "util") return tile.name.includes("كهرباء") ? "💡" : "🚰";
  if (tile.type === "event") return tile.pool === "luck" ? "🎲" : "🎁";
  if (tile.name === "اذهب للسجن") return "🚔";
  if (tile.name === "استراحة") return "☕";
  if (tile.type === "corner") return "⛓️";
  return "";
}

export default function Tile({ tile, ownerColor, houses, tokenColors, onClick }: TileProps) {
  const groupColor = tile.type === "prop" ? GROUPS[tile.group]?.color : undefined;

  return (
    <div
      className={`tile tile-${tile.type}`}
      onClick={onClick}
      style={ownerColor ? { boxShadow: `inset 0 -5px 0 ${ownerColor}, 0 0 0 1px ${ownerColor}aa` } : undefined}
    >
      {groupColor && <div className="tile-group-strip" style={{ background: groupColor }} />}
      {tile.type !== "start" && tile.type !== "prop" && <span className="tile-ic">{tileIcon(tile)}</span>}
      <div className="tile-name">{tile.name}</div>
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
