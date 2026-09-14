import type { Tile as TileData } from "@bank-el-hazz/engine";
import { GROUPS } from "@bank-el-hazz/engine";
import type { CSSProperties } from "react";

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
  if (tile.displayName === "toktok" || tile.type === "toktok") return "🛺";
  if (tile.type === "start") return "🚀";
  if (tile.type === "rail") return "🚄";
  if (tile.type === "util") return tile.name.includes("كهرباء") ? "💡" : "🚰";
  if (tile.type === "event") return tile.pool === "luck" ? "🎲" : "🎁";
  if (tile.name === "اذهب للسجن" || tile.displayName === "roh segn") return "🚔";
  if (tile.name === "استراحة" || tile.displayName === "shop") return "☕";
  if (tile.type === "corner" || tile.displayName === "Prison") return "⛓️";
  return "";
}

export default function Tile({ tile, ownerColor, houses, tokenColors, selectable, selected, disabled, onClick }: TileProps) {
  const groupColor = tile.type === "prop" ? GROUPS[tile.group]?.color : undefined;
  const groupFlag = tile.type === "prop" ? GROUPS[tile.group]?.flag : undefined;
  const flagAlt = tile.type === "prop" ? `${tile.group} flag` : "";
  const displayName = tile.displayName ?? tile.name;
  const tileGraphic = tileIcon(tile);
  const isDeed = tile.type === "prop" && displayName !== "toktok";

  const className = [
    "tile",
    `tile-${tile.type}`,
    isDeed ? "tile-deed" : "",
    ownerColor ? "tile-owned" : "",
    selectable ? "tile-selectable" : "",
    selected ? "tile-selected" : "",
    disabled ? "tile-disabled" : "",
    tokenColors.length > 0 ? "tile-occupied" : "",
  ].filter(Boolean).join(" ");

  const style = {
    ...(ownerColor ? { "--owner-color": ownerColor } : {}),
    ...(groupColor ? { "--group-color": groupColor } : {}),
  } as CSSProperties;

  return (
    <div
      className={className}
      onClick={disabled ? undefined : onClick}
      style={style}
      title={displayName}
    >
      {isDeed && (
        <div className="tile-deed-header" style={{ background: groupColor }}>
          {houses > 0 && houses < 5 && (
            <div className="tile-houses" aria-hidden>
              {Array.from({ length: houses }).map((_, i) => (
                <span key={i} className="tile-house-pip" />
              ))}
            </div>
          )}
          {houses === 5 && <span className="tile-hotel-mark">🏨</span>}
        </div>
      )}

      {tileGraphic && (!isDeed || displayName === "toktok") && (
        <span className="tile-ic">{tileGraphic}</span>
      )}
      <div className="tile-name">{displayName}</div>
      {groupFlag && isDeed && <img src={groupFlag} alt={flagAlt} className="tile-flag" />}
      {"price" in tile && <div className="tile-price">{tile.price.toLocaleString()}</div>}

      {!isDeed && houses > 0 && (
        <div className={`tile-badge ${houses === 5 ? "tile-badge-hotel" : "tile-badge-house"}`}>
          {houses === 5 ? "🏨" : `🏠${houses}`}
        </div>
      )}

      {tokenColors.length > 0 && (
        <div className="tile-tokens">
          {tokenColors.map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="tile-token"
              style={{ background: c, boxShadow: `0 0 0 1.5px #fff, 0 2px 6px rgba(0,0,0,0.45), 0 0 10px ${c}aa` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
