import { useState } from "react";
import type { PlayerColor } from "@bank-el-hazz/engine";
import { getSavedNickname } from "../lib/identity";
import CharacterPicker from "../components/CharacterPicker";

interface LandingProps {
  error: string | null;
  onCreateRoom: (nickname: string, color: PlayerColor) => void;
  onJoinRoom: (code: string, nickname: string, color: PlayerColor) => void;
}

type Step = "choose" | "join" | "character";

export default function Landing({ error, onCreateRoom, onJoinRoom }: LandingProps) {
  const [nickname, setNickname] = useState(getSavedNickname());
  const [step, setStep] = useState<Step>("choose");
  const [roomCode, setRoomCode] = useState("");

  const canSubmit = nickname.trim().length >= 2;

  if (step === "character") {
    return (
      <CharacterPicker
        onBack={() => setStep(roomCode ? "join" : "choose")}
        onConfirm={(color) => {
          if (roomCode) onJoinRoom(roomCode.trim(), nickname.trim(), color);
          else onCreateRoom(nickname.trim(), color);
        }}
      />
    );
  }

  return (
    <div className="screen-center">
      <div className="card">
        {/*
          LOGO — drop your file at apps/web/public/assets/logo.png and it
          appears here automatically, no code changes needed. Any future
          images go in that same public/assets folder.
        */}
        <img src="/assets/logo.png" alt="بنك الحظ" className="logo" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />

        <div className="brand-title">بنك الحظ</div>
        <div className="brand-subtitle">اللعبة المصرية اللي مليهاش آخر</div>

        {error && <div className="error-note">{error}</div>}

        <label className="field-label">اسمك في اللعبة</label>
        <input
          className="text-input"
          placeholder="اكتب اسمك هنا..."
          value={nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
        />

        {step === "choose" && (
          <>
            <button className="btn-primary" disabled={!canSubmit} onClick={() => { setRoomCode(""); setStep("character"); }}>
              🎲 اعمل غرفة جديدة
            </button>
            <button className="btn-secondary" onClick={() => setStep("join")}>
              🔑 عندي كود غرفة
            </button>
          </>
        )}

        {step === "join" && (
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
              onClick={() => setStep("character")}
            >
              🚪 التالي — اختار شخصيتك
            </button>
            <button className="btn-secondary" onClick={() => setStep("choose")}>
              ← رجوع
            </button>
          </>
        )}
      </div>
    </div>
  );
}
