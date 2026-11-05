import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../../lib/store';
import { toPublicView, type PublicView } from '../../lib/publicView';
import { playSound, unlockAudio, type SoundName } from '../../lib/sounds';
import type { EventKind } from '../../types';
import { IS_PREVIEW } from '../../lib/env';
import { Stage } from '../../components/Stage';
import { useTimerSounds } from './parts';
import { QuestionScreen } from './QuestionScreen';
import {
  BracketScreen,
  LogoScreen,
  MatchIntroScreen,
  MatchResultScreen,
  RulesScreen,
  StandingsScreen,
  WinnerScreen,
} from './screens';

const EVENT_SOUND: Partial<Record<EventKind, SoundName>> = {
  correct: 'correct',
  wrong: 'wrong',
  reveal: 'reveal',
  fanfare: 'fanfare',
  win: 'win',
  bets: 'bets',
  show: 'show',
  golden: 'golden',
};

/** Atskaņo skaņu katram jaunam notikumam (bet ne tiem, kas notika pirms ekrāna atvēršanas). */
function useEventSounds(view: PublicView, enabled: boolean) {
  const seen = useRef(view.event?.n ?? 0);
  useEffect(() => {
    const e = view.event;
    if (!e || e.n <= seen.current) return;
    seen.current = e.n;
    const name = EVENT_SOUND[e.kind];
    if (enabled && name) playSound(name);
  }, [view.event, enabled]);
}

function useIdleCursor() {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 2500);
    };
    wake();
    window.addEventListener('mousemove', wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', wake);
    };
  }, []);
  return idle;
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

export default function ScreenApp() {
  const state = useAppState();
  const view = useMemo(() => toPublicView(state), [state]);
  const [activated, setActivated] = useState(IS_PREVIEW);
  const idle = useIdleCursor();
  const soundOn = view.sound && !IS_PREVIEW && activated;

  useEventSounds(view, soundOn);
  useTimerSounds(view.timer, soundOn && view.screen === 'question' && view.shown);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activate = (fullscreen: boolean) => {
    unlockAudio();
    if (fullscreen) toggleFullscreen();
    setActivated(true);
  };

  return (
    <div style={{ cursor: idle && activated ? 'none' : 'default' }} onDoubleClick={toggleFullscreen}>
      <Stage>
        <ScreenContent view={view} />
      </Stage>
      {!activated && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80 text-white">
          <div className="text-4xl font-black">Lielais ekrāns</div>
          <p className="max-w-md text-center text-white/70">
            Pārlūks atļauj skaņu tikai pēc klikšķa. Novietojiet šo logu projektorā un nospiediet pogu.
          </p>
          <div className="flex gap-3">
            <button className="btn btn-primary btn-lg" onClick={() => activate(true)}>
              ⛶ Pilnekrāns + skaņa
            </button>
            <button className="btn btn-lg" onClick={() => activate(false)}>
              Tikai skaņa
            </button>
          </div>
          <p className="text-sm text-white/40">
            Vēlāk: <kbd>F</kbd> vai dubultklikšķis — pilnekrāns
          </p>
        </div>
      )}
    </div>
  );
}

export function ScreenContent({ view }: { view: PublicView }) {
  const key = `${view.screen}-${view.match?.id ?? ''}`;
  const content = (() => {
    switch (view.screen) {
      case 'logo':
        return <LogoScreen view={view} />;
      case 'rules':
        return <RulesScreen view={view} />;
      case 'matchIntro':
        return <MatchIntroScreen view={view} />;
      case 'question':
        return <QuestionScreen view={view} />;
      case 'matchResult':
        return <MatchResultScreen view={view} />;
      case 'bracket':
        return <BracketScreen view={view} />;
      case 'standings':
        return <StandingsScreen view={view} />;
      case 'winner':
        return <WinnerScreen view={view} />;
    }
  })();
  return (
    <div key={key} className="anim-fade absolute inset-0">
      {content}
    </div>
  );
}
