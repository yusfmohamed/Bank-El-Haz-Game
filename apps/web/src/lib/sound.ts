// ─────────────────────────────────────────────────────────────────────────
// Lightweight sound effects, synthesized with the Web Audio API. No .mp3/.wav
// files needed, so there's nothing extra to download or ship.
//
// Want real recorded sound effects instead? Drop files into
// apps/web/public/assets/sounds/ (e.g. click.mp3, coin.mp3) and swap the
// bodies of playClick()/playCoin() below for a simple:
//   new Audio("/assets/sounds/click.mp3").play();
// ─────────────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

let soundEnabled = true;
export function setSoundEnabled(v: boolean) { soundEnabled = v; }
export function isSoundEnabled() { return soundEnabled; }

function tone(freq: number, startTime: number, duration: number, type: OscillatorType, gainPeak: number) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// A short, dry blip — the classic "UI click" feel.
export function playClick() {
  if (!soundEnabled) return;
  try {
    const c = getCtx();
    if (c.state === "suspended") c.resume();
    tone(680, c.currentTime, 0.05, "square", 0.045);
  } catch {
    // Audio unavailable (autoplay policy, no audio device, etc.) — fail silently.
  }
}

// Two quick ascending notes — the classic "cha-ching" coin pickup.
export function playCoin() {
  if (!soundEnabled) return;
  try {
    const c = getCtx();
    if (c.state === "suspended") c.resume();
    const now = c.currentTime;
    tone(880, now, 0.12, "triangle", 0.08);
    tone(1318.5, now + 0.06, 0.18, "triangle", 0.09);
  } catch {
    // Audio unavailable — fail silently.
  }
}