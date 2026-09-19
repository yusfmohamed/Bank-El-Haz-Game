import { useEffect } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import Landing from "./pages/Landing";
import Room from "./pages/Room";
import { playClick } from "./lib/sound";

export default function App() {
  const { lobby, gameState, error, myId, resuming, createRoom, joinRoom, setColor, startGame, dispatch } = useGameSocket();

  // One delegated listener covers every button, on every screen, forever —
  // new buttons added later automatically get the click sound for free.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("button")) playClick();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (resuming && !lobby && !gameState) {
    return (
      <div className="screen-center">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="brand-title" style={{ fontSize: 22 }}>بنك الحظ</div>
          <div className="brand-subtitle" style={{ marginBottom: 0 }}>بنرجعك للعبة...</div>
        </div>
      </div>
    );
  }

  if (!lobby) {
    return <Landing error={error} onCreateRoom={createRoom} onJoinRoom={joinRoom} />;
  }

  return (
    <Room lobby={lobby} gameState={gameState} myId={myId} dispatch={dispatch} onSetColor={setColor} onStartGame={startGame} />
  );
}