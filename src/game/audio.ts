/** Küçük WebAudio sentez sesleri — dosya yok, ilk kullanıcı etkileşiminde açılır. */
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

function tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.06, slide = 0) {
  const c = getCtx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
}
const seq = (notes: number[], step = 0.09, type: OscillatorType = "square") => notes.forEach((n, i) => setTimeout(() => tone(n, 0.16, type, 0.05), i * step * 1000));

export const sfx = {
  place: (muted: boolean) => { if (!muted) tone(660, 0.08, "square", 0.05); },
  remove: (muted: boolean) => { if (!muted) tone(330, 0.12, "square", 0.05, -120); },
  error: (muted: boolean) => { if (!muted) tone(160, 0.18, "sawtooth", 0.05, -60); },
  collect: (muted: boolean) => { if (!muted) seq([520, 780]); },
  warn: (muted: boolean) => { if (!muted) { tone(220, 0.5, "triangle", 0.06, -120); setTimeout(() => tone(220, 0.5, "triangle", 0.06, -120), 600); } },
  block: (muted: boolean) => { if (!muted) tone(1200, 0.15, "sine", 0.06, 600); },
  hit: (muted: boolean) => { if (!muted) tone(90, 0.35, "sawtooth", 0.09, -60); },
  mission: (muted: boolean) => { if (!muted) seq([523, 659, 784, 1047], 0.08); },
  unlock: () => getCtx(),
};
