import type { Tile as TileData, PlayerColor } from "@bank-el-hazz/engine";
import { GROUPS, playerAvatar } from "@bank-el-hazz/engine";
import type { CSSProperties } from "react";

export interface PlayerTokenInfo {
  color: PlayerColor;
  hex: string;
  name?: string;
}

interface TileProps {
  tile: TileData;
  side: "top" | "right" | "bottom" | "left" | "corner";
  ownerColor: string | null;
  houses: number; // 0-4 = houses, 5 = hotel
  tokens: PlayerTokenInfo[]; // players currently standing here
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function tileIcon(tile: TileData): string {
  if (tile.type === "toktok") return "🛺";
  if (tile.type === "rail") return "🚄";
  if (tile.type === "event") return tile.pool === "luck" ? "🎲" : "🎁";
  if (tile.index === 30) return "🚔";
  if (tile.index === 20) return "☕";
  if (tile.type === "corner") return "⛓️";
  return "";
}

function tileImage(tile: TileData): string | null {
  if (tile.type === "start") return "/assets/starticon.png";
  if (tile.type === "toktok") return "/assets/toktok.png";
  if (tile.type === "rail") return "/assets/airport.png";
  if (tile.index === 12) return "/assets/padel.png";
  if (tile.type === "util") return "/assets/football.png";
  if (tile.index === 8 || tile.index === 23) return "/assets/surprise.png";
  if (tile.index === 18 || tile.index === 32) return "/assets/treasure.png";
  if (tile.index === 10) return "/assets/prison.png";
  if (tile.index === 30) return "/assets/police.png";
  return null;
}

export default function Tile({ tile, side, ownerColor, houses, tokens, selectable, selected, disabled, onClick }: TileProps) {
  const groupColor = tile.type === "prop" ? GROUPS[tile.group]?.color : undefined;
  const groupFlag = tile.type === "prop" ? GROUPS[tile.group]?.flag : undefined;
  const flagAlt = tile.type === "prop" ? "علم البلد" : "";
  const displayName = tile.displayName ?? tile.name;
  const isDeed = tile.type === "prop";
  const imageSrc = tileImage(tile);
  const tileGraphic = imageSrc ? "" : tileIcon(tile);
  const imageClass =
    tile.type === "start" ? "tile-start-icon"
    : tile.type === "toktok" ? "tile-toktok-icon"
    : tile.type === "util" ? "tile-util-icon"
    : tile.type === "rail" ? "tile-rail-icon"
    : tile.type === "event" ? "tile-event-icon"
    : "tile-corner-icon";

  const className = [
    "tile",
    `tile-${tile.type}`,
    `tile-side-${side}`,
    tile.index === 10 ? "tile-prison-corner" : "",
    tile.index === 30 ? "tile-police-corner" : "",
    isDeed ? "tile-deed" : "",
    ownerColor ? "tile-owned" : "",
    selectable ? "tile-selectable" : "",
    selected ? "tile-selected" : "",
    disabled ? "tile-disabled" : "",
    tokens.length > 0 ? "tile-occupied" : "",
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
        <>
          {ownerColor && <span className="tile-owner-stripe" aria-hidden />}
          {groupFlag && <img src={groupFlag} alt={flagAlt} className="tile-flag" />}
          <div className="tile-deed-header">
            {houses > 0 && houses < 5 && (
              <div className="tile-houses" aria-hidden>
                {Array.from({ length: houses }).map((_, i) => (
                  <img
                    key={i}
                    src="/assets/house.png"
                    alt=""
                    className="tile-house-icon"
                    style={{ "--build-index": i } as CSSProperties}
                  />
                ))}
              </div>
            )}
            {houses === 5 && (
              <span className="tile-hotel-mark" aria-hidden>
                <img src="/assets/hotel.png" alt="" className="tile-hotel-icon" />
              </span>
            )}
          </div>
        </>
      )}

      {groupFlag && isDeed && <img src={groupFlag} alt="" className="tile-flag-watermark" aria-hidden />}
      {imageSrc && <img src={imageSrc} alt="" className={`tile-image ${imageClass}`} />}
      {tileGraphic && !isDeed && (
        <span className="tile-ic">{tileGraphic}</span>
      )}
      <div className="tile-name">{displayName}</div>
      {"price" in tile && <div className="tile-price">{tile.price.toLocaleString()}</div>}

      {!isDeed && houses > 0 && (
        <div className={`tile-badge ${houses === 5 ? "tile-badge-hotel" : "tile-badge-house"}`}>
          {houses === 5 ? "🏨" : `🏠${houses}`}
        </div>
      )}

      {tokens.length > 0 && (
        <div className="tile-tokens">
          {tokens.map((tok, i) => (
            <span
              key={`${tok.color}-${i}`}
              className="tile-token"
              style={{ "--token-color": tok.hex } as CSSProperties}
              title={tok.name}
              aria-label={tok.name ?? "علامة اللاعب"}
            >
              <img
                src={playerAvatar(tok.color)}
                alt={tok.name ?? ""}
                className="tile-token-img"
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
