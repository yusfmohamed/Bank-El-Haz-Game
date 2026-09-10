const TOKEN_KEY = "bank-el-hazz:player-token";
const LAST_ROOM_KEY = "bank-el-hazz:last-room";
const NICKNAME_KEY = "bank-el-hazz:nickname";

function randomToken(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getPlayerToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = randomToken();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function saveNickname(name: string) {
  localStorage.setItem(NICKNAME_KEY, name);
}
export function getSavedNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) || "";
}

export function saveLastRoom(code: string) {
  localStorage.setItem(LAST_ROOM_KEY, code);
}
export function getLastRoom(): string | null {
  return localStorage.getItem(LAST_ROOM_KEY);
}
export function clearLastRoom() {
  localStorage.removeItem(LAST_ROOM_KEY);
}
