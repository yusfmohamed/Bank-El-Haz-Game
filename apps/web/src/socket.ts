import { io, Socket } from "socket.io-client";

// If VITE_SERVER_URL is set, use it (useful for local dev with `vite` on
// port 5173 talking to the server on 4000). Otherwise connect to the same
// origin the page was loaded from — this is what makes a single tunnel URL
// work, since the server serves this built app itself.
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export const socket: Socket = SERVER_URL
  ? io(SERVER_URL, { autoConnect: true })
  : io({ autoConnect: true });
