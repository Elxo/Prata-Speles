import { useEffect, useRef, useState } from 'react';
import type { TimerState, Side, LiveEvent } from '../../types';
import type { PublicTeam } from '../../lib/publicView';
import { AnimatedNumber, TeamBadge, shade, useRemaining } from '../../components/common';
import { playSound } from '../../lib/sounds';
import { formatClock } from '../../lib/util';

// ── Taimeris ────────────────────────────────────────────────

export function TimerRing({ timer, size = 260 }: { timer: TimerState; size?: number }) {
  const remaining = useRemaining(timer);
  const secs = Math.ceil(remaining / 1000);
  const frac = timer.durationMs > 0 ? remaining / timer.durationMs : 0;
  const danger = secs <= 5;
  const warn = secs <= 10;
  const color = remaining <= 0 ? '#ff2d55' : danger ? '#ff2d55' : warn ? '#ffb020' : '#2ec4ff';
  const r = 44;
  const c = 2 * Math.PI * r;
  const running = !!timer.startedAt && remaining > 0;
  return (
    <div
      className={`relative ${danger && running ? 'anim-pulse' : ''}`}
      style={{ width: size, height: size, filter: `drop-shadow(0 0 ${danger ? 40 : 20}px ${color}88)` }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {remaining <= 0 ? (
          <span className="anim-pop font-black text-[#ff2d55]" style={{ fontSize: size * 0.2 }}>
            LAIKS!
          </span>
        ) : (
          <span className="font-black tabular-nums" style={{ fontSize: size * (secs < 60 ? 0.4 : 0.24), color: danger ? '#ff6b86' : 'white' }}>
            {formatClock(secs)}
          </span>
        )}
        {!running && remaining > 0 && remaining < timer.durationMs && (
          <span className="text-xl font-bold text-white/60">PAUZE</span>
        )}
      </div>
    </div>
  );
}

/** Tikšķi pēdējās 5 sekundēs un signāls, kad laiks beidzies. */
export function useTimerSounds(timer: TimerState, enabled: boolean) {
  const lastSec = useRef<number | null>(null);
  useEffect(() => {
    if (!timer.startedAt) {
      lastSec.current = null;
      return;
    }
    const id = setInterval(() => {
      const elapsed = timer.elapsedMs + Date.now() - timer.startedAt!;
      const remaining = Math.max(0, timer.durationMs - elapsed);
      const sec = Math.ceil(remaining / 1000);
      if (sec === lastSec.current) return;
      const prev = lastSec.current;
      lastSec.current = sec;
      if (!enabled || prev === null) return;
      if (sec === 0) playSound('timeup');
      else if (sec <= 5) playSound('tick');
    }, 50);
    return () => clearInterval(id);
  }, [timer.startedAt, timer.elapsedMs, timer.durationMs, enabled]);
}

// ── Komandas panelis ────────────────────────────────────────

export function TeamPanel({
  team,
  side,
  matchPoints,
  active,
  event,
  extra,
  showMatchPoints = true,
}: {
  team: PublicTeam;
  side: Side;
  matchPoints: number;
  active: boolean;
  event: LiveEvent | null;
  extra?: React.ReactNode;
  showMatchPoints?: boolean;
}) {
  const [floats, setFloats] = useState<{ n: number; delta: number }[]>([]);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const seen = useRef(event?.n ?? 0);

  useEffect(() => {
    if (!event || event.n <= seen.current) return;
    seen.current = event.n;
    if (event.side !== side) return;
    if (event.kind === 'correct' || event.kind === 'wrong' || event.kind === 'adjust') {
      const good = event.kind === 'correct' || (event.kind === 'adjust' && (event.delta ?? 0) > 0);
      setFlash(good ? 'good' : 'bad');
      setTimeout(() => setFlash(null), 900);
      if (event.delta) {
        const item = { n: event.n, delta: event.delta };
        setFloats((f) => [...f, item]);
        setTimeout(() => setFloats((f) => f.filter((x) => x !== item)), 2100);
      }
    }
  }, [event, side]);

  const dir = side === 0 ? 'flex-row' : 'flex-row-reverse';
  return (
    <div
      className={`relative flex items-center gap-6 rounded-[32px] px-8 py-5 transition-all duration-300 ${dir} ${flash === 'bad' ? 'anim-shake' : ''} ${active ? 'anim-glow' : ''}`}
      style={
        {
          background: `linear-gradient(${side === 0 ? 90 : 270}deg, ${shade(team.color, -0.35)}ee, ${shade(team.color, -0.7)}cc)`,
          border: `4px solid ${flash === 'good' ? '#4ade80' : flash === 'bad' ? '#ff2d55' : active ? '#ffcc33' : team.color}`,
          '--glow': active ? 'rgba(255,204,51,0.55)' : `${team.color}88`,
          transform: active ? 'scale(1.03)' : undefined,
        } as React.CSSProperties
      }
    >
      <TeamBadge name={team.name} color={team.color} logo={team.logo} size={110} />
      <div className={`flex min-w-0 flex-1 flex-col ${side === 1 ? 'items-end text-right' : ''}`}>
        <div className="truncate text-[44px] leading-tight font-black">{team.name}</div>
        <div className="flex items-center gap-3 text-2xl font-bold text-white/70">
          {showMatchPoints && <span>šajā spēlē: {matchPoints}</span>}
          {active && <span className="rounded-full bg-gold px-3 py-0.5 text-xl font-black text-black">ATBILD</span>}
          {extra}
        </div>
      </div>
      <div className="relative text-center">
        <div className="text-lg font-bold tracking-widest text-white/60 uppercase">Kopā</div>
        <div className="text-[96px] leading-none font-black tabular-nums text-glow">
          <AnimatedNumber value={team.score} />
        </div>
        {floats.map((f) => (
          <div
            key={f.n}
            className={`anim-float pointer-events-none absolute top-0 left-1/2 text-7xl font-black ${f.delta > 0 ? 'text-emerald-300' : 'text-rose-400'}`}
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.6)' }}
          >
            {f.delta > 0 ? '+' : '−'}
            {Math.abs(f.delta)}
          </div>
        ))}
      </div>
    </div>
  );
}
