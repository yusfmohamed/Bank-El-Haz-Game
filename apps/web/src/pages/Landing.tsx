import { useState } from "react";
import { getSavedNickname } from "../lib/identity";

interface LandingProps {
  error: string | null;
  onCreateRoom: (nickname: string) => void;
  onJoinRoom: (code: string, nickname: string) => void;
}

export default function Landing({ error, onCreateRoom, onJoinRoom }: LandingProps) {
  const [nickname, setNickname] = useState(getSavedNickname());
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [roomCode, setRoomCode] = useState("");

  const canSubmit = nickname.trim().length >= 2;

  return (
    <div className="screen-center">
      <div className="card">
        {/*
          LOGO — drop your file at apps/web/public/assets/logo.png and it
          appears here automatically, no code changes needed.
        */}
        <img src="/assets/logo.png" alt="بنك الحظ" className="logo" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />

        {/* <div className="brand-title">بنك الحظ</div> */}
        {/* <div className="brand-subtitle">اللعبة المصرية اللي مليهاش آخر</div> */}

        {error && <div className="error-note">{error}</div>}

        <label className="field-label">اسمك في اللعبة</label>
        <input
          className="text-input"
          placeholder="اكتب اسمك هنا..."
          value={nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
        />

        {mode === "choose" && (
          <>
            <button className="btn-primary" disabled={!canSubmit} onClick={() => onCreateRoom(nickname.trim())}>
              🎲 اعمل غرفة جديدة
            </button>
            <button className="btn-secondary" onClick={() => setMode("join")}>
              🔑 عندي كود غرفة
            </button>
          </>
        )}

        {mode === "join" && (
          <>
            <label className="field-label">كود الغرفة</label>
            <input
              className="text-input"
              placeholder="مثال: A7K2Q"
              value={roomCode}
              maxLength={5}
              style={{ textAlign: "center", letterSpacing: "0.2em", fontSize: 20 }}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button
              className="btn-primary"
              disabled={!canSubmit || roomCode.trim().length < 5}
              onClick={() => onJoinRoom(roomCode.trim(), nickname.trim())}
            >
              🚪 ادخل الغرفة
            </button>
            <button className="btn-secondary" onClick={() => setMode("choose")}>
              ← رجوع
            </button>
          </>
        )}

        <div className="hint-note">هتختار لونك جوه غرفة الانتظار</div>
      </div>
    </div>
  );
}
