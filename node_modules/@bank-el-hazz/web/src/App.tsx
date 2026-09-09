import { useGameSocket } from "./hooks/useGameSocket";
import Landing from "./pages/Landing";
import Room from "./pages/Room";

export default function App() {
  const { lobby, gameState, error, myId, createRoom, joinRoom, startGame, dispatch } = useGameSocket();

  if (!lobby) {
    return <Landing error={error} onCreateRoom={createRoom} onJoinRoom={joinRoom} />;
  }

  return <Room lobby={lobby} gameState={gameState} myId={myId} dispatch={dispatch} onStartGame={startGame} />;
}
