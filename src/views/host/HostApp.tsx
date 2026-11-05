import { useEffect, useState } from 'react';
import { undo, useStore, getState } from '../../lib/store';
import {
  act,
  mark,
  nextQuestion,
  prevQuestion,
  revealAnswer,
  rulesStep,
  setScreen,
  showQuestion,
  timerToggle,
  toggleSound,
} from '../../lib/engine';
import { currentMatch, currentQuestion, teamById } from '../../lib/tournament';
import { isTyping } from '../../lib/util';
import { routeHref } from '../../lib/env';
import type { Side } from '../../types';
import { DuelControl } from './DuelControl';
import { FinalControl } from './FinalControl';
import { OverviewPanel } from './OverviewPanel';
import { ScreenSidebar } from './ScreenSidebar';
import { TeamsPanel } from './TeamsPanel';

type Tab = 'overview' | 'live' | 'teams';

/** Klaviatūras saīsnes. Lasa svaigu stāvokli katrā nospiedienā. */
function useHostKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.altKey || e.metaKey) return;
      const s = getState();
      const m = currentMatch(s);
      const live = m?.status === 'live';
      const inRules = s.live.screen === 'rules';
      const teamName = (side: Side) => (m ? (teamById(s.tournament, m.teams[side])?.name ?? '') : '');

      if (e.code === 'KeyZ') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.ctrlKey) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (live) act(timerToggle);
          return;
        case 'ArrowRight':
          e.preventDefault();
          if (inRules) act((d) => rulesStep(d, 1));
          else if (live && (m.kind !== 'final' || s.live.golden.active || (s.live.final.revealed[0] && s.live.final.revealed[1])))
            act(nextQuestion);
          return;
        case 'ArrowLeft':
          e.preventDefault();
          if (inRules) act((d) => rulesStep(d, -1));
          else if (live && m.kind !== 'final') act(prevQuestion);
          return;
        case 'Digit1':
        case 'Digit2':
        case 'Numpad1':
        case 'Numpad2': {
          if (!live || !currentQuestion(s)) return;
          const side: Side = e.code.endsWith('1') ? 0 : 1;
          const result = e.shiftKey ? 'wrong' : 'correct';
          act((d) => mark(d, side, result), `${result === 'correct' ? 'Pareizi' : 'Nepareizi'} — ${teamName(side)}`);
          return;
        }
        case 'KeyR':
          if (live && s.live.shown) act(revealAnswer, 'Atklāt atbildi');
          return;
        case 'KeyS':
          if (live && (m.kind !== 'final' || s.live.final.betsRevealed || s.live.golden.active)) act(showQuestion);
          return;
        case 'KeyB':
          act((d) => setScreen(d, 'bracket'));
          return;
        case 'KeyT':
          act((d) => setScreen(d, 'standings'));
          return;
        case 'KeyL':
          act((d) => setScreen(d, 'logo'));
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function HostApp() {
  const { state: s, undoLabel, storageError } = useStore();
  const m = currentMatch(s);
  const live = m?.status === 'live';
  const [tab, setTab] = useState<Tab>(live ? 'live' : 'overview');
  useHostKeys();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: '🗂 Turnīrs' },
    { id: 'live', label: live ? '🔴 Spēle' : '🎮 Spēle' },
    { id: 'teams', label: '👥 Komandas' },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0f1117]/95 px-4 py-2 backdrop-blur">
        <a href={routeHref('')} className="text-lg font-black text-amber-300">
          {s.tournament.name}
        </a>
        <span className="text-xs text-white/40">vadītāja pults</span>
        <nav className="ml-4 flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn" disabled={!undoLabel} onClick={undo} title="Z / Ctrl+Z">
            ↶ Atsaukt{undoLabel ? `: ${undoLabel}` : ''}
          </button>
          <button className={`btn ${s.live.sound ? '' : 'btn-bad'}`} onClick={() => act(toggleSound)}>
            {s.live.sound ? '🔊 Skaņa' : '🔇 Bez skaņas'}
          </button>
          <a className="btn" href={routeHref('editor')} target="_blank" rel="noreferrer">
            ✏️ Redaktors
          </a>
        </div>
      </header>

      {storageError && <div className="bg-rose-700 px-4 py-2 text-sm">{storageError}</div>}

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_400px]">
        <main className="min-w-0">
          {tab === 'overview' && <OverviewPanel s={s} onGoLive={() => setTab('live')} />}
          {tab === 'teams' && <TeamsPanel />}
          {tab === 'live' &&
            (m && live ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <h1 className="text-2xl font-black">{m.title}</h1>
                  <span className="text-white/50">
                    {teamById(s.tournament, m.teams[0])?.name} pret {teamById(s.tournament, m.teams[1])?.name}
                  </span>
                </div>
                {m.kind === 'final' ? <FinalControl s={s} m={m} /> : <DuelControl s={s} m={m} />}
              </div>
            ) : (
              <div className="card space-y-3 text-center">
                <p className="text-white/60">Pašlaik nenotiek neviena spēle.</p>
                {m?.status === 'done' && (
                  <p>
                    Pēdējā: <b>{m.title}</b> — uzvarēja <b>{teamById(s.tournament, m.result?.winner)?.name}</b>
                  </p>
                )}
                <button className="btn btn-primary" onClick={() => setTab('overview')}>
                  Uz turnīra pārskatu, lai sāktu nākamo spēli →
                </button>
              </div>
            ))}
        </main>
        <aside className="space-y-3">
          <ScreenSidebar s={s} />
          <div className="card p-3 text-xs leading-6 text-white/60">
            <div className="label">Klaviatūras saīsnes</div>
            <kbd>Space</kbd> taimeris · <kbd>S</kbd> rādīt jautājumu · <kbd>R</kbd> atklāt atbildi
            <br />
            <kbd>1</kbd>/<kbd>2</kbd> komanda pareizi · <kbd>⇧1</kbd>/<kbd>⇧2</kbd> nepareizi
            <br />
            <kbd>→</kbd>/<kbd>←</kbd> nākamais/iepriekšējais (arī noteikumu slaidi) · <kbd>Z</kbd> atsaukt
            <br />
            <kbd>B</kbd> koks · <kbd>T</kbd> tabula · <kbd>L</kbd> logo
          </div>
        </aside>
      </div>
    </div>
  );
}
