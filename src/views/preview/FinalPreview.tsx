// ─────────────────────────────────────────────────────────────
//  Fināla priekšskats: parāda, kā fināls izskatās lielajā ekrānā,
//  soli pa solim. Izmanto demo turnīru atmiņā — nekas netiek saglabāts
//  un nekas netiek sūtīts uz pulti vai ekrānu.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { produce } from 'immer';
import type { AppState, Side } from '../../types';
import { createDemoState } from '../../data/demo';
import { advance } from '../../lib/tournament';
import {
  endMatch,
  lockBet,
  mark,
  revealAnswer,
  revealBets,
  revealFinalSide,
  setBet,
  setFinalAnswer,
  setScreen,
  showQuestion,
  startMatch,
  timerStart,
} from '../../lib/engine';
import { toPublicView } from '../../lib/publicView';
import { routeHref } from '../../lib/env';
import { Stage } from '../../components/Stage';
import { ScreenContent } from '../screen/ScreenApp';

/** Izdomāti rezultāti: [uzvarētājs, zaudētājs, uzvarētāja punkti, zaudētāja punkti]. */
const RESULTS: Record<string, [number, number, number, number]> = {
  r1m1: [0, 1, 90, 60],
  r1m2: [3, 2, 80, 70],
  r1m3: [4, 5, 100, 50],
  sf1: [4, 2, 80, 60],
  sf2: [3, 0, 90, 70],
};

/** Demo turnīrs, kurā pirmā kārta un pusfināli jau izspēlēti. */
function tournamentBeforeFinal(): AppState {
  return produce(createDemoState(), (d) => {
    const t = d.tournament;
    for (const m of t.matches) {
      const r = RESULTS[m.id];
      if (!r) continue;
      advance(t);
      const [w, l, wp, lp] = r;
      const winner = t.teams[w];
      const loser = t.teams[l];
      m.teams = [winner.id, loser.id];
      m.points = [wp, lp];
      winner.score += wp;
      loser.score += lp;
      m.status = 'done';
      m.result = { winner: winner.id, loser: loser.id, decidedBy: 'points', totalsAfter: { [winner.id]: winner.score, [loser.id]: loser.score } };
    }
    advance(t);
  });
}

type Step = { label: string; apply: (d: AppState) => void };

const final = (d: AppState) => d.tournament.matches.find((m) => m.kind === 'final')!;
const bet = (d: AppState, side: Side, amount: number) => {
  setBet(d, side, amount);
  lockBet(d, side, true);
};

/** Katrs solis turpina iepriekšējo (izņemot pirmo — turnīra koku). */
const STEPS: Step[] = [
  { label: 'Ceļš uz finālu', apply: (d) => setScreen(d, 'bracket') },
  { label: 'Fināla noteikumi', apply: (d) => startMatch(d, final(d).id) },
  { label: 'Ievads', apply: (d) => setScreen(d, 'matchIntro') },
  { label: 'Likmes tiek liktas', apply: (d) => bet(d, 0, 100) },
  {
    label: 'Likmes atklātas',
    apply: (d) => {
      bet(d, 1, 60);
      revealBets(d);
    },
  },
  {
    label: 'Jautājums',
    apply: (d) => {
      showQuestion(d);
      timerStart(d);
    },
  },
  {
    label: 'Atbildes atklātas',
    apply: (d) => {
      setFinalAnswer(d, 0, 'Nacionālajā teātrī');
      setFinalAnswer(d, 1, 'Rīgas pilī');
      mark(d, 0, 'correct');
      mark(d, 1, 'wrong');
      revealFinalSide(d, 0);
      revealFinalSide(d, 1);
      revealAnswer(d);
    },
  },
  { label: 'Uzvarētājs', apply: (d) => endMatch(d) },
];

function buildStep(index: number): AppState {
  return produce(tournamentBeforeFinal(), (d) => {
    if (index === 0) return STEPS[0].apply(d);
    for (let i = 1; i <= index; i++) STEPS[i].apply(d);
  });
}

export default function FinalPreview() {
  const [step, setStep] = useState(0);
  const [barVisible, setBarVisible] = useState(true);
  // Taimeris sāk skaitīt no jauna katru reizi, kad solis tiek atvērts.
  const view = useMemo(() => toPublicView(buildStep(step)), [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep((x) => Math.min(STEPS.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setStep((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Pogu josla aizsedz ekrāna apakšu, tāpēc tā paslēpjas, kad pele nekustas.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setBarVisible(true);
      clearTimeout(t);
      t = setTimeout(() => setBarVisible(false), 2500);
    };
    wake();
    window.addEventListener('mousemove', wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', wake);
    };
  }, []);

  return (
    <>
      <Stage>
        <ScreenContent view={view} />
      </Stage>
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-2 bg-black/70 px-3 py-2 backdrop-blur transition-opacity duration-500 ${barVisible ? '' : 'pointer-events-none opacity-0'}`}
      >
        <span className="mr-2 text-sm font-bold text-amber-300">Fināla priekšskats</span>
        <button className="btn btn-sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
          ←
        </button>
        {STEPS.map((x, i) => (
          <button key={x.label} className={`btn btn-sm ${i === step ? 'btn-primary' : ''}`} onClick={() => setStep(i)}>
            {i + 1}. {x.label}
          </button>
        ))}
        <button className="btn btn-sm" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>
          →
        </button>
        <a className="btn btn-sm ml-2" href={routeHref('')}>
          Uz sākumu
        </a>
        <span className="w-full text-center text-xs text-white/50">
          Demo dati, nekas netiek saglabāts. Pārslēgt ar ← / →. Josla paslēpjas, kad pele nekustas.
        </span>
      </div>
    </>
  );
}
