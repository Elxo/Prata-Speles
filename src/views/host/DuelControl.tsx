import type { AppState, Match, Side } from '../../types';
import {
  act,
  adjustScore,
  awardWin,
  decidingScores,
  endMatch,
  gotoQuestion,
  mark,
  nextGolden,
  nextQuestion,
  prevQuestion,
  setActiveSide,
} from '../../lib/engine';
import { currentQuestion, matchQuestions } from '../../lib/tournament';
import { matchTeams, QuestionCard, ShowRevealButtons, TimerControl } from './shared';

export function DuelControl({ s, m }: { s: AppState; m: Match }) {
  const teams = matchTeams(s, m)!;
  const questions = matchQuestions(s.tournament, m);
  const q = currentQuestion(s);
  const golden = s.live.golden.active;
  const idx = s.live.qIndex;
  const isLast = idx >= questions.length - 1;

  const finish = () => {
    const remaining = questions.length - 1 - idx;
    if (!golden && remaining > 0 && !confirm(`Vēl palikuši ${remaining} jautājumi. Tiešām beigt spēli?`)) return;
    const [a, b] = decidingScores(s, m);
    act(endMatch, a === b ? 'Neizšķirts → zelta jautājums' : 'Beigt spēli');
  };

  return (
    <div className="space-y-4">
      {/* Navigācija pa jautājumiem */}
      {!golden ? (
        <div className="card flex flex-wrap items-center gap-2">
          <button className="btn" disabled={idx === 0} onClick={() => act(prevQuestion)}>
            ← Iepriekšējais
          </button>
          <div className="flex flex-1 flex-wrap justify-center gap-1">
            {questions.map((qq, i) => {
              const mk = m.marks[qq.id];
              const done = mk && (mk[0] || mk[1]);
              return (
                <button
                  key={qq.id}
                  onClick={() => act((d) => gotoQuestion(d, i))}
                  className={`h-8 w-8 rounded-md text-xs font-bold ${i === idx ? 'bg-indigo-500 ring-2 ring-white' : done ? 'bg-emerald-700/70' : 'bg-white/10 hover:bg-white/20'}`}
                  title={qq.text}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button className="btn" disabled={isLast} onClick={() => act(nextQuestion)}>
            Nākamais <kbd>→</kbd>
          </button>
        </div>
      ) : (
        <div className="card flex flex-wrap items-center gap-3 border-amber-400/60 bg-amber-500/10">
          <span className="text-lg font-black text-amber-300">⭐ ZELTA JAUTĀJUMS</span>
          <span className="text-sm text-white/70">Neizšķirts. Uzvar pirmā pareizā atbilde — atzīmējiet, kura komanda atbildēja pareizi.</span>
          <div className="ml-auto flex gap-2">
            <button className="btn" onClick={() => act(nextGolden, 'Nākamais zelta jautājums')}>
              Cits zelta jautājums
            </button>
            {teams.map((t, i) => (
              <button key={t.id} className="btn btn-sm" onClick={() => confirm(`Piešķirt uzvaru komandai „${t.name}”?`) && act((d) => awardWin(d, i as Side), 'Manuāla uzvara')}>
                Uzvara: {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {q ? (
        <QuestionCard s={s} q={q} label={golden ? 'Zelta jautājums' : `${idx + 1}. jautājums no ${questions.length}`} />
      ) : (
        <div className="card text-amber-300">
          {golden
            ? 'Zelta jautājumu kopa ir tukša vai izsmelta. Uzdodiet jautājumu mutiski un piešķiriet uzvaru ar pogu augstāk.'
            : 'Šai spēlei nav piesaistītu jautājumu. Pievienojiet tos redaktorā.'}
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-3">
        <ShowRevealButtons s={s} canShow={!!q} />
        <div className="ml-auto">
          <TimerControl s={s} />
        </div>
      </div>

      {/* Komandas */}
      <div className="grid grid-cols-2 gap-4">
        {teams.map((team, i) => {
          const side = i as Side;
          const mk = q && !golden ? m.marks[q.id]?.[side] : null;
          const active = s.live.activeSide === side;
          return (
            <div key={team.id} className="card space-y-3" style={{ borderColor: active ? '#ffcc33' : team.color, borderWidth: 2 }}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-black" style={{ color: team.color }}>
                  {team.name}
                </div>
                {active && <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-black">ATBILD</span>}
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <div className="label">Šajā spēlē</div>
                  <div className="text-3xl font-black">{m.points[side]}</div>
                </div>
                <div>
                  <div className="label">Kopā</div>
                  <div className="text-3xl font-black text-white/70">{team.score}</div>
                </div>
                <div className="ml-auto flex gap-1">
                  <button className="btn btn-sm" onClick={() => act((d) => adjustScore(d, team.id, -10), `−10 ${team.name}`)}>
                    −10
                  </button>
                  <button className="btn btn-sm" onClick={() => act((d) => adjustScore(d, team.id, 10), `+10 ${team.name}`)}>
                    +10
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`btn btn-good btn-lg ${mk === 'correct' ? 'ring-4 ring-emerald-300' : ''}`}
                  disabled={!q}
                  onClick={() => act((d) => mark(d, side, 'correct'), `Pareizi — ${team.name}`)}
                >
                  ✔ Pareizi <kbd>{side + 1}</kbd>
                </button>
                <button
                  className={`btn btn-bad btn-lg ${mk === 'wrong' ? 'ring-4 ring-rose-300' : ''}`}
                  disabled={!q}
                  onClick={() => act((d) => mark(d, side, 'wrong'), `Nepareizi — ${team.name}`)}
                >
                  ✘ Nepareizi <kbd>⇧{side + 1}</kbd>
                </button>
              </div>
              <div className="flex gap-2">
                {m.answerMode === 'buzzer' || golden ? (
                  <button className={`btn btn-sm flex-1 ${active ? 'btn-warn' : ''}`} onClick={() => act((d) => setActiveSide(d, active ? null : side))}>
                    🔔 Pieteicās pirmā
                  </button>
                ) : (
                  <button className="btn btn-sm flex-1" disabled={active} onClick={() => act((d) => setActiveSide(d, side))}>
                    ↔ Atbild šī komanda
                  </button>
                )}
                {mk && (
                  <button className="btn btn-sm" onClick={() => act((d) => mark(d, side, null), 'Notīrīt atzīmi')}>
                    Notīrīt atzīmi
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-white/50">
          Uzvar komanda ar vairāk punktu šajā spēlē. Neizšķirta gadījumā — zelta jautājums.
        </span>
        <button className="btn btn-bad btn-lg" onClick={finish}>
          🏁 Beigt spēli
        </button>
      </div>
    </div>
  );
}
