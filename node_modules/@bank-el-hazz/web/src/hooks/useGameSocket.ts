import { useCallback, useEffect, useState } from "react";
import type { GameAction, GameState } from "@bank-el-hazz/engine";
import { socket } from "../socket";

export interface LobbyInfo {
  code: string;
  hostId: string;
  players: { id: string; name: string }[];
}

export function useGameSocket() {
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onLobbyUpdate(info: LobbyInfo) { setLobby(info); }
    function onGameState(state: GameState) { setGameState(state); }
    function onRoomCreated({ code }: { code: string }) {
      setLobby((prev) => (prev ? { ...prev, code } : { code, hostId: socket.id!, players: [] }));
    }
    function onRoomError({ message }: { message: string }) { setError(message); }

    socket.on("lobby_update", onLobbyUpdate);
    socket.on("game_state", onGameState);
    socket.on("room_created", onRoomCreated);
    socket.on("room_error", onRoomError);

    return () => {
      socket.off("lobby_update", onLobbyUpdate);
      socket.off("game_state", onGameState);
      socket.off("room_created", onRoomCreated);
      socket.off("room_error", onRoomError);
    };
  }, []);

  const createRoom = useCallback((nickname: string) => {
    setError(null);
    socket.emit("create_room", { nickname });
  }, []);

  const joinRoom = useCallback((code: string, nickname: string) => {
    setError(null);
    socket.emit("join_room", { code, nickname });
  }, []);

  const startGame = useCallback(() => {
    if (!lobby) return;
    setError(null);
    socket.emit("start_game", { code: lobby.code });
  }, [lobby]);

  const dispatch = useCallback((action: GameAction) => {
    if (!lobby) return;
    socket.emit("game_action", { code: lobby.code, action });
  }, [lobby]);

  const myId = socket.id;

  return { lobby, gameState, error, myId, createRoom, joinRoom, startGame, dispatch };
}
