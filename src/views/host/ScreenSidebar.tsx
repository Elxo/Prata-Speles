import type { AppState, ScreenMode } from '../../types';
import { act, rulesDeck, rulesStep, setScreen, showQuestionTeaser, showRules } from '../../lib/engine';
import { currentMatch } from '../../lib/tournament';
import { routeHref } from '../../lib/env';

const MODES: { mode: ScreenMode; label: string; needsMatch?: boolean }[] = [
  { mode: 'logo', label: '🎬 Logo' },
  { mode: 'bracket', label: '🌳 Turnīra koks' },
  { mode: 'standings', label: '📊 Punktu tabula' },
  { mode: 'matchIntro', label: '⚔️ Spēles ievads', needsMatch: true },
  { mode: 'question', label: '❓ Jautājums', needsMatch: true },
  { mode: 'matchResult', label: '🏅 Spēles rezultāts', needsMatch: true },
];

export function ScreenSidebar({ s }: { s: AppState }) {
  const m = currentMatch(s);
  const deck = rulesDeck(s);
  const inRules = s.live.screen === 'rules';
  return (
    <div className="space-y-3">
      <div className="card p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="label mb-0">Lielais ekrāns — priekšskatījums</span>
          <button className="btn btn-sm" onClick={() => window.open(routeHref('screen'), 'prata-speles-screen', 'popup,width=1280,height=720')}>
            ↗ Atvērt logu
          </button>
        </div>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe src={routeHref('screen', '?preview=1')} className="absolute inset-0 h-full w-full border-0" title="Ekrāna priekšskatījums" />
        </div>
      </div>

      <div className="card space-y-2 p-3">
        <div className="label">Ko rādīt ekrānā</div>
        <div className="grid grid-cols-2 gap-1.5">
          {MODES.map(({ mode, label, needsMatch }) => (
            <button
              key={mode}
              className={`btn btn-sm justify-start ${s.live.screen === mode ? 'btn-primary' : ''}`}
              disabled={needsMatch && !m}
              onClick={() => act((d) => (mode === 'question' ? showQuestionTeaser(d) : setScreen(d, mode)))}
            >
              {label}
            </button>
          ))}
          <button className={`btn btn-sm justify-start ${inRules && s.live.rules.deck === 'all' ? 'btn-primary' : ''}`} onClick={() => act((d) => showRules(d, 'all'))}>
            📜 Noteikumi
          </button>
          <button
            className={`btn btn-sm justify-start ${inRules && s.live.rules.deck === 'final' ? 'btn-primary' : ''}`}
            onClick={() => act((d) => showRules(d, 'final'))}
          >
            🏆 Fināla noteikumi
          </button>
          {s.tournament.championId && (
            <button className={`btn btn-sm col-span-2 ${s.live.screen === 'winner' ? 'btn-primary' : ''}`} onClick={() => act((d) => setScreen(d, 'winner'))}>
              🎉 Uzvarētāja ekrāns
            </button>
          )}
        </div>

        {inRules && (
          <div className="mt-2 rounded-lg bg-indigo-500/15 p-2">
            <div className="mb-1 text-xs text-white/60">
              Slaids {s.live.rules.index + 1}/{deck.length}: <b className="text-white">{deck[s.live.rules.index]?.title}</b>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm flex-1" onClick={() => act((d) => rulesStep(d, -1))}>
                ← Iepr.
              </button>
              <button className="btn btn-sm btn-primary flex-1" onClick={() => act((d) => rulesStep(d, 1))}>
                {s.live.rules.index >= deck.length - 1 && s.live.rules.then ? 'Uz spēli →' : 'Nāk. →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
