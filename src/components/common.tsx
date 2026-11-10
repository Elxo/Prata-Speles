import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { TimerState } from '../types';
import { timerRemaining } from '../lib/engine';

/** Atlikušais taimera laiks (ms); pārzīmē ~10× sekundē, kamēr taimeris iet. */
export function useRemaining(timer: TimerState): number {
  const [, force] = useState(0);
  useEffect(() => {
    if (!timer.startedAt) return;
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [timer.startedAt]);
  return timerRemaining(timer);
}

/** Skaitlis, kas izmaiņas gadījumā "aizskrien" līdz jaunajai vērtībai. */
export function AnimatedNumber({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (value - a) * eased);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown}</>;
}

/** Komandas logotips vai iniciāļi krāsainā aplī. */
export function TeamBadge({
  name,
  color,
  logo,
  size = 48,
  className = '',
}: {
  name: string;
  color: string;
  logo?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: logo ? '#000' : `radial-gradient(circle at 30% 30%, ${color}, ${shade(color, -0.45)})`,
        boxShadow: `0 0 0 ${Math.max(2, size / 24)}px ${color}`,
      }}
    >
      {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

/** Aptumšo/izgaišina hex krāsu (-1..1). */
export function shade(hex: string, amount: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const ch = m.slice(1).map((x) => parseInt(x, 16));
  const out = ch.map((c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount));
  return '#' + out.map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6" onMouseDown={onClose}>
      <div
        className={`card mt-10 w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
