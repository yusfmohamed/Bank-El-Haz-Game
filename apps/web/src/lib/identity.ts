const TOKEN_KEY = "bank-el-hazz:player-token";
const LAST_ROOM_KEY = "bank-el-hazz:last-room";
const NICKNAME_KEY = "bank-el-hazz:nickname";

function randomToken(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// sessionStorage, NOT localStorage — this is the important part. localStorage
// is shared across every tab of the same browser, which meant two tabs
// opened to test multiplayer were silently treated as the same player. A
// page refresh within one tab still keeps the same sessionStorage (so
// reconnect-after-refresh still works); a brand new tab correctly gets its
// own identity, exactly like a different person joining.
export function getPlayerToken(): string {
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = randomToken();
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

// Nickname is harmless to share across tabs (just a convenience prefill),
// so it stays in localStorage.
export function saveNickname(name: string) {
  localStorage.setItem(NICKNAME_KEY, name);
}
export function getSavedNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) || "";
}

export function saveLastRoom(code: string) {
  sessionStorage.setItem(LAST_ROOM_KEY, code);
}
export function getLastRoom(): string | null {
  return sessionStorage.getItem(LAST_ROOM_KEY);
}
export function clearLastRoom() {
  sessionStorage.removeItem(LAST_ROOM_KEY);
}
