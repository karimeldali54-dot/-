let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, delay: number, gainValue: number) {
  const audio = context();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const start = audio.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playLock() {
  tone(220, 0.12, 0, 0.04);
}

export function playReveal(kind: "win" | "lose" | "tie") {
  tone(196, 0.16, 0, 0.045);
  tone(kind === "win" ? 392 : kind === "tie" ? 294 : 164, 0.28, 0.12, 0.05);
}

export function playCurse() {
  tone(90, 0.18, 0, 0.06);
  tone(70, 0.28, 0.12, 0.05);
}

export function playGold() {
  tone(523, 0.12, 0, 0.04);
  tone(659, 0.16, 0.1, 0.045);
  tone(784, 0.22, 0.2, 0.04);
}

export function playEnd(kind: "win" | "lose" | "tie") {
  if (kind === "lose") {
    tone(174, 0.4, 0, 0.05);
    return;
  }
  if (kind === "tie") {
    tone(262, 0.22, 0, 0.045);
    tone(262, 0.28, 0.18, 0.045);
    return;
  }
  tone(262, 0.18, 0, 0.05);
  tone(330, 0.18, 0.16, 0.05);
  tone(392, 0.36, 0.32, 0.06);
}
