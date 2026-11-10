// ─────────────────────────────────────────────────────────────
//  Skaņas efekti, sintezēti ar WebAudio (bez ārējiem failiem).
// ─────────────────────────────────────────────────────────────

export type SoundName = 'correct' | 'wrong' | 'timeup' | 'tick' | 'fanfare' | 'win' | 'reveal' | 'bets' | 'show' | 'golden';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Jāizsauc pēc lietotāja klikšķa (pārlūka autoplay politika). */
export function unlockAudio() {
  const c = audio();
  if (c?.state === 'suspended') void c.resume();
}

export function audioUnlocked(): boolean {
  return ctx?.state === 'running';
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number) {
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(start: number, dur: number, vol = 0.2, filterFreq = 1200) {
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime + start;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

const chord = (notes: number[], start: number, dur: number, type: OscillatorType = 'triangle', vol = 0.18) =>
  notes.forEach((n) => tone(n, start, dur, type, vol));

const SOUNDS: Record<SoundName, () => void> = {
  correct: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.35, 'triangle', 0.28));
  },
  wrong: () => {
    tone(196, 0, 0.55, 'sawtooth', 0.22, 110);
    tone(185, 0.02, 0.55, 'square', 0.12, 100);
  },
  timeup: () => {
    chord([220, 277.18, 329.63], 0, 0.9, 'sawtooth', 0.14);
    chord([207.65, 261.63, 311.13], 0.25, 1.1, 'sawtooth', 0.14);
  },
  tick: () => {
    tone(1400, 0, 0.06, 'square', 0.15);
    noise(0, 0.03, 0.15, 3000);
  },
  reveal: () => {
    noise(0, 0.5, 0.15, 800);
    tone(300, 0, 0.5, 'sine', 0.2, 900);
    tone(880, 0.45, 0.4, 'triangle', 0.22);
  },
  show: () => {
    tone(440, 0, 0.18, 'triangle', 0.2, 660);
    tone(660, 0.12, 0.3, 'triangle', 0.2);
  },
  bets: () => {
    for (let i = 0; i < 14; i++) noise(i * 0.06, 0.05, 0.12 + i * 0.012, 400);
    chord([392, 493.88, 587.33], 0.9, 0.7, 'triangle', 0.18);
  },
  golden: () => {
    [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(f, i * 0.1, 0.6, 'sine', 0.2));
    chord([392, 493.88, 587.33], 0.4, 1.2, 'triangle', 0.12);
  },
  win: () => {
    chord([523.25, 659.25, 783.99], 0, 0.25);
    chord([587.33, 739.99, 880], 0.25, 0.25);
    chord([659.25, 830.61, 987.77, 1318.5], 0.5, 1.1);
  },
  fanfare: () => {
    const seq: [number[], number, number][] = [
      [[392, 523.25], 0, 0.18],
      [[392, 523.25], 0.2, 0.18],
      [[392, 523.25], 0.4, 0.18],
      [[523.25, 659.25, 783.99], 0.6, 0.6],
      [[466.16, 587.33, 698.46], 1.2, 0.3],
      [[523.25, 659.25, 783.99], 1.5, 0.3],
      [[587.33, 739.99, 880], 1.8, 0.3],
      [[659.25, 783.99, 1046.5, 1318.5], 2.1, 1.6],
    ];
    seq.forEach(([n, s, d]) => chord(n, s, d, 'sawtooth', 0.09));
    seq.forEach(([n, s, d]) => chord(n, s, d, 'triangle', 0.12));
    for (let i = 0; i < 10; i++) noise(2.1 + i * 0.12, 0.1, 0.08, 6000);
  },
};

export function playSound(name: SoundName) {
  try {
    unlockAudio();
    SOUNDS[name]();
  } catch (err) {
    console.warn('Skaņas kļūda', err);
  }
}
