import { useMemo, useState } from 'react';
import type { AppState, Side } from '../../types';
import { act, adjustScore, drawPairs, resetProgress, setScreen, setSeed, showRules, startMatch } from '../../lib/engine';
import { STATUS_LABEL, currentMatch, matchQuestions, nextPlayableMatch, slotLabel, standings, teamById, teamStatus } from '../../lib/tournament';
import { toPublicView } from '../../lib/publicView';
import { Bracket } from '../../components/Bracket';
import { TeamBadge } from '../../components/common';
import { formatClock } from '../../lib/util';

export function OverviewPanel({ s, onGoLive }: { s: AppState; onGoLive: () => void }) {
  const t = s.tournament;
  const view = useMemo(() => toPublicView(s), [s]);
  const live = currentMatch(s);
  const liveMatch = live?.status === 'live' ? live : undefined;
  const next = nextPlayableMatch(t);
  const anyStarted = t.matches.some((m) => m.status !== 'pending');
  const [step, setStep] = useState(10);

  const seeded = t.matches.flatMap((m) => m.slots.map((sl, i) => (sl.kind === 'seed' ? m.teams[i] : undefined))).filter(Boolean) as string[];
  const duplicates = new Set(seeded.filter((id, i) => seeded.indexOf(id) !== i));

  const start = (id: string) => {
    act((d) => startMatch(d, id), 'Sākt spēli');
    onGoLive();
  };

  return (
    <div className="space-y-4">
      {/* Kas notiek tagad */}
      <div className="card flex flex-wrap items-center gap-4">
        {t.championId ? (
          <div className="text-lg">
            🏆 Turnīrs beidzies! Čempioni: <b>{teamById(t, t.championId)?.name}</b>
          </div>
        ) : liveMatch ? (
          <>
            <div>
              <div className="label">Tagad notiek</div>
              <div className="text-lg font-bold">{liveMatch.title}</div>
            </div>
            <button className="btn btn-primary btn-lg ml-auto" onClick={onGoLive}>
              Uz spēles vadību →
            </button>
          </>
        ) : next ? (
          <>
            <div>
              <div className="label">Nākamā spēle</div>
              <div className="text-lg font-bold">
                {next.title}: {teamById(t, next.teams[0])?.name} pret {teamById(t, next.teams[1])?.name}
              </div>
            </div>
            <button className="btn btn-good btn-lg ml-auto" onClick={() => start(next.id)}>
              ▶ Sākt „{next.title}”
            </button>
          </>
        ) : (
          <div className="text-white/60">Sadaliet pārus pirmās kārtas spēlēm (izloze vai manuāli zemāk).</div>
        )}
      </div>

      {!anyStarted && (
        <div className="card flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <div className="font-bold">Pirms turnīra</div>
            <div className="text-sm text-white/60">Parādiet noteikumus lielajā ekrānā un sadaliet pārus.</div>
          </div>
          <button className="btn" onClick={() => act((d) => showRules(d, 'all'))}>
            📜 Rādīt noteikumus
          </button>
          <button
            className="btn btn-warn"
            onClick={() => {
              act(drawPairs, 'Izloze');
              act((d) => setScreen(d, 'bracket'));
            }}
          >
            🎲 Izlozēt pārus
          </button>
        </div>
      )}

      {/* Spēļu saraksts */}
      <div className="card">
        <h3 className="mb-3 font-bold">Spēles</h3>
        <div className="space-y-2">
          {t.matches.map((m, idx) => {
            const qs = matchQuestions(t, m).length;
            return (
              <div
                key={m.id}
                className={`flex flex-wrap items-center gap-3 rounded-lg p-3 ${m.status === 'live' ? 'bg-indigo-500/20 ring-1 ring-indigo-400' : 'bg-white/5'}`}
              >
                <div className="w-8 text-center text-white/40">{idx + 1}.</div>
                <div className="w-48">
                  <div className="font-bold">{m.title}</div>
                  <div className="text-xs text-white/50">
                    {m.kind === 'final' ? `${qs} tēmas · debates · ${formatClock(m.timerSec)}` : `${qs} jaut. · ${m.answerMode === 'turns' ? 'pēc kārtas' : 'ar pogu'} · ${m.timerSec}s`}
                  </div>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {([0, 1] as Side[]).map((i) => {
                    const slot = m.slots[i];
                    const team = teamById(t, m.teams[i]);
                    const won = m.result?.winner === m.teams[i] && m.status === 'done';
                    return (
                      <div key={i} className="flex items-center gap-2">
                        {i === 1 && <span className="text-white/40">pret</span>}
                        {slot.kind === 'seed' && m.status === 'pending' ? (
                          <select
                            className={`input w-44 ${m.teams[i] && duplicates.has(m.teams[i]!) ? 'border-rose-500' : ''}`}
                            value={m.teams[i] ?? ''}
                            onChange={(e) => act((d) => setSeed(d, m.id, i, e.target.value || null))}
                          >
                            <option value="">— izvēlēties —</option>
                            {t.teams.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                        ) : team ? (
                          <span className={`flex items-center gap-2 rounded-md px-2 py-1 ${won ? 'bg-amber-400/20 font-bold' : ''}`}>
                            <TeamBadge name={team.name} color={team.color} logo={team.logo} size={22} />
                            {team.name}
                            {m.status !== 'pending' && m.kind !== 'final' && <b className="tabular-nums">{m.points[i]}</b>}
                            {won && '🏅'}
                          </span>
                        ) : (
                          <span className="text-sm text-white/40 italic">{slotLabel(t, slot)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  {m.status === 'done' && <span className="text-xs text-emerald-400">✔ Beigusies{m.result?.decidedBy === 'golden' ? ' (zelta jaut.)' : ''}</span>}
                  {m.status === 'live' && (
                    <button className="btn btn-primary btn-sm" onClick={onGoLive}>
                      Vadīt
                    </button>
                  )}
                  {m.status === 'pending' && (
                    <button
                      className="btn btn-good btn-sm"
                      disabled={!m.teams[0] || !m.teams[1] || !!liveMatch || m.teams[0] === m.teams[1]}
                      onClick={() => start(m.id)}
                    >
                      ▶ Sākt
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {duplicates.size > 0 && <p className="mt-2 text-sm text-rose-400">⚠ Viena komanda ielikta vairākos pāros.</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Turnīra koks</h3>
            <button className="btn btn-sm" onClick={() => act((d) => setScreen(d, 'bracket'))}>
              📺 Rādīt ekrānā
            </button>
          </div>
          <Bracket rounds={view.rounds} />
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Kopējā punktu tabula</h3>
            <button className="btn btn-sm" onClick={() => act((d) => setScreen(d, 'standings'))}>
              📺 Rādīt ekrānā
            </button>
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs text-white/50">
            Korekcijas solis:
            <input type="number" className="input w-20 py-1" value={step} onChange={(e) => setStep(Math.abs(Number(e.target.value)) || 1)} />
          </div>
          <div className="space-y-1">
            {standings(t).map((team, i) => {
              const st = teamStatus(t, team.id);
              return (
                <div key={team.id} className={`flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 ${st === 'out' ? 'opacity-50' : ''}`}>
                  <span className="w-5 text-right text-white/40">{i + 1}.</span>
                  <TeamBadge name={team.name} color={team.color} logo={team.logo} size={20} />
                  <span className="flex-1 truncate text-sm font-semibold">{team.name}</span>
                  <span className="text-[10px] text-white/50 uppercase">{STATUS_LABEL[st]}</span>
                  <span className="w-10 text-right font-black tabular-nums">{team.score}</span>
                  <button className="btn btn-sm" onClick={() => act((d) => adjustScore(d, team.id, -step), `−${step} ${team.name}`)}>
                    −
                  </button>
                  <button className="btn btn-sm" onClick={() => act((d) => adjustScore(d, team.id, step), `+${step} ${team.name}`)}>
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-3 border-rose-500/30">
        <div className="flex-1 text-sm text-white/60">
          Mēģinājumam: atiestatīt visus punktus un rezultātus (komandas, jautājumi un pāri saglabājas).
        </div>
        <button
          className="btn btn-bad"
          onClick={() => confirm('Atiestatīt VISU turnīra progresu? (Var atsaukt ar „Atsaukt”.)') && act((d) => resetProgress(d), 'Atiestatīt progresu')}
        >
          Atiestatīt progresu
        </button>
      </div>
    </div>
  );
}
