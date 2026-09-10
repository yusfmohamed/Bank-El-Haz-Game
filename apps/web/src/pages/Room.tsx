import type { GameState, GameAction } from "@bank-el-hazz/engine";
import { MAX_PLAYERS, colorHex } from "@bank-el-hazz/engine";
import type { LobbyInfo } from "../hooks/useGameSocket";
import GameScreen from "./GameScreen";

interface RoomProps {
  lobby: LobbyInfo;
  gameState: GameState | null;
  myId: string | undefined;
  dispatch: (action: GameAction) => void;
  onStartGame: () => void;
}

export default function Room({ lobby, gameState, myId, dispatch, onStartGame }: RoomProps) {
  const isHost = lobby.hostId === myId;

  if (gameState) {
    return <GameScreen gameState={gameState} myId={myId} dispatch={dispatch} />;
  }

  return (
    <div className="screen-center">
      <div className="card">
        <div className="brand-title">غرفة الانتظار</div>
        <div className="brand-subtitle">شارك الكود ده مع أصحابك</div>

        <div className="room-code-display">{lobby.code}</div>

        <label className="field-label">اللاعبين ({lobby.players.length}/{MAX_PLAYERS})</label>
        <div style={{ marginBottom: 20 }}>
          {lobby.players.map((p) => (
            <div key={p.id} className="lobby-player-row">
              <span className="color-swatch" style={{ background: colorHex(p.color), width: 16, height: 16 }} />
              <span>{p.id === lobby.hostId ? "👑" : ""}</span>
              <span style={{ fontWeight: 700 }}>{p.name}</span>
              {p.id === myId && <span style={{ color: "var(--gold)", marginRight: "auto" }}>(انت)</span>}
            </div>
          ))}
        </div>

        {isHost ? (
          <button className="btn-primary" disabled={lobby.players.length < 2} onClick={onStartGame}>
            {lobby.players.length < 2 ? "محتاج لاعب تاني على الأقل" : "🚀 ابدأ اللعبة"}
          </button>
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-soft)", fontSize: 13 }}>
            في انتظار صاحب الغرفة يبدأ اللعبة...
          </div>
        )}
      </div>
    </div>
  );
}
