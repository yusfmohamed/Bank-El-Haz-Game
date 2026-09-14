import { useState } from "react";
import { GROUPS, TILES, rentBase, hasMonopoly, groupHasBuildings } from "@bank-el-hazz/engine";
import type { GameState, GameAction, PropertyTile, RailOrUtilTile } from "@bank-el-hazz/engine";

const GROUP_LABELS: Record<string, string> = {
  Egypt: "مصر",
  Spain: "إسبانيا",
  China: "الصين",
  "Saudi Arabia": "السعودية",
  Qatar: "قطر",
  Germany: "ألمانيا",
  France: "فرنسا",
  Italy: "إيطاليا",
};

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
  const availableTargets = gameState.players.filter((p) => p.id !== myId && !p.bankrupt);

  const propTile = tile.type === "prop" ? tile as PropertyTile : null;
  const groupTiles = propTile
    ? TILES.filter((t) => t.type === "prop" && (t as PropertyTile).group === propTile.group)
    : [];
  const groupColor = propTile ? GROUPS[propTile.group]?.color ?? "#888" : "#888";
  const groupLabel = propTile ? GROUP_LABELS[propTile.group] ?? propTile.group : "";
  const baseRent = propTile ? rentBase(propTile) : 0;
  const currentHouses = gameState.houses[tile.name] || 0;
  const currentPlayer = myId ? gameState.players.find((p) => p.id === myId) : null;
  const hasFullSet = !!(propTile && myId && hasMonopoly(gameState, myId, propTile.group));
  const groupLocked = !!(propTile && groupHasBuildings(gameState, propTile.group));
  const buildingCost = propTile ? GROUPS[propTile.group].houseCost : 0;
  const buildingRefund = Math.floor(buildingCost / 2);
  const canBuildHere = !!(isOwnedByMe && propTile && hasFullSet && currentHouses < 5);
  const canSellBuildingHere = !!(isOwnedByMe && propTile && currentHouses > 0);

  const rentRows = propTile
    ? [
        { label: "إيجار المدينة فقط", value: baseRent },
        { label: "إيجار المجموعة كاملة", value: baseRent * 2 },
        { label: "إيجار مع بيت واحد", value: Math.round(baseRent * 3) },
        { label: "إيجار مع بيتين", value: Math.round(baseRent * 6) },
        { label: "إيجار مع ٣ بيوت", value: Math.round(baseRent * 10) },
        { label: "إيجار مع ٤ بيوت", value: Math.round(baseRent * 14) },
        { label: "إيجار مع فندق", value: Math.round(baseRent * 20) },
      ]
    : tile.type === "rail"
      ? [
          { label: "مطار واحد مملوك", value: 25 },
          { label: "مطاران مملوكان", value: 50 },
          { label: "٣ مطارات مملوكة", value: 100 },
          { label: "٤ مطارات مملوكة", value: 200 },
        ]
      : [
          { label: "حجز واحد مع المالك", value: "٨ × مجموع النرد" },
          { label: "الحجزين مع نفس المالك", value: "١٦ × مجموع النرد" },
        ];

  const saleValue = tile.type === "prop" || tile.type === "rail" || tile.type === "util" ? Math.floor(tile.price / 2) : 0;

  const content = (
    <div className={inline ? "board-inline-panel" : "modal wide"}>
      <button className={inline ? "inline-close-btn" : "close-btn"} onClick={onClose} aria-label="إغلاق">X</button>

      <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>{tile.displayName ?? tile.name}</span>
      </div>

      <div className="modal-sub">
        {propTile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="dot" style={{ background: groupColor, width: 12, height: 12, borderRadius: 999 }} />
            <span>{groupLabel}</span>
          </div>
        )}
        <div style={{ marginTop: 6 }}>
          السعر: {(tile.type === "prop" || tile.type === "rail" || tile.type === "util") ? tile.price.toLocaleString() : 0} جنيه
        </div>
      </div>

      {propTile && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#dcd4b0", marginBottom: 8 }}>مدن البلد المطلوبة للبناء</div>
          <div>
            {groupTiles.map((groupTile) => (
              <div key={groupTile.name} className="prop-row" style={{ marginBottom: 6 }}>
                <span className="dot" style={{ background: groupColor }} />
                <span className="pname">{groupTile.displayName ?? groupTile.name}</span>
                <span className="plevel">
                  {gameState.ownedBy[groupTile.name] ? "مملوكة" : "مطلوبة"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#dcd4b0" }}>
        {propTile ? "جدول الإيجار" : tile.type === "rail" ? "إيجار المطارات" : "إيجار الحجز"}
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

      {ownedById && (
        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isOwnedByMe && propTile && (
            <>
              <button
                className="btn-buy"
                disabled={!canBuildHere || (currentPlayer?.coins ?? 0) < buildingCost}
                onClick={() => {
                  if (!myId || !canBuildHere) return;
                  dispatch({ type: "BUILD_HOUSE", playerId: myId, tileName: tile.name });
                }}
              >
                {currentHouses === 4 ? `ابني فندق (${buildingCost} جنيه)` : `ابني بيت (${buildingCost} جنيه)`}
              </button>
              <button
                className="btn-skip"
                disabled={!canSellBuildingHere}
                onClick={() => {
                  if (!myId || !canSellBuildingHere) return;
                  dispatch({ type: "SELL_HOUSE", playerId: myId, tileName: tile.name });
                }}
              >
                {currentHouses === 5 ? `بيع الفندق (+${buildingRefund} جنيه)` : `بيع بيت (+${buildingRefund} جنيه)`}
              </button>
            </>
          )}
          {isOwnedByMe && propTile && !hasFullSet && (
            <div className="need-monopoly-note">لازم تمتلك كل مدن البلد عشان تبني.</div>
          )}
          {isOwnedByMe && groupLocked && (
            <div className="need-monopoly-note">لا يمكن بيع أو تجارة أي مدينة في البلد قبل بيع كل البيوت والفنادق.</div>
          )}
          {isOwnedByMe && (
            <button
              className="btn-skip"
              disabled={groupLocked}
              onClick={() => {
                if (myId) {
                  dispatch({ type: "SELL_PROPERTY", playerId: myId, tileName: tile.name });
                }
                onClose();
              }}
            >
              بيع العقار بـ {saleValue.toLocaleString()} جنيه
            </button>
          )}

          <button
            className="btn-skip"
            disabled={!isOwnedByMe || groupLocked}
            onClick={() => {
              if (!isOwnedByMe || !myId) return;
              setTradeTargetId(availableTargets[0]?.id ?? "");
              setTradeCash(0);
              setTradeOpen(true);
            }}
          >
            تجارة
          </button>
        </div>
      )}

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
