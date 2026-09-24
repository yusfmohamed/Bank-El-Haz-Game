import { useEffect, useRef, useState } from "react";
import type { GameState, GameAction } from "@bank-el-hazz/engine";
import { TILES, groupHasBuildings, colorHex, playerAvatar } from "@bank-el-hazz/engine";
import { clearLastRoom } from "../lib/identity";
import { playCoin, isSoundEnabled, setSoundEnabled } from "../lib/sound";
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

function playDiceSound() {
  try {
    const audio = new Audio("/assets/dice.mp3");
    audio.volume = 0.8;
    audio.play().catch((err) => {
      console.warn("Dice sound playback blocked:", err);
    });
  } catch (err) {
    console.warn("Dice audio error:", err);
  }
}

function tileDisplayName(tileName: string) {
  return TILES.find((tile) => tile.name === tileName)?.displayName ?? tileName;
}

function formatMoney(amount: number) {
  return `${amount.toLocaleString()} جنيه`;
}

function formatTileList(tileNames: string[]) {
  return tileNames.length > 0 ? tileNames.map(tileDisplayName).join("، ") : "لا شيء";
}

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
  const canPayJailFine = isMyTurn && gameState.turnPhase === "awaiting_roll" && currentPlayer.inJail && currentPlayer.coins >= 50;

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
  const [isCounterOffer, setIsCounterOffer] = useState(false);
  const tradeTarget = gameState.players.find((p) => p.id === tradeTargetId) ?? null;
  const incomingTrade = gameState.pendingTrade?.targetPlayerId === myId ? gameState.pendingTrade : null;
  const incomingTradeSender = incomingTrade
    ? gameState.players.find((p) => p.id === incomingTrade.playerId) ?? null
    : null;
  const previousRollCountRef = useRef<number>(gameState.rollCount || 0);
  const pendingMoveStartRef = useRef<{ playerId: string; pos: number } | null>(null);
  // Track every player's last known position so we can animate movement for other players too
  const prevPositionsRef = useRef<Record<string, number>>(
    Object.fromEntries(gameState.players.map((p) => [p.id, p.pos]))
  );
  const movementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [movementInProgress, setMovementInProgress] = useState(false);

  function buildPath(from: number, to: number) {
    // Guard: if from === to there is no movement (avoids a full 40-step loop)
    if (from === to) return [from];
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
    setMovementInProgress(true);

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
          // Only the notification/decision panel waits on this — it's what
          // makes "see where you landed, then get asked what to do" actually
          // happen in that order instead of both at once.
          setMovementInProgress(false);
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

  // Dice animation: decoupled from the server round-trip.
  // We play a short random-face flicker locally the instant the button is
  // clicked, then let the real result take over.
  const [rollingDice, setRollingDice] = useState<{ d1: number; d2: number } | null>(null);
  const canRoll = isMyTurn && gameState.turnPhase === "awaiting_roll" && !rollingDice;
  const animTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRollSeen = useRef(gameState.lastRoll);

  function triggerRollAnimation() {
    if (animTimer.current) clearInterval(animTimer.current);
    setRollingDice({ d1: 1, d2: 1 });
    animTimer.current = setInterval(() => {
      setRollingDice({ d1: 1 + Math.floor(Math.random() * 6), d2: 1 + Math.floor(Math.random() * 6) });
    }, 80);
    setTimeout(() => {
      if (animTimer.current) clearInterval(animTimer.current);
      animTimer.current = null;
      setRollingDice(null);
    }, ROLL_ANIM_MS);
  }

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
    if (!gameState.pendingTrade && isCounterOffer) {
      setIsCounterOffer(false);
    }
  }, [gameState.pendingTrade, isCounterOffer]);

  useEffect(() => {
    const currentRollCount = gameState.rollCount || 0;
    if (currentRollCount === 0 || currentRollCount === previousRollCountRef.current) return;

    // Play dice sound and roll animation for all other players
    if (!isMyTurn) {
      playDiceSound();
      triggerRollAnimation();
    }

    const pendingMove = pendingMoveStartRef.current;
    if (pendingMove) {
      // My own roll — we have a reliable 'from' position captured before dispatch
      const player = gameState.players.find((p) => p.id === pendingMove.playerId);
      if (player && pendingMove.pos !== player.pos) {
        startMoveAnimation(player.id, pendingMove.pos, player.pos);
      }
    } else {
      // Another player rolled — compare against our last-known position snapshot
      gameState.players.forEach((player) => {
        const prevPos = prevPositionsRef.current[player.id];
        if (prevPos !== undefined && prevPos !== player.pos) {
          startMoveAnimation(player.id, prevPos, player.pos);
        }
      });
    }
    // Update our snapshot of every player's position for the next roll
    gameState.players.forEach((p) => {
      prevPositionsRef.current[p.id] = p.pos;
    });
    pendingMoveStartRef.current = null;
    previousRollCountRef.current = currentRollCount;
  }, [gameState.rollCount, gameState.players, gameState.currentPlayerIndex, isMyTurn]);

  function handleRoll() {
    if (!myId || !isMyTurn || gameState.turnPhase !== "awaiting_roll") return;
    pendingMoveStartRef.current = { playerId: currentPlayer.id, pos: currentPlayer.pos };
    playDiceSound();
    triggerRollAnimation();
    dispatch({ type: "ROLL_DICE", playerId: myId });
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

  function closeTradeDialog() {
    setTradeDialogOpen(false);
    setIsCounterOffer(false);
  }

  function openTradeDialog() {
    if (!myId) return;
    setIsCounterOffer(false);
    setTradeTargetId(tradeTargets[0]?.id ?? "");
    setTradeGiveTileNames([]);
    setTradeTakeTileNames([]);
    setTradeGiveCash(0);
    setTradeTakeCash(0);
    setTradeDialogOpen(true);
  }

  function openCounterTrade() {
    if (!myId || !incomingTrade) return;
    setTradeTargetId(incomingTrade.playerId);
    setTradeGiveTileNames(incomingTrade.takeTileNames.filter((name) => {
      const tile = TILES.find((t) => t.name === name);
      return tile ? !isTradeLocked(tile) : false;
    }));
    setTradeTakeTileNames(incomingTrade.giveTileNames.filter((name) => {
      const tile = TILES.find((t) => t.name === name);
      return tile ? !isTradeLocked(tile) : false;
    }));
    setTradeGiveCash(incomingTrade.takeCash);
    setTradeTakeCash(incomingTrade.giveCash);
    setIsCounterOffer(true);
    setTradeDialogOpen(true);
  }

  function submitTrade() {
    if (!myId || !tradeTargetId) return;
    const giveTileNames = tradeGiveTileNames.filter((name) => {
      const tile = TILES.find((t) => t.name === name);
      return tile ? !isTradeLocked(tile) : false;
    });
    const takeTileNames = tradeTakeTileNames.filter((name) => {
      const tile = TILES.find((t) => t.name === name);
      return tile ? !isTradeLocked(tile) : false;
    });
    dispatch({
      type: "REQUEST_TRADE",
      playerId: myId,
      targetPlayerId: tradeTargetId,
      giveTileNames,
      takeTileNames,
      giveCash: tradeGiveCash,
      takeCash: tradeTakeCash,
    });
    closeTradeDialog();
  }

  function isTradeLocked(tile: (typeof TILES)[number]) {
    return tile.type === "prop" && groupHasBuildings(gameState, tile.group);
  }

  if (gameState.turnPhase === "game_over") {
    const winner = gameState.players.find((p) => p.id === gameState.winnerId);
    return (
      <GameOverScreen winnerName={winner?.name} />
    );
  }

  const decisionPanel = propertyInfoTileIndex !== null ? (
    <PropertyInfoModal
      gameState={gameState}
      tileIndex={propertyInfoTileIndex}
      myId={myId}
      dispatch={dispatch}
      onClose={() => setPropertyInfoTileIndex(null)}
      inline
    />
  ) : currentPlayer.inJail && gameState.turnPhase === "awaiting_roll" ? (
    <div className="board-inline-panel jail-panel">
      <div className="modal-title" style={{ marginBottom: 0 }}>السجن</div>
      <div className="modal-sub" style={{ marginBottom: 0 }}>
        {isMyTurn
          ? `انت في السجن. ارمِ نفس الرقم للخروج، أو ادفع 50 جنيه. بعد محاولتين فاشلتين، المحاولة التالتة بتخرجك.`
          : `${currentPlayer.name} في السجن وبيحاول يخرج.`}
      </div>
      <div className="info-row">
        <span>المحاولات الفاشلة</span>
        <strong>{currentPlayer.jailAttempts} / 2</strong>
      </div>
      {isMyTurn && myId ? (
        <div className="modal-btns">
          <button
            className="btn-buy"
            disabled={!canPayJailFine}
            onClick={() => dispatch({ type: "PAY_JAIL_FINE", playerId: myId })}
          >
            ادفع 50 جنيه
          </button>
          <button className="btn-skip" disabled={!canRoll} onClick={handleRoll}>
            ارمِ للخروج
          </button>
        </div>
      ) : (
        <div className="waiting-note">في انتظار دور {currentPlayer.name}...</div>
      )}
    </div>
  ) : gameState.turnPhase === "awaiting_buy_decision" && gameState.pendingTileIndex !== null ? (
    <BuyModal gameState={gameState} myId={myId} isMyTurn={isMyTurn} dispatch={dispatch} inline />
  ) : gameState.turnPhase === "awaiting_toktok_choice" ? (
    <div className="board-inline-panel">
      <div className="modal-title" style={{ marginBottom: 0 }}>🛺 توكتوك</div>
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

  // ── Turn countdown ────────────────────────────────────────────────
  // 30-second timer for player turns and decisions.
  // If the player doesn't act in time, their turn ends (or rolls dice if awaiting roll)
  // so the game keeps moving seamlessly and doesn't get stuck.
  const TURN_TIMEOUT_SEC = 30;
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);

    const timedPhases = new Set([
      "awaiting_roll",
      "player_turn",
      "awaiting_buy_decision",
      "awaiting_event_ack",
      "awaiting_rent_ack",
      "awaiting_bankrupt_ack",
      "awaiting_block_target",
      "awaiting_toktok_choice",
    ]);

    if (movementInProgress || !timedPhases.has(gameState.turnPhase) || gameState.turnPhase === "game_over") {
      return;
    }

    let remaining = TURN_TIMEOUT_SEC;
    setCountdown(remaining);

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);

      if (remaining <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;

        if (!isMyTurn || !myId) return;

        switch (gameState.turnPhase) {
          case "awaiting_roll":
            dispatch({ type: "ROLL_DICE", playerId: myId });
            break;
          case "awaiting_buy_decision":
            // Ends turn immediately, skipping the purchase
            dispatch({ type: "END_TURN", playerId: myId });
            break;
          case "player_turn":
            dispatch({ type: "END_TURN", playerId: myId });
            break;
          case "awaiting_event_ack":
          case "awaiting_rent_ack":
          case "awaiting_toktok_choice":
            dispatch({ type: "END_TURN", playerId: myId });
            break;
          case "awaiting_bankrupt_ack":
            dispatch({ type: "ACK_BANKRUPT", playerId: myId });
            break;
          case "awaiting_block_target": {
            const target = gameState.players.find((p) => p.id !== myId && !p.bankrupt);
            if (target) {
              dispatch({ type: "CHOOSE_BLOCK_TARGET", playerId: myId, targetPlayerId: target.id });
            }
            dispatch({ type: "END_TURN", playerId: myId });
            break;
          }
        }
      }
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [gameState.turnPhase, gameState.currentPlayerIndex, isMyTurn, myId, movementInProgress]);

  // The token needs to finish hopping across the board BEFORE any
  // buy/event/rent/etc. panel appears — that's the "see where I landed,
  // then get asked what to do" sequencing.
  const centerPanel = movementInProgress ? null : decisionPanel ? (
    <>
      {countdown !== null && (
        <div className={`decision-countdown ${countdown <= 5 ? "decision-countdown-urgent" : ""}`}>
          ⏱ {countdown}s
        </div>
      )}
      {decisionPanel}
    </>
  ) : null;

  const centerControls = (
    <div className="turn-action-dock" aria-label="Turn actions">
      {countdown !== null && !decisionPanel && (
        <div className={`turn-countdown-badge ${countdown <= 5 ? "turn-countdown-urgent" : ""}`}>
          ⏱ {countdown}s
        </div>
      )}
      <button
        className="turn-action-btn turn-action-primary"
        disabled={!canRoll}
        onClick={handleRoll}
      >
        <span aria-hidden>🎲</span>
        <span>رمي النرد</span>
      </button>
      <button
        className="turn-action-btn turn-action-danger"
        disabled={!canEndTurn}
        onClick={() => myId && dispatch({ type: "END_TURN", playerId: myId })}
      >
        <span aria-hidden>⏭</span>
        <span>إنهاء الدور</span>
      </button>
    </div>
  );

  const tradeGiveOptions = myId ? TILES.filter((tile) => gameState.ownedBy[tile.name] === myId) : [];
  const tradeTakeOptions = tradeTargetId ? TILES.filter((tile) => gameState.ownedBy[tile.name] === tradeTargetId) : [];

  return (
    <div className="game-screen">
      <div className="app-shell">
        <div className="topbar">
          <div className="player-chip">
            <div
              className="cur-avatar"
              style={{
                border: `2px solid ${colorHex(currentPlayer.color)}`,
                padding: 0,
                overflow: "hidden",
                borderRadius: "50%",
                background: `${colorHex(currentPlayer.color)}22`,
              }}
            >
              <img
                src={playerAvatar(currentPlayer.color)}
                alt={currentPlayer.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <div>
              <div className="cur-name">{currentPlayer.name}</div>
              <div className="cur-coins">💰 {currentPlayer.coins.toLocaleString()} جنيه</div>
            </div>
          </div>
          <div className="board-title">
            <img src="/assets/logo.png" alt="بنك الحظ" className="board-logo" />
          </div>
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
          centerControls={centerControls}
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
        </div>

        <div className="status-strip">
          {isMyTurn
            ? gameState.turnPhase === "awaiting_roll"
              ? `دورك — ارمي النرد! ${countdown !== null ? `(⏱ ${countdown} ثانية)` : ""}`
              : gameState.turnPhase === "player_turn"
                ? `دورك — اختار إجراء أو انهي الدور. ${countdown !== null ? `(⏱ ${countdown} ثانية)` : ""}`
                : "..."
            : `في انتظار ${currentPlayer.name}... ${countdown !== null ? `(⏱ ${countdown} ثانية)` : ""}`}
        </div>
      </div>

      {tradeDialogOpen && myId && (
        <div className="overlay open">
          <div className="modal wide trade-modal">
            <button className="close-btn" onClick={closeTradeDialog} aria-label="إغلاق">X</button>
            <div className="trade-modal-head">
              <div>
                <div className="modal-title">{isCounterOffer ? "فصال" : "التجارة"}</div>
                <div className="modal-sub">
                  {isCounterOffer
                    ? `عدّل العرض وابعته لـ ${tradeTarget?.name ?? "اللاعب"} كفصال جديد.`
                    : "اختار اللاعب، ثم حدد العقارات والمبالغ من الناحيتين."}
                </div>
              </div>
              {isCounterOffer && <span className="trade-badge">عرض مضاد</span>}
            </div>

            <div className="trade-panel">
              <label className="trade-field">
                <span>اللاعب</span>
                <select
                  className="trade-select"
                  value={tradeTargetId}
                  disabled={isCounterOffer}
                  onChange={(e) => {
                    setTradeTargetId(e.target.value);
                    setTradeTakeTileNames([]);
                  }}
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

              <div className="trade-columns">
                <section className="trade-box">
                  <div className="trade-box-title">
                    <span>أعطي</span>
                    <strong>{formatMoney(tradeGiveCash)}</strong>
                  </div>
                  {tradeGiveOptions.length === 0 ? (
                    <div className="empty-note">ما عندكش عقارات.</div>
                  ) : (
                    <div className="trade-option-list">
                      {tradeGiveOptions.map((tile) => (
                        (() => {
                          const locked = isTradeLocked(tile);
                          return (
                            <label
                              key={tile.name}
                              className={`trade-option ${tradeGiveTileNames.includes(tile.name) ? "selected" : ""} ${locked ? "locked" : ""}`}
                            >
                              <input
                                type="checkbox"
                                disabled={locked}
                                checked={tradeGiveTileNames.includes(tile.name)}
                                onChange={() => !locked && toggleTradeTile(tile.name, "give")}
                              />
                              <span>{tile.displayName ?? tile.name}</span>
                              {locked && <small>بيع المباني الأول</small>}
                            </label>
                          );
                        })()
                      ))}
                    </div>
                  )}

                  <label className="trade-cash">
                    <span>المبلغ اللي هتدفعه</span>
                    <input
                      type="range"
                      min={0}
                      max={me?.coins ?? 0}
                      step={1}
                      value={tradeGiveCash}
                      onChange={(e) => setTradeGiveCash(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </label>
                </section>

                <section className="trade-box trade-box-take">
                  <div className="trade-box-title">
                    <span>آخذ</span>
                    <strong>{formatMoney(tradeTakeCash)}</strong>
                  </div>
                  {tradeTargetId ? (
                    tradeTakeOptions.length === 0 ? (
                      <div className="empty-note">اللاعب المختار ما عندوش عقارات.</div>
                    ) : (
                      <div className="trade-option-list">
                        {tradeTakeOptions.map((tile) => (
                          (() => {
                            const locked = isTradeLocked(tile);
                            return (
                              <label
                                key={tile.name}
                                className={`trade-option ${tradeTakeTileNames.includes(tile.name) ? "selected" : ""} ${locked ? "locked" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={locked}
                                  checked={tradeTakeTileNames.includes(tile.name)}
                                  onChange={() => !locked && toggleTradeTile(tile.name, "take")}
                                />
                                <span>{tile.displayName ?? tile.name}</span>
                                {locked && <small>بيع المباني الأول</small>}
                              </label>
                            );
                          })()
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="empty-note">اختر لاعب أول.</div>
                  )}

                  <label className="trade-cash">
                    <span>المبلغ اللي هتاخده</span>
                    <input
                      type="range"
                      min={0}
                      max={tradeTarget?.coins ?? 0}
                      step={1}
                      value={tradeTakeCash}
                      onChange={(e) => setTradeTakeCash(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </label>
                </section>
              </div>

              <div className="trade-actions">
                <button
                  className="btn-buy"
                  disabled={!tradeTargetId}
                  onClick={submitTrade}
                >
                  {isCounterOffer ? "إرسال الفصال" : "تأكيد التجارة"}
                </button>
                <button className="btn-skip" onClick={closeTradeDialog}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {incomingTrade && !isCounterOffer && (
        <div className="overlay open">
          <div className="modal wide trade-modal">
            <div className="modal-title">طلب تجارة</div>
            <div className="modal-sub">
              {incomingTradeSender?.name ?? "لاعب"} بعتلك عرض. راجع اللي هتاخده واللي هتديه.
            </div>
            <div className="trade-summary-grid">
              <div className="trade-summary-box trade-summary-gain">
                <span>هتاخد</span>
                <strong>{formatTileList(incomingTrade.giveTileNames)}</strong>
                <small>{formatMoney(incomingTrade.giveCash)}</small>
              </div>
              <div className="trade-summary-box trade-summary-give">
                <span>هتدي</span>
                <strong>{formatTileList(incomingTrade.takeTileNames)}</strong>
                <small>{formatMoney(incomingTrade.takeCash)}</small>
              </div>
            </div>
            <div className="trade-counter-note">الفصال يفتح العرض معكوس وجاهز للتعديل قبل الإرسال.</div>
            <div className="trade-actions">
              <button
                className="btn-buy"
                onClick={() => myId && dispatch({ type: "ACCEPT_TRADE", playerId: myId })}
              >
                موافقة
              </button>
              <button
                className="trade-counter-btn"
                onClick={openCounterTrade}
              >
                فصال
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