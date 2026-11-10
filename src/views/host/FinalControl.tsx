import type { AppState, Match, Side } from '../../types';
import {
  act,
  adjustScore,
  awardWin,
  endMatch,
  nextGolden,
  nextQuestion,
  prevQuestion,
  scoreTopic,
  setJury,
  showQuestion,
  showQuestionTeaser,
  swapDebateSides,
} from '../../lib/engine';
import { currentQuestion, matchQuestions } from '../../lib/tournament';
import { matchTeams, TimerControl } from './shared';
import { DuelControl } from './DuelControl';

function Step({ n, title, active, done }: { n: number; title: string; active: boolean; done: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${active ? 'bg-indigo-500' : done ? 'bg-emerald-700/50' : 'bg-white/5 text-white/40'}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/30">{done ? '✔' : n}</span>
      {title}
    </div>
  );
}

export function FinalControl({ s, m }: { s: AppState; m: Match }) {
  // Neizšķirta gadījumā finālā tiek izmantota tā pati zelta jautājuma vadība kā dueļos.
  if (s.live.golden.active) return <DuelControl s={s} m={m} />;

  const teams = matchTeams(s, m)!;
  const topics = matchQuestions(s.tournament, m);
  const q = currentQuestion(s);
  const f = s.live.final;
  const max = s.tournament.settings.debateMaxPoints;
  const idx = s.live.qIndex;
  const isLast = idx >= topics.length - 1;
  const stance = (side: Side) => (side === f.forSide ? 'PAR' : 'PRET');

  const step = !s.live.shown ? 1 : !f.scored ? 2 : 3;

  const finish = () => {
    if (!isLast && !confirm('Vēl nav apspriestas visas fināla tēmas. Tiešām beigt finālu?')) return;
    act(endMatch, 'Beigt finālu');
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2">
        <button className="btn btn-sm" disabled={idx === 0} onClick={() => confirm('Atgriezties pie iepriekšējās tēmas? Šīs tēmas žūrijas punkti, ja nav piešķirti, tiks notīrīti.') && act(prevQuestion)}>
          ←
        </button>
        <span className="px-2 font-bold">
          {idx + 1}. tēma no {topics.length}
        </span>
        <div className="ml-2 flex flex-wrap gap-2">
          <Step n={1} title="Tēma ekrānā" active={step === 1} done={step > 1} />
          <Step n={2} title="Debates" active={step === 2} done={step > 2} />
          <Step n={3} title="Žūrijas punkti" active={false} done={step > 2} />
        </div>
      </div>

      {/* Tēze */}
      {q ? (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded bg-white/10 px-2 py-1">{idx + 1}. tēma</span>
            {q.topic && <span className="rounded bg-white/10 px-2 py-1">{q.topic}</span>}
            <span className={`ml-auto rounded px-2 py-1 ${s.live.shown ? 'bg-emerald-600/60' : 'bg-white/10 text-white/50'}`}>
              {s.live.shown ? '● Redzama ekrānā' : '○ Ekrānā vēl nav'}
            </span>
          </div>
          <div className="text-2xl leading-snug font-black">„{q.text}”</div>
          {q.hostNotes && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">📝 {q.hostNotes}</div>
          )}
        </div>
      ) : (
        <div className="card text-amber-300">Finālam nav piesaistītu debašu tēmu (redaktorā izveidojiet jautājumu kopu, kur jautājums = tēze).</div>
      )}

      {/* Puses un laiks */}
      <div className="card flex flex-wrap items-center gap-3">
        <button className="btn" disabled={!q || s.live.screen === 'question'} onClick={() => act(showQuestionTeaser)}>
          📺 Tēmas numurs
        </button>
        <button className="btn btn-primary btn-lg" disabled={!q || s.live.shown} onClick={() => act(showQuestion)}>
          📺 Rādīt tēzi <kbd>S</kbd>
        </button>
        <div className="flex items-center gap-2">
          {teams.map((team, i) => (
            <span
              key={team.id}
              className={`rounded-lg px-3 py-2 text-sm font-black ${stance(i as Side) === 'PAR' ? 'bg-emerald-600/50' : 'bg-rose-600/50'}`}
            >
              {stance(i as Side)}: {team.name}
            </span>
          ))}
          <button className="btn btn-sm" disabled={f.scored} onClick={() => act(swapDebateSides, 'Samainīt puses')}>
            ⇄ Samainīt
          </button>
        </div>
        <div className="ml-auto">
          <TimerControl s={s} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-white/40">
        Debašu pulkstenis ir kopīgs visām tēmām — mainot tēmu, tas turpina no turienes, kur apstājās. „Atiestatīt” atgriež pilnu laiku.
      </p>

      {/* Žūrija */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold">Žūrijas punkti par šo tēmu (0–{max})</h3>
          <button
            className="btn btn-warn ml-auto"
            disabled={!q || f.scored || f.jury[0] === null || f.jury[1] === null}
            onClick={() => act(scoreTopic, 'Piešķirt žūrijas punktus')}
          >
            {f.scored ? '✔ Punkti piešķirti' : '⚖️ Piešķirt un rādīt ekrānā'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {teams.map((team, i) => {
            const side = i as Side;
            const value = f.jury[side];
            return (
              <div key={team.id} className="space-y-2 rounded-lg border-2 p-3" style={{ borderColor: team.color }}>
                <div className="flex items-center justify-between">
                  <span className="font-black" style={{ color: team.color }}>
                    {team.name} <span className="text-xs text-white/60">({stance(side)})</span>
                  </span>
                  <span className="text-sm text-white/60">
                    kopā <b className="text-white">{team.score}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input w-24 text-lg font-bold"
                    min={0}
                    max={max}
                    value={value ?? ''}
                    placeholder="—"
                    disabled={f.scored}
                    onChange={(e) => act((d) => setJury(d, side, Number(e.target.value)))}
                  />
                  <input
                    type="range"
                    className="flex-1"
                    min={0}
                    max={max}
                    value={value ?? 0}
                    disabled={f.scored}
                    onChange={(e) => act((d) => setJury(d, side, Number(e.target.value)))}
                  />
                </div>
                <div className="flex justify-end gap-1">
                  <button className="btn btn-sm" onClick={() => act((d) => adjustScore(d, team.id, -10), `−10 ${team.name}`)}>
                    −10
                  </button>
                  <button className="btn btn-sm" onClick={() => act((d) => adjustScore(d, team.id, 10), `+10 ${team.name}`)}>
                    +10
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {f.scored && <p className="text-xs text-white/40">Kļūda punktos? Spiediet „Atsaukt” augšā.</p>}
      </div>

      <div className="flex items-center justify-end gap-3">
        {!isLast && (
          <button className="btn btn-primary btn-lg" disabled={!f.scored} onClick={() => act(nextQuestion, 'Nākamā tēma')}>
            Nākamā tēma <kbd>→</kbd>
          </button>
        )}
        <button className="btn btn-bad btn-lg" onClick={finish}>
          🏆 Beigt finālu un paziņot uzvarētāju
        </button>
      </div>
      <p className="text-right text-xs text-white/40">
        Uzvar komanda ar vairāk kopējo punktu. Neizšķirta gadījumā sāksies zelta jautājums. Ja zelta jautājumu nav:{' '}
        {teams.map((t, i) => (
          <button key={t.id} className="underline hover:text-white" onClick={() => confirm(`Piešķirt uzvaru „${t.name}”?`) && act((d) => awardWin(d, i as Side), 'Manuāla uzvara')}>
            uzvara {t.name}
          </button>
        )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ' / ', el] : [el]), [])}
        {' · '}
        <button className="underline hover:text-white" onClick={() => act(nextGolden)}>
          zelta jautājums
        </button>
      </p>
    </div>
  );
}
