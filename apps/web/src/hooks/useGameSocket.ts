import { useCallback, useEffect, useRef, useState } from "react";
import type { GameAction, GameState, PlayerColor } from "@bank-el-hazz/engine";
import { socket } from "../socket";
import { getPlayerToken, saveNickname, getSavedNickname, saveLastRoom, getLastRoom, clearLastRoom } from "../lib/identity";

export interface LobbyPlayerInfo {
  id: string;
  name: string;
  color: PlayerColor;
}
export interface LobbyInfo {
  code: string;
  hostId: string;
  players: LobbyPlayerInfo[];
}

export function useGameSocket() {
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(!!getLastRoom());

  const lobbyRef = useRef<LobbyInfo | null>(null);
  useEffect(() => { lobbyRef.current = lobby; }, [lobby]);

  const myToken = getPlayerToken();

  useEffect(() => {
    function onLobbyUpdate(info: LobbyInfo) { setResuming(false); setError(null); setLobby(info); saveLastRoom(info.code); }
    function onGameState(state: GameState) { setResuming(false); setError(null); setGameState(state); }
    function onRoomCreated({ code }: { code: string }) {
      setLobby((prev) => (prev ? { ...prev, code } : { code, hostId: myToken, players: [] }));
      saveLastRoom(code);
    }
    function onRoomError({ message }: { message: string }) {
      setResuming(false);
      setError(message);
      clearLastRoom(); // whatever we tried to resume no longer exists / isn't valid — stop retrying it
    }

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
  }, [myToken]);

  // Auto-resume: on every connect (first load, or reconnect after a network
  // blip / tab wake-up), if this browser was last seen in a room, try to
  // rejoin it. The server recognizes our stable token and treats this as a
  // reconnect if a game is already running, or a normal lobby rejoin
  // otherwise. Harmless no-op if the room no longer exists.
  useEffect(() => {
    function tryResume() {
      const code = lobbyRef.current?.code || getLastRoom();
      if (!code) return;
      socket.emit("join_room", { token: myToken, code, nickname: getSavedNickname() || "لاعب", color: undefined });
    }
    if (socket.connected) tryResume();
    socket.on("connect", tryResume);
    return () => { socket.off("connect", tryResume); };
  }, [myToken]);

  const createRoom = useCallback((nickname: string) => {
    setError(null);
    saveNickname(nickname);
    socket.emit("create_room", { token: myToken, nickname });
  }, [myToken]);

  const joinRoom = useCallback((code: string, nickname: string) => {
    setError(null);
    saveNickname(nickname);
    socket.emit("join_room", { token: myToken, code, nickname });
  }, [myToken]);

  const setColor = useCallback((color: PlayerColor) => {
    if (!lobby) return;
    setError(null);
    socket.emit("set_color", { code: lobby.code, color });
  }, [lobby]);

  const startGame = useCallback(() => {
    if (!lobby) return;
    setError(null);
    socket.emit("start_game", { code: lobby.code });
  }, [lobby]);

  const dispatch = useCallback((action: GameAction) => {
    if (!lobby) return;
    socket.emit("game_action", { code: lobby.code, action });
  }, [lobby]);

  return { lobby, gameState, error, myId: myToken, resuming, createRoom, joinRoom, setColor, startGame, dispatch };
}
