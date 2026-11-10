import { useState } from 'react';
import { useStore } from '../../lib/store';
import { routeHref } from '../../lib/env';
import { TeamsPanel } from '../host/TeamsPanel';
import { TournamentTab } from './TournamentTab';
import { QuestionsTab } from './QuestionsTab';
import { RulesTab } from './RulesTab';
import { ImportExportTab } from './ImportExportTab';

type Tab = 'tournament' | 'teams' | 'questions' | 'rules' | 'io';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tournament', label: '🏟 Turnīrs un spēles' },
  { id: 'teams', label: '👥 Komandas' },
  { id: 'questions', label: '❓ Jautājumi' },
  { id: 'rules', label: '📜 Noteikumi' },
  { id: 'io', label: '💾 Imports / eksports' },
];

export default function EditorApp() {
  const { state: s, storageError } = useStore();
  const [tab, setTab] = useState<Tab>('questions');
  const live = s.tournament.matches.some((m) => m.status === 'live');

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0f1117]/95 px-4 py-2 backdrop-blur">
        <a href={routeHref('')} className="text-lg font-black text-amber-300">
          {s.tournament.name}
        </a>
        <span className="text-xs text-white/40">redaktors</span>
        <nav className="ml-4 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <a className="btn ml-auto" href={routeHref('host')}>
          🎛️ Uz pulti
        </a>
      </header>
      {storageError && <div className="bg-rose-700 px-4 py-2 text-sm">{storageError}</div>}
      {live && (
        <div className="bg-amber-500/20 px-4 py-2 text-sm text-amber-200">
          ⚠ Pašlaik notiek spēle. Izmaiņas uzreiz parādās pultī un ekrānā.
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        {tab === 'tournament' && <TournamentTab s={s} />}
        {tab === 'teams' && <TeamsPanel />}
        {tab === 'questions' && <QuestionsTab s={s} />}
        {tab === 'rules' && <RulesTab s={s} />}
        {tab === 'io' && <ImportExportTab s={s} />}
      </main>
      <footer className="px-4 py-3 text-center text-xs text-white/30">Visas izmaiņas tiek saglabātas automātiski šajā pārlūkā.</footer>
    </div>
  );
}
