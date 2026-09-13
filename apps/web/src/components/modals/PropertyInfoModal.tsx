import { useState } from "react";
import { GROUPS, TILES, rentBase } from "@bank-el-hazz/engine";
import type { GameState, GameAction, PropertyTile, RailOrUtilTile } from "@bank-el-hazz/engine";

interface PropertyInfoModalProps {
  gameState: GameState;
  tileIndex: number;
  myId: string | undefined;
  dispatch: (action: GameAction) => void;
  onClose: () => void;
  inline?: boolean;
}

export default function PropertyInfoModal({ gameState, tileIndex, myId, dispatch, onClose, inline = false }: PropertyInfoModalProps) {
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeTargetId, setTradeTargetId] = useState<string>("");
  const [tradeCash, setTradeCash] = useState<number>(0);
  const tradeTarget = gameState.players.find((p) => p.id === tradeTargetId) ?? null;

  const tile = TILES[tileIndex];
  const ownedById = gameState.ownedBy[tile.name];
  const isOwnedByMe = !!myId && ownedById === myId;
  const isMyTurn = !!myId && gameState.players[gameState.currentPlayerIndex]?.id === myId;
  const availableTargets = gameState.players.filter((p) => p.id !== myId && !p.bankrupt);

  const propTile = tile.type === "prop" ? tile as PropertyTile : null;
  const groupTiles = propTile
    ? TILES.filter((t) => t.type === "prop" && (t as PropertyTile).group === propTile.group)
    : [];
  const groupColor = propTile ? GROUPS[propTile.group]?.color ?? "#888" : "#888";
  const baseRent = propTile ? rentBase(propTile) : 0;

  const rentRows = propTile
    ? [
        { label: "Rent with only this city", value: baseRent },
        { label: "Rent with full set", value: baseRent * 2 },
        { label: "Rent with 1 house", value: Math.round(baseRent * 3) },
        { label: "Rent with 2 houses", value: Math.round(baseRent * 6) },
        { label: "Rent with 3 houses", value: Math.round(baseRent * 10) },
        { label: "Rent with 4 houses", value: Math.round(baseRent * 14) },
        { label: "Rent with hotel", value: Math.round(baseRent * 20) },
      ]
    : tile.type === "rail"
      ? [
          { label: "1 airport owned", value: 25 },
          { label: "2 airports owned", value: 50 },
          { label: "3 airports owned", value: 100 },
          { label: "4 airports owned", value: 200 },
        ]
      : [
          { label: "1 hagz owned", value: "8 × (5+2)" },
          { label: "2 hagz owned", value: "16 × (5+2)" },
        ];

  const saleValue = tile.type === "prop" || tile.type === "rail" || tile.type === "util" ? Math.floor(tile.price / 2) : 0;

  const content = (
    <div className={inline ? "board-inline-panel" : "modal wide"}>
      {!inline && <button className="close-btn" onClick={onClose}>✕</button>}

      <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>{tile.displayName ?? tile.name}</span>
      </div>

      <div className="modal-sub">
        {propTile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="dot" style={{ background: groupColor, width: 12, height: 12, borderRadius: 999 }} />
            <span>{propTile.group}</span>
          </div>
        )}
        <div style={{ marginTop: 6 }}>
          Price: {(tile.type === "prop" || tile.type === "rail" || tile.type === "util") ? tile.price.toLocaleString() : 0} جنيه
        </div>
      </div>

      {propTile && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#dcd4b0", marginBottom: 8 }}>Cities to complete the set</div>
          <div>
            {groupTiles.map((groupTile) => (
              <div key={groupTile.name} className="prop-row" style={{ marginBottom: 6 }}>
                <span className="dot" style={{ background: groupColor }} />
                <span className="pname">{groupTile.displayName ?? groupTile.name}</span>
                <span className="plevel">
                  {gameState.ownedBy[groupTile.name] ? "Owned" : "Need"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#dcd4b0" }}>
        {propTile ? "Rent table" : tile.type === "rail" ? "Airport rent" : "Hagz rent"}
      </div>
      {rentRows.map((row) => (
        <div key={row.label} className="info-row">
          <span>{row.label}</span>
          <strong>
            {typeof row.value === "number"
              ? `${row.value.toLocaleString()} جنيه`
              : `${row.value} جنيه`}
          </strong>
        </div>
      ))}

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {ownedById && (
          <>
            {isOwnedByMe && (
              <button
                className="btn-skip"
                onClick={() => {
                  if (myId) {
                    dispatch({ type: "SELL_PROPERTY", playerId: myId, tileName: tile.name });
                  }
                  onClose();
                }}
              >
                Sell for {saleValue.toLocaleString()} جنيه
              </button>
            )}

            <button
              className="btn-skip"
              disabled={!isOwnedByMe}
              onClick={() => {
                if (!isOwnedByMe || !myId) return;
                setTradeTargetId(availableTargets[0]?.id ?? "");
                setTradeCash(0);
                setTradeOpen(true);
              }}
            >
              Trade
            </button>
          </>
        )}

        {isMyTurn && (
          <button
            className="btn-skip"
            onClick={() => {
              if (myId) {
                dispatch({ type: "DECLARE_BANKRUPTCY", playerId: myId });
              }
              onClose();
            }}
          >
            Bankrupt
          </button>
        )}

        <button className="btn-skip" onClick={onClose}>إغلاق</button>
      </div>

      {tradeOpen && (
        <div style={{ marginTop: 16, borderTop: "1px solid #3a3f55", paddingTop: 16 }}>
          <div className="modal-title" style={{ fontSize: 18, marginBottom: 8 }}>تجارة العقار</div>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>اختار اللاعب</span>
              <select
                value={tradeTargetId}
                onChange={(e) => setTradeTargetId(e.target.value)}
                style={{ padding: 8, borderRadius: 8 }}
              >
                {availableTargets.length === 0 ? (
                  <option value="">لا يوجد لاعبين</option>
                ) : (
                  availableTargets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))
                )}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>المبلغ اللي هتاخده: {tradeCash.toLocaleString()} جنيه</span>
              <input
                type="range"
                min={0}
                max={tradeTarget?.coins ?? 0}
                step={1}
                value={tradeCash}
                onChange={(e) => setTradeCash(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn-buy"
                disabled={!tradeTargetId}
                onClick={() => {
                  if (myId && tradeTargetId) {
                    dispatch({
                      type: "REQUEST_TRADE",
                      playerId: myId,
                      targetPlayerId: tradeTargetId,
                      giveTileNames: [tile.name],
                      takeTileNames: [],
                      giveCash: 0,
                      takeCash: tradeCash,
                    });
                  }
                  setTradeOpen(false);
                  onClose();
                }}
              >
                تأكيد التجارة
              </button>
              <button className="btn-skip" onClick={() => setTradeOpen(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="overlay open">
      {content}
    </div>
  );
}
