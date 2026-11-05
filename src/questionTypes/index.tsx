// ─────────────────────────────────────────────────────────────
//  Jautājumu tipu reģistrs.
//  Jauna tipa pievienošana:
//    1) pievieno nosaukumu QuestionType (types.ts);
//    2) pievieno ierakstu QUESTION_TYPES ar ekrāna komponenti,
//       pults vadību un redaktora laukiem.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, type FC } from 'react';
import type { Question, QuestionType } from '../types';
import type { PublicQuestion, PublicView } from '../lib/publicView';
import { act, imageRevealMore, mediaCommand } from '../lib/engine';
import { OPTION_LETTERS, seededOrder } from '../lib/util';
import { IS_PREVIEW } from '../lib/env';

export interface ScreenProps {
  q: PublicQuestion;
  view: PublicView;
}

export interface HostProps {
  q: Question;
  imageStep: number;
  steps: number;
}

export interface QuestionTypeDef {
  label: string;
  icon: string;
  /** Vizuālā daļa lielajā ekrānā (zem jautājuma teksta). */
  Screen?: FC<ScreenProps>;
  /** Papildu pogas vadītāja pultī. */
  Host?: FC<HostProps>;
  /** Kuri papildu lauki redzami redaktorā. */
  editor: { options?: boolean; media?: 'image' | 'audio' | 'video'; author?: boolean; revealSteps?: boolean };
}

// ── Atbilžu varianti ────────────────────────────────────────

const ChoiceScreen: FC<ScreenProps> = ({ q, view }) => {
  if (!q.options) return null;
  return (
    <div className="grid w-full grid-cols-2 gap-6">
      {q.options.map((opt, i) => {
        const correct = view.revealed && q.correctOption === i;
        const dim = view.revealed && q.correctOption !== i;
        return (
          <div
            key={i}
            className={`anim-slide flex items-center gap-6 rounded-3xl border-4 px-8 py-6 text-[44px] leading-tight font-extrabold transition-all duration-700 ${
              correct
                ? 'scale-105 border-emerald-300 bg-emerald-500/80 shadow-[0_0_80px_rgba(16,185,129,0.7)]'
                : dim
                  ? 'border-white/10 bg-white/5 opacity-40'
                  : 'glass'
            }`}
            style={{ animationDelay: `${0.25 + i * 0.12}s` }}
          >
            <span
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-5xl font-black ${correct ? 'bg-white text-emerald-600' : 'bg-gold text-[#1b1040]'}`}
            >
              {OPTION_LETTERS[i]}
            </span>
            <span>{opt}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Attēls ar pakāpenisku atklāšanu ─────────────────────────

const COLS = 5;
const ROWS = 4;

const ImageScreen: FC<ScreenProps> = ({ q, view }) => {
  if (!q.media) return null;
  const total = COLS * ROWS;
  const steps = q.revealSteps;
  const visible = view.revealed || steps <= 0 ? total : Math.floor((total * Math.min(view.imageStep, steps)) / steps);
  const order = seededOrder(q.id, total);
  const hidden = new Set(order.slice(visible));
  return (
    <div className="anim-pop relative h-[460px] overflow-hidden rounded-3xl border-4 border-white/20 shadow-2xl">
      <img src={q.media} alt="" className="h-full w-auto max-w-[1400px] object-contain" />
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS},1fr)`, gridTemplateRows: `repeat(${ROWS},1fr)` }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="border border-[#2a1a60] transition-all duration-700"
            style={{
              background: 'linear-gradient(135deg,#3b2380,#1b1040)',
              opacity: hidden.has(i) ? 1 : 0,
              visibility: hidden.has(i) ? 'visible' : 'hidden',
              transform: hidden.has(i) ? 'scale(1)' : 'scale(0.4) rotate(20deg)',
            }}
          >
            {hidden.has(i) && <div className="flex h-full items-center justify-center text-6xl font-black text-white/15">?</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const ImageHost: FC<HostProps> = ({ imageStep, steps }) => {
  if (steps <= 0) return null;
  const done = imageStep >= steps;
  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-primary" disabled={done} onClick={() => act(imageRevealMore)}>
        🧩 Atklāt vairāk ({Math.min(imageStep, steps)}/{steps})
      </button>
      <button className="btn" disabled={done} onClick={() => act((s) => void (s.live.imageStep = 999))}>
        Atklāt visu attēlu
      </button>
    </div>
  );
};

// ── Audio / video ───────────────────────────────────────────

function useMediaControl(ref: React.RefObject<HTMLMediaElement | null>, view: PublicView) {
  const last = useRef(view.media.n);
  useEffect(() => {
    const el = ref.current;
    if (!el || view.media.n <= last.current) return;
    last.current = view.media.n;
    if (view.media.cmd === 'play') void el.play().catch(() => {});
    if (view.media.cmd === 'pause') el.pause();
    if (view.media.cmd === 'stop') {
      el.pause();
      el.currentTime = 0;
    }
  }, [ref, view.media]);
}

const AudioScreen: FC<ScreenProps> = ({ q, view }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useMediaControl(ref, view);
  const playing = view.media.cmd === 'play';
  return (
    <div className="anim-pop relative flex h-[300px] items-end justify-center gap-3">
      {q.media && <audio ref={ref} src={q.media} muted={IS_PREVIEW || !view.sound} preload="auto" />}
      {Array.from({ length: 24 }, (_, i) => (
        <div
          key={i}
          className="w-8 origin-bottom rounded-t-lg bg-gradient-to-t from-hot to-gold transition-transform"
          style={{
            height: 80 + ((i * 53) % 200),
            transform: playing ? undefined : 'scaleY(0.15)',
            animation: playing ? `eq ${0.45 + (i % 5) * 0.13}s ease-in-out infinite` : undefined,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center text-[120px]">🎵</div>
    </div>
  );
};

const VideoScreen: FC<ScreenProps> = ({ q, view }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useMediaControl(ref, view);
  if (!q.media) return null;
  return (
    <video
      ref={ref}
      src={q.media}
      muted={IS_PREVIEW || !view.sound}
      preload="auto"
      className="anim-pop h-[460px] max-w-[1400px] rounded-3xl border-4 border-white/20 bg-black shadow-2xl"
    />
  );
};

const MediaHost: FC<HostProps> = ({ q }) => {
  if (!q.media) return <span className="text-sm text-amber-400">⚠ Nav pievienots faila URL</span>;
  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-good" onClick={() => act((s) => mediaCommand(s, 'play'))}>
        ▶ Atskaņot
      </button>
      <button className="btn" onClick={() => act((s) => mediaCommand(s, 'pause'))}>
        ⏸ Pauze
      </button>
      <button className="btn" onClick={() => act((s) => mediaCommand(s, 'stop'))}>
        ⏹ No sākuma
      </button>
    </div>
  );
};

// ── Reģistrs ────────────────────────────────────────────────

export const QUESTION_TYPES: Record<QuestionType, QuestionTypeDef> = {
  text: { label: 'Teksta jautājums', icon: '💬', editor: {} },
  choice: { label: 'Atbilžu varianti A/B/C/D', icon: '🔠', Screen: ChoiceScreen, editor: { options: true } },
  image: {
    label: 'Attēls',
    icon: '🖼️',
    Screen: ImageScreen,
    Host: ImageHost,
    editor: { media: 'image', revealSteps: true },
  },
  audio: { label: 'Audio', icon: '🎵', Screen: AudioScreen, Host: MediaHost, editor: { media: 'audio' } },
  video: { label: 'Video', icon: '🎬', Screen: VideoScreen, Host: MediaHost, editor: { media: 'video' } },
  audience: { label: 'Skatītāju jautājums', icon: '🙋', editor: { author: true } },
};

export const QUESTION_TYPE_LIST = Object.entries(QUESTION_TYPES) as [QuestionType, QuestionTypeDef][];
