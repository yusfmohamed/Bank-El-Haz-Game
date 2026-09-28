import { io, Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? "http://localhost:4000" : window.location.origin);

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
});
