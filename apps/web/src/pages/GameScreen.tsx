import { useEffect, useRef, useState } from "react";
import type { GameState, GameAction } from "@bank-el-hazz/engine";
import { TILES } from "@bank-el-hazz/engine";
import { clearLastRoom } from "../lib/identity";
import Board from "../components/Board";
import PlayerStrip from "../components/PlayerStrip";
import PropertiesPanel from "../components/PropertiesPanel";
import StatsPanel from "../components/StatsPanel";
import BuyModal from "../components/modals/BuyModal";
import EventModal from "../components/modals/EventModal";
import RentModal from "../components/modals/RentModal";
import BankruptModal from "../components/modals/BankruptModal";
import BlockModal from "../components/modals/BlockModal";
import PropertyInfoModal from "../components/modals/PropertyInfoModal";

interface GameScreenProps {
  gameState: GameState;
  myId: string | undefined;
  dispatch: (action: GameAction) => void;
}

const ROLL_ANIM_MS = 650;

function GameOverScreen({ winnerName }: { winnerName?: string }) {
  // A finished game should never be auto-resumed into — forget it immediately.
  useEffect(() => { clearLastRoom(); }, []);

  return (
    <div className="win-overlay open">
      <div className="win-card">
        <div className="win-trophy">🏆</div>
        <div className="win-title">{winnerName ? `${winnerName} كسب اللعبة!` : "اللعبة خلصت!"}</div>
        <div className="win-sub">كل اللاعبين التانيين فلسوا</div>
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
          🎲 لعبة جديدة
        </button>
      </div>
    </div>
  );
}

export default function GameScreen({ gameState, myId, dispatch }: GameScreenProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = !!myId && currentPlayer.id === myId;
  const tradeTargets = gameState.players.filter((p) => p.id !== myId && !p.bankrupt);
  const me = gameState.players.find((p) => p.id === myId);
  const canEndTurn = isMyTurn && gameState.turnPhase === "player_turn";
  const canTrade = !!myId && tradeTargets.length > 0;
  const canBankrupt = isMyTurn && gameState.turnPhase === "player_turn";

  const [panel, setPanel] = useState<"none" | "properties" | "stats">("none");
  const [propertyInfoTileIndex, setPropertyInfoTileIndex] = useState<number | null>(null);
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [toktokTargetIndex, setToktokTargetIndex] = useState<number | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeTargetId, setTradeTargetId] = useState<string>("");
  const [tradeGiveTileNames, setTradeGiveTileNames] = useState<string[]>([]);
  const [tradeTakeTileNames, setTradeTakeTileNames] = useState<string[]>([]);
  const [tradeGiveCash, setTradeGiveCash] = useState<number>(0);
  const [tradeTakeCash, setTradeTakeCash] = useState<number>(0);
  const tradeTarget = gameState.players.find((p) => p.id === tradeTargetId) ?? null;
  const previousRollRef = useRef<number | null>(null);
  const pendingMoveStartRef = useRef<number | null>(null);
  const lastAutoInfoRollRef = useRef<number | null>(null);
  const movementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function buildPath(from: number, to: number) {
    const path: number[] = [];
    let cursor = from;
    do {
      path.push(cursor);
      cursor = (cursor + 1) % TILES.length;
    } while (cursor !== to);
    path.push(to);
    return path;
  }

  function startMoveAnimation(playerId: string, from: number, to: number) {
    const path = buildPath(from, to);
    if (movementTimerRef.current) clearInterval(movementTimerRef.current);

    let step = 0;
    movementTimerRef.current = setInterval(() => {
      step += 1;
      const position = path[Math.min(step, path.length - 1)];
      setDisplayedPositions((prev) => ({ ...prev, [playerId]: position }));

      if (step >= path.length - 1) {
        if (movementTimerRef.current) clearInterval(movementTimerRef.current);
        movementTimerRef.current = null;
        setTimeout(() => {
          setDisplayedPositions((prev) => {
            const next = { ...prev };
            delete next[playerId];
            return next;
          });
        }, 120);
      }
    }, 140);
  }

  function handleTileClick(index: number) {
    const tile = TILES[index];

    if (gameState.turnPhase === "awaiting_toktok_choice" && gameState.pendingTileIndex !== null && index !== gameState.pendingTileIndex && myId) {
      setToktokTargetIndex(index);
      return;
    }

    if (tile.type === "prop" || tile.type === "rail" || tile.type === "util") {
      setPropertyInfoTileIndex(index);
    }
  }

  // Dice animation: purely cosmetic, decoupled from the server round-trip.
  // We play a short random-face flicker locally the instant the button is
  // clicked, then let the real result (already broadcast by the time the
  // animation ends, on any reasonable connection) take over.
  const [rollingDice, setRollingDice] = useState<{ d1: number; d2: number } | null>(null);
  const animTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRollSeen = useRef(gameState.lastRoll);

  useEffect(() => {
    // If the server's roll total changed while we weren't the one animating
    // (e.g. we're a spectator), no animation needed — Board just shows it.
    lastRollSeen.current = gameState.lastRoll;
  }, [gameState.lastRoll]);

  useEffect(() => {
    if (gameState.turnPhase !== "awaiting_toktok_choice") {
      setToktokTargetIndex(null);
    }
  }, [gameState.turnPhase]);

  useEffect(() => {
    if (!me) return;
    setTradeGiveCash((previous) => Math.min(previous, me.coins));
  }, [me?.coins]);

  useEffect(() => {
    if (!tradeTarget) return;
    setTradeTakeCash((previous) => Math.min(previous, tradeTarget.coins));
  }, [tradeTarget?.coins]);

  useEffect(() => {
    if (gameState.turnPhase !== "player_turn") {
      lastAutoInfoRollRef.current = null;
      return;
    }

    const landedTile = TILES[currentPlayer.pos];
    const isBuyableTile = landedTile.type === "prop" || landedTile.type === "rail" || landedTile.type === "util";

    if (!isBuyableTile || gameState.lastRoll <= 0) return;
    if (lastAutoInfoRollRef.current === gameState.lastRoll) return;

    lastAutoInfoRollRef.current = gameState.lastRoll;
    setPropertyInfoTileIndex(currentPlayer.pos);
  }, [currentPlayer.pos, gameState.lastRoll, gameState.turnPhase]);

  useEffect(() => {
    if (gameState.lastRoll === 0 || gameState.lastRoll === previousRollRef.current) return;

    const player = gameState.players[gameState.currentPlayerIndex];
    const from = pendingMoveStartRef.current ?? player.pos;
    const to = player.pos;
    if (from !== to) {
      startMoveAnimation(player.id, from, to);
    }
    previousRollRef.current = gameState.lastRoll;
  }, [gameState, gameState.lastRoll]);

  function handleRoll() {
    if (!myId || !isMyTurn || gameState.turnPhase !== "awaiting_roll") return;
    pendingMoveStartRef.current = currentPlayer.pos;
    dispatch({ type: "ROLL_DICE", playerId: myId });

    setRollingDice({ d1: 1, d2: 1 });
    animTimer.current = setInterval(() => {
      setRollingDice({ d1: 1 + Math.floor(Math.random() * 6), d2: 1 + Math.floor(Math.random() * 6) });
    }, 80);
    setTimeout(() => {
      if (animTimer.current) clearInterval(animTimer.current);
      setRollingDice(null);
    }, ROLL_ANIM_MS);
  }

  useEffect(() => () => { if (animTimer.current) clearInterval(animTimer.current); }, []);

  function handleExit() {
    if (!confirm("متأكد عايز تخرج؟ هترجع لصفحة البداية.")) return;
    clearLastRoom();
    window.location.reload();
  }

  function toggleTradeTile(tileName: string, side: "give" | "take") {
    if (side === "give") {
      setTradeGiveTileNames((prev) =>
        prev.includes(tileName) ? prev.filter((name) => name !== tileName) : [...prev, tileName]
      );
      return;
    }

    setTradeTakeTileNames((prev) =>
      prev.includes(tileName) ? prev.filter((name) => name !== tileName) : [...prev, tileName]
    );
  }

  function openTradeDialog() {
    if (!myId) return;
    setTradeTargetId(tradeTargets[0]?.id ?? "");
    setTradeGiveTileNames([]);
    setTradeTakeTileNames([]);
    setTradeGiveCash(0);
    setTradeTakeCash(0);
    setTradeDialogOpen(true);
  }

  if (gameState.turnPhase === "game_over") {
    const winner = gameState.players.find((p) => p.id === gameState.winnerId);
    return (
      <GameOverScreen winnerName={winner?.name} />
    );
  }

  const centerPanel = propertyInfoTileIndex !== null ? (
    <PropertyInfoModal
      gameState={gameState}
      tileIndex={propertyInfoTileIndex}
      myId={myId}
      dispatch={dispatch}
      onClose={() => setPropertyInfoTileIndex(null)}
      inline
    />
  ) : gameState.turnPhase === "awaiting_buy_decision" && gameState.pendingTileIndex !== null ? (
    <BuyModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} inline />
  ) : gameState.turnPhase === "awaiting_toktok_choice" ? (
    <div className="board-inline-panel">
      <div className="modal-title" style={{ marginBottom: 0 }}>🛺 TokTok</div>
      <div className="modal-sub" style={{ marginBottom: 0 }}>
        {toktokTargetIndex !== null
          ? `المكان المختار: ${TILES[toktokTargetIndex].displayName ?? TILES[toktokTargetIndex].name}`
          : "اختر نقطة الوصول من اللوحة مباشرة."}
      </div>
      {myId && (
        <div className="modal-btns" style={{ marginTop: 10 }}>
          {toktokTargetIndex !== null && (
            <button className="btn-buy" onClick={() => dispatch({ type: "USE_TOKTOK", playerId: myId, targetIndex: toktokTargetIndex! })}>
              ✅ تأكيد
            </button>
          )}
          <button className="btn-skip" onClick={() => dispatch({ type: "SKIP_TOKTOK", playerId: myId })}>
            تخطي
          </button>
          {toktokTargetIndex !== null && (
            <button className="btn-skip" onClick={() => setToktokTargetIndex(null)}>
              إلغاء
            </button>
          )}
        </div>
      )}
    </div>
  ) : gameState.turnPhase === "awaiting_event_ack" ? (
    <EventModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} inline />
  ) : gameState.turnPhase === "awaiting_rent_ack" ? (
    <RentModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} inline />
  ) : gameState.turnPhase === "awaiting_bankrupt_ack" ? (
    <BankruptModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} inline />
  ) : gameState.turnPhase === "awaiting_block_target" ? (
    <BlockModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} inline />
  ) : null;

  return (
    <div className="game-screen">
      <div className="app-shell">
        <div className="topbar">
          <div className="player-chip">
            <div className="cur-avatar">{isMyTurn ? "👤" : "⏳"}</div>
            <div>
              <div className="cur-name">{currentPlayer.name}</div>
              <div className="cur-coins">💰 {currentPlayer.coins.toLocaleString()} جنيه</div>
            </div>
          </div>
          <div className="board-title" style={{ fontSize: 22 }}>بنك الحظ</div>
          <div className="topbar-right">
            <button className="icon-btn" title="الممتلكات" onClick={() => setPanel("properties")}>🏘️</button>
            <button className="icon-btn" title="الإحصائيات" onClick={() => setPanel("stats")}>📊</button>
            <button className="icon-btn" title="اخرج من اللعبة" onClick={handleExit}>🚪</button>
          </div>
        </div>

        <Board
          gameState={gameState}
          rollingDice={rollingDice}
          onTileClick={handleTileClick}
          displayedPositions={displayedPositions}
          tokTokSelectedIndex={toktokTargetIndex}
          centerPanel={centerPanel}
        />

        <div className="game-log-panel">
          <div className="modal-title" style={{ marginBottom: 8 }}>📝 سجل اللعبة</div>
          <div className="game-log-list">
            {gameState.log.length > 0 ? (
              gameState.log.map((entry, index) => (
                <div key={`${entry}-${index}`} className="game-log-entry">{entry}</div>
              ))
            ) : (
              <div className="empty-note">لا توجد أحداث بعد.</div>
            )}
          </div>
        </div>

        <div className="bottombar">
          <PlayerStrip gameState={gameState} myId={myId} />
          <button
            className="roll-btn"
            disabled={!isMyTurn || gameState.turnPhase !== "awaiting_roll" || !!rollingDice}
            onClick={handleRoll}
          >
            🎲 رمي النرد
          </button>
          {canTrade && (
            <button
              className="btn-skip"
              style={{ minWidth: 120 }}
              onClick={openTradeDialog}
            >
              تجارة
            </button>
          )}
          {canBankrupt && (
            <button
              className="btn-skip"
              style={{ minWidth: 120, background: "linear-gradient(135deg, #d94b4b, #a82727)", color: "#fff", borderColor: "#d94b4b" }}
              onClick={() => {
                if (!myId) return;
                const confirmed = window.confirm("هل أنت متأكد أنك تريد الإفلاس؟");
                if (confirmed) {
                  dispatch({ type: "DECLARE_BANKRUPTCY", playerId: myId });
                }
              }}
            >
              إفلاس
            </button>
          )}
          {canEndTurn && (
            <button
              className="btn-skip"
              style={{ minWidth: 120, background: "linear-gradient(135deg, #d94b4b, #a82727)", color: "#fff", borderColor: "#d94b4b" }}
              onClick={() => myId && dispatch({ type: "END_TURN", playerId: myId })}
            >
              إنهاء الدور
            </button>
          )}
        </div>

        <div className="status-strip">
          {isMyTurn
            ? gameState.turnPhase === "awaiting_roll"
              ? "دورك — ارمي النرد!"
              : gameState.turnPhase === "player_turn"
                ? "دورك — اختار إجراء أو انهي الدور."
                : "..."
            : `في انتظار ${currentPlayer.name}...`}
        </div>
      </div>

      {tradeDialogOpen && myId && (
        <div className="overlay open">
          <div className="modal wide">
            <button className="close-btn" onClick={() => setTradeDialogOpen(false)}>✕</button>
            <div className="modal-title">💱 التجارة</div>
            <div className="modal-sub">اختر اللاعب اللي تريد تتداول معه، ثم اختار العقارات والمبالغ.</div>

            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>اختر اللاعب</span>
                <select
                  value={tradeTargetId}
                  onChange={(e) => {
                    setTradeTargetId(e.target.value);
                    setTradeTakeTileNames([]);
                  }}
                  style={{ padding: 8, borderRadius: 8 }}
                >
                  {tradeTargets.length === 0 ? (
                    <option value="">لا يوجد لاعبين</option>
                  ) : (
                    tradeTargets.map((player) => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))
                  )}
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div>
                  <div className="modal-title" style={{ fontSize: 18, marginBottom: 8 }}>أعطي</div>
                  {TILES.filter((tile) => gameState.ownedBy[tile.name] === myId).length === 0 ? (
                    <div className="empty-note">ما عندكش عقارات.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {TILES.filter((tile) => gameState.ownedBy[tile.name] === myId).map((tile) => (
                        <label key={tile.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={tradeGiveTileNames.includes(tile.name)}
                            onChange={() => toggleTradeTile(tile.name, "give")}
                          />
                          <span>{tile.displayName ?? tile.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
                    <span>المبلغ اللي هتدفعه: {tradeGiveCash.toLocaleString()} جنيه</span>
                    <input
                      type="range"
                      min={0}
                      max={me?.coins ?? 0}
                      step={1}
                      value={tradeGiveCash}
                      onChange={(e) => setTradeGiveCash(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </label>
                </div>

                <div>
                  <div className="modal-title" style={{ fontSize: 18, marginBottom: 8 }}>آخذ</div>
                  {tradeTargetId ? (
                    TILES.filter((tile) => gameState.ownedBy[tile.name] === tradeTargetId).length === 0 ? (
                      <div className="empty-note">اللاعب المختار ما عندوش عقارات.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {TILES.filter((tile) => gameState.ownedBy[tile.name] === tradeTargetId).map((tile) => (
                          <label key={tile.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={tradeTakeTileNames.includes(tile.name)}
                              onChange={() => toggleTradeTile(tile.name, "take")}
                            />
                            <span>{tile.displayName ?? tile.name}</span>
                          </label>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="empty-note">اختر لاعب أول.</div>
                  )}

                  <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
                    <span>المبلغ اللي هتاخده: {tradeTakeCash.toLocaleString()} جنيه</span>
                    <input
                      type="range"
                      min={0}
                      max={tradeTarget?.coins ?? 0}
                      step={1}
                      value={tradeTakeCash}
                      onChange={(e) => setTradeTakeCash(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                <button
                  className="btn-buy"
                  disabled={!tradeTargetId}
                  onClick={() => {
                    if (!myId || !tradeTargetId) return;
                    dispatch({
                      type: "REQUEST_TRADE",
                      playerId: myId,
                      targetPlayerId: tradeTargetId,
                      giveTileNames: tradeGiveTileNames,
                      takeTileNames: tradeTakeTileNames,
                      giveCash: tradeGiveCash,
                      takeCash: tradeTakeCash,
                    });
                    setTradeDialogOpen(false);
                  }}
                >
                  تأكيد التجارة
                </button>
                <button className="btn-skip" onClick={() => setTradeDialogOpen(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState.pendingTrade && gameState.pendingTrade.targetPlayerId === myId && (
        <div className="overlay open">
          <div className="modal wide">
            <div className="modal-title">📩 طلب تجارة</div>
            <div className="modal-sub">
              {gameState.players.find((p) => p.id === gameState.pendingTrade?.playerId)?.name} عايز يشتري منك
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div><strong>يطلع لك:</strong> {gameState.pendingTrade.takeTileNames.length > 0 ? gameState.pendingTrade.takeTileNames.map((name) => TILES.find((tile) => tile.name === name)?.displayName ?? name).join(", ") : "لا شيء"}</div>
              <div><strong>هتدفع:</strong> {gameState.pendingTrade.giveTileNames.length > 0 ? gameState.pendingTrade.giveTileNames.map((name) => TILES.find((tile) => tile.name === name)?.displayName ?? name).join(", ") : "لا شيء"}</div>
              <div><strong>النقد:</strong> {gameState.pendingTrade.giveCash > 0 ? `${gameState.pendingTrade.giveCash.toLocaleString()} جنيه` : "0 جنيه"}</div>
              <div><strong>اللي هتاخده نقدًا:</strong> {gameState.pendingTrade.takeCash > 0 ? `${gameState.pendingTrade.takeCash.toLocaleString()} جنيه` : "0 جنيه"}</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button
                className="btn-buy"
                onClick={() => myId && dispatch({ type: "ACCEPT_TRADE", playerId: myId })}
              >
                موافقة
              </button>
              <button
                className="btn-skip"
                onClick={() => myId && dispatch({ type: "REJECT_TRADE", playerId: myId })}
              >
                رفض
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === "properties" && (
        <PropertiesPanel gameState={gameState} myId={myId} dispatch={dispatch} onClose={() => setPanel("none")} />
      )}
      {panel === "stats" && (
        <StatsPanel gameState={gameState} myId={myId} onClose={() => setPanel("none")} />
      )}
    </div>
  );
}
