import type { AppState, Match, Side } from '../../types';
import {
  act,
  adjustScore,
  awardWin,
  endMatch,
  lockBet,
  mark,
  maxBet,
  nextGolden,
  nextQuestion,
  prevQuestion,
  revealBets,
  revealFinalSide,
  setBet,
  setFinalAnswer,
  showQuestionTeaser,
} from '../../lib/engine';
import { currentQuestion, matchQuestions } from '../../lib/tournament';
import { matchTeams, QuestionCard, ShowRevealButtons, TimerControl } from './shared';
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
  const questions = matchQuestions(s.tournament, m);
  const q = currentQuestion(s);
  const f = s.live.final;
  const idx = s.live.qIndex;
  const isLast = idx >= questions.length - 1;
  const bothLocked = f.betsLocked[0] && f.betsLocked[1];
  const bothRevealed = f.revealed[0] && f.revealed[1];

  const step = !f.betsRevealed ? 1 : !s.live.shown ? 2 : !bothRevealed ? 3 : 4;

  const finish = () => {
    if (!isLast && !confirm('Vēl nav uzdoti visi fināla jautājumi. Tiešām beigt finālu?')) return;
    act(endMatch, 'Beigt finālu');
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2">
        <button className="btn btn-sm" disabled={idx === 0} onClick={() => confirm('Pāriet uz iepriekšējo jautājumu? Pašreizējās likmes tiks notīrītas.') && act(prevQuestion)}>
          ←
        </button>
        <span className="px-2 font-bold">
          Fināla {idx + 1}. jautājums no {questions.length}
        </span>
        <div className="ml-2 flex flex-wrap gap-2">
          <Step n={1} title="Likmes" active={step === 1} done={step > 1} />
          <Step n={2} title="Jautājums" active={step === 2} done={step > 2} />
          <Step n={3} title="Atbildes" active={step === 3} done={step > 3} />
          <Step n={4} title="Nākamais" active={step === 4} done={false} />
        </div>
      </div>

      {/* 1. Likmes */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold">1. Likmes (ekrānā slēptas, līdz atklājat)</h3>
          <button className="btn ml-auto" disabled={s.live.screen === 'question'} onClick={() => act(showQuestionTeaser)}>
            📺 Rādīt likmju ekrānu
          </button>
          <button className="btn btn-primary" disabled={!bothLocked || f.betsRevealed} onClick={() => act(revealBets, 'Atklāt likmes')}>
            🎲 Atklāt likmes ekrānā
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {teams.map((team, i) => {
            const side = i as Side;
            const max = maxBet(s, side);
            const bet = f.bets[side];
            const locked = f.betsLocked[side];
            return (
              <div key={team.id} className="rounded-lg border-2 p-3" style={{ borderColor: team.color }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-black" style={{ color: team.color }}>
                    {team.name}
                  </span>
                  <span className="text-sm text-white/60">
                    kopā <b className="text-white">{team.score}</b> · maks. likme {max}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input w-28 text-lg font-bold"
                    min={0}
                    max={max}
                    value={bet ?? ''}
                    placeholder="0"
                    disabled={locked}
                    onChange={(e) => act((d) => setBet(d, side, Number(e.target.value)))}
                  />
                  {[0, 0.25, 0.5, 1].map((k) => (
                    <button key={k} className="btn btn-sm" disabled={locked} onClick={() => act((d) => setBet(d, side, Math.floor(max * k)))}>
                      {k === 1 ? 'VISU' : k === 0 ? '0' : `${k * 100}%`}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  className="mt-2 w-full"
                  min={0}
                  max={max}
                  value={bet ?? 0}
                  disabled={locked}
                  onChange={(e) => act((d) => setBet(d, side, Number(e.target.value)))}
                />
                <button
                  className={`btn mt-2 w-full ${locked ? 'btn-good' : ''}`}
                  disabled={f.betsRevealed}
                  onClick={() => act((d) => lockBet(d, side, !locked), locked ? 'Atbloķēt likmi' : `Likme — ${team.name}`)}
                >
                  {locked ? `🔒 Likme fiksēta: ${bet ?? 0}` : 'Fiksēt likmi'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Jautājums */}
      {q ? (
        <QuestionCard s={s} q={q} label={`Fināla ${idx + 1}. jautājums`} />
      ) : (
        <div className="card text-amber-300">Finālam nav piesaistītu jautājumu.</div>
      )}
      <div className="card flex flex-wrap items-center gap-3">
        <ShowRevealButtons s={s} canShow={!!q && f.betsRevealed} />
        <div className="ml-auto">
          <TimerControl s={s} />
        </div>
      </div>

      {/* 3. Atbildes */}
      <div className="card space-y-3">
        <h3 className="font-bold">3. Rakstiskās atbildes — ievadiet, novērtējiet un atklājiet pa vienai</h3>
        <div className="grid grid-cols-2 gap-4">
          {teams.map((team, i) => {
            const side = i as Side;
            const verdict = f.verdict[side];
            const revealed = f.revealed[side];
            const bet = f.bets[side] ?? 0;
            return (
              <div key={team.id} className="space-y-2 rounded-lg border-2 p-3" style={{ borderColor: team.color }}>
                <div className="font-black" style={{ color: team.color }}>
                  {team.name}
                </div>
                <input
                  className="input"
                  placeholder="Komandas atbilde (pēc izvēles)"
                  value={f.answers[side]}
                  disabled={revealed}
                  onChange={(e) => act((d) => setFinalAnswer(d, side, e.target.value))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`btn btn-good ${verdict === true ? 'ring-4 ring-emerald-300' : ''}`}
                    disabled={revealed || !s.live.shown}
                    onClick={() => act((d) => mark(d, side, 'correct'))}
                  >
                    ✔ Pareizi <kbd>{side + 1}</kbd>
                  </button>
                  <button
                    className={`btn btn-bad ${verdict === false ? 'ring-4 ring-rose-300' : ''}`}
                    disabled={revealed || !s.live.shown}
                    onClick={() => act((d) => mark(d, side, 'wrong'))}
                  >
                    ✘ Nepareizi <kbd>⇧{side + 1}</kbd>
                  </button>
                </div>
                <button
                  className="btn btn-warn w-full"
                  disabled={verdict === null || revealed}
                  onClick={() =>
                    act(
                      (d) => revealFinalSide(d, side),
                      `Atklāt ${team.name}: ${verdict ? '+' : '−'}${bet}`,
                    )
                  }
                >
                  {revealed
                    ? `Atklāts (${verdict ? '+' : '−'}${bet})`
                    : verdict === null
                      ? 'Vispirms novērtējiet'
                      : `🎭 Atklāt ekrānā (${verdict ? '+' : '−'}${bet})`}
                </button>
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
      </div>

      <div className="flex items-center justify-end gap-3">
        {!isLast && (
          <button className="btn btn-primary btn-lg" disabled={!bothRevealed} onClick={() => act(nextQuestion, 'Nākamais fināla jautājums')}>
            Nākamais jautājums <kbd>→</kbd>
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
