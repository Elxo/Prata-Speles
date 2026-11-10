import type { AppState, Match, Question, Side, Team } from '../../types';
import { act, revealAnswer, showQuestion, timerReset, timerToggle } from '../../lib/engine';
import { teamById } from '../../lib/tournament';
import { QUESTION_TYPES } from '../../questionTypes';
import { formatClock, OPTION_LETTERS, pointsWord } from '../../lib/util';
import { useRemaining } from '../../components/common';

export function matchTeams(s: AppState, m: Match): [Team, Team] | null {
  const a = teamById(s.tournament, m.teams[0]);
  const b = teamById(s.tournament, m.teams[1]);
  return a && b ? [a, b] : null;
}

/** Jautājuma kartīte vadītājam: teksts + PAREIZĀ ATBILDE + piezīmes. */
export function QuestionCard({ s, q, label }: { s: AppState; q: Question; label: string }) {
  const def = QUESTION_TYPES[q.type];
  const steps = q.type === 'image' ? (q.revealSteps ?? s.tournament.settings.imageRevealSteps) : 0;
  const answer = q.type === 'choice' && q.options && q.correctOption != null ? q.options[q.correctOption] : q.answer;
  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded bg-white/10 px-2 py-1">{label}</span>
        <span className="rounded bg-white/10 px-2 py-1">
          {def.icon} {def.label}
        </span>
        {q.topic && <span className="rounded bg-white/10 px-2 py-1">{q.topic}</span>}
        {q.points > 0 && (
          <span className="rounded bg-pink-600/60 px-2 py-1">
            {q.points} {pointsWord(q.points)}
          </span>
        )}
        {q.author && <span className="rounded bg-sky-600/50 px-2 py-1">🙋 {q.author}</span>}
        <span className={`ml-auto rounded px-2 py-1 ${s.live.shown ? 'bg-emerald-600/60' : 'bg-white/10 text-white/50'}`}>
          {s.live.shown ? '● Redzams ekrānā' : '○ Ekrānā vēl nav'}
        </span>
      </div>
      <div className="text-xl leading-snug font-bold">{q.text}</div>
      {q.type === 'choice' && q.options && (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${i === q.correctOption ? 'bg-emerald-600/40 font-bold ring-2 ring-emerald-400' : 'bg-white/5'}`}
            >
              {OPTION_LETTERS[i]}. {o}
            </div>
          ))}
        </div>
      )}
      {q.media && (q.type === 'image' ? <img src={q.media} alt="" className="max-h-32 rounded" /> : null)}
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3">
        <div className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase">Pareizā atbilde</div>
        <div className="text-2xl font-black text-emerald-100">{answer || '—'}</div>
      </div>
      {q.hostNotes && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
          📝 {q.hostNotes}
        </div>
      )}
      {def.Host && <def.Host q={q} imageStep={s.live.imageStep} steps={steps} />}
    </div>
  );
}

export function TimerControl({ s }: { s: AppState }) {
  const t = s.live.timer;
  const remaining = useRemaining(t);
  const secs = Math.ceil(remaining / 1000);
  const running = !!t.startedAt && remaining > 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`min-w-20 rounded-lg px-2 py-2 text-center text-2xl font-black tabular-nums ${remaining <= 0 ? 'bg-rose-600' : secs <= 5 ? 'bg-rose-600/60' : 'bg-white/10'}`}
      >
        {secs < 60 ? `${secs}s` : formatClock(secs)}
      </div>
      <button className={`btn ${running ? 'btn-warn' : 'btn-good'}`} onClick={() => act(timerToggle)} title="Atstarpe">
        {running ? '⏸ Apturēt' : '▶ Sākt'} <kbd>Space</kbd>
      </button>
      <button className="btn" onClick={() => act((d) => timerReset(d))}>
        ↺ Atiestatīt
      </button>
    </div>
  );
}

export function ShowRevealButtons({ s, canShow = true }: { s: AppState; canShow?: boolean }) {
  return (
    <>
      <button className="btn btn-primary btn-lg" disabled={!canShow || s.live.shown} onClick={() => act(showQuestion)}>
        📺 Rādīt jautājumu <kbd>S</kbd>
      </button>
      <button className="btn btn-warn btn-lg" disabled={!s.live.shown || s.live.revealed} onClick={() => act(revealAnswer, 'Atklāt atbildi')}>
        💡 Atklāt atbildi <kbd>R</kbd>
      </button>
    </>
  );
}

export function sideName(side: Side) {
  return side === 0 ? 'A' : 'B';
}
