import type { PublicMatch, PublicTeam, PublicView } from '../../lib/publicView';
import type { Side } from '../../types';
import { QUESTION_TYPES } from '../../questionTypes';
import { pointsWord } from '../../lib/util';
import { TeamPanel, TimerRing } from './parts';

export function QuestionScreen({ view }: { view: PublicView }) {
  const m = view.match;
  const q = view.question;
  if (!m || !m.teams[0] || !m.teams[1]) return null;
  const teams = m.teams as [PublicTeam, PublicTeam];
  const isFinal = m.kind === 'final';
  const golden = !!q?.golden;
  const f = view.final;
  const betting = isFinal && f?.stage === 'bet' && !golden;

  return (
    <div className="absolute inset-0 flex flex-col px-16 pt-10 pb-10">
      {/* Augšējā josla */}
      <div className="flex items-center justify-between text-3xl font-extrabold">
        <div className="flex items-center gap-4">
          <span className="rounded-2xl bg-white/10 px-5 py-2 text-white/80">{m.title}</span>
          {q && !golden && (
            <span className="rounded-2xl bg-gold px-5 py-2 text-[#1b1040]">
              {q.number}. jautājums no {q.total}
            </span>
          )}
          {golden && <span className="shimmer rounded-2xl bg-gold px-6 py-2 font-black text-[#1b1040]">⭐ ZELTA JAUTĀJUMS</span>}
        </div>
        <div className="flex items-center gap-4">
          {q?.topic && <span className="rounded-2xl bg-white/10 px-5 py-2">{q.topic}</span>}
          {q && !isFinal && (
            <span className="rounded-2xl bg-hot px-5 py-2">
              {q.points} {pointsWord(q.points)}
            </span>
          )}
          {isFinal && !golden && <span className="rounded-2xl bg-hot px-5 py-2">LIKMES</span>}
        </div>
      </div>

      {/* Centrs */}
      <div className="relative flex flex-1 items-center gap-10 py-8">
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-8">
          {betting ? (
            <BettingStage view={view} teams={teams} />
          ) : !view.shown || !q ? (
            <Teaser view={view} m={m} />
          ) : (
            <QuestionBody view={view} />
          )}
        </div>
        {view.shown && !betting && (
          <div className="flex shrink-0 flex-col items-center gap-4">
            <TimerRing timer={view.timer} />
          </div>
        )}
      </div>

      {/* Fināla atbilžu kartes */}
      {isFinal && !golden && f && f.stage === 'question' && (
        <div className="mb-6 grid grid-cols-2 gap-10">
          {([0, 1] as Side[]).map((side) => (
            <FinalAnswerCard key={side} view={view} side={side} team={teams[side]} />
          ))}
        </div>
      )}

      {/* Komandas */}
      <div className="grid grid-cols-2 gap-10">
        {([0, 1] as Side[]).map((side) => (
          <TeamPanel
            key={side}
            team={teams[side]}
            side={side}
            matchPoints={m.points[side]}
            active={view.activeSide === side && view.shown && !view.revealed}
            event={view.event}
            showMatchPoints={!isFinal}
            extra={
              isFinal && f?.betsRevealed && !golden ? (
                <span className="rounded-full bg-hot px-3 py-0.5 text-xl font-black text-white">likme: {f.bets[side]}</span>
              ) : golden && view.goldenTries[side] ? (
                <span className="text-xl text-white/50">atbildēja</span>
              ) : null
            }
          />
        ))}
      </div>
    </div>
  );
}

function Teaser({ view, m }: { view: PublicView; m: PublicMatch }) {
  const q = view.question;
  if (!q) return <div className="text-5xl font-black text-white/60">Gatavojamies…</div>;
  return (
    <div key={q.id} className="anim-pop flex flex-col items-center gap-6 text-center">
      {q.golden ? (
        <>
          <div className="text-[140px]">⭐</div>
          <div className="gold-text text-[110px] leading-none font-black">ZELTA JAUTĀJUMS</div>
          <div className="text-4xl font-bold text-white/80">Neizšķirts! Uzvar pirmā pareizā atbilde.</div>
        </>
      ) : (
        <>
          <div className="text-4xl font-bold tracking-[0.3em] text-white/60 uppercase">{m.roundName}</div>
          <div className="gold-text text-[160px] leading-none font-black">{q.number}. jautājums</div>
          <div className="flex gap-6 text-5xl font-extrabold">
            {q.topic && <span className="glass rounded-3xl px-8 py-4">{q.topic}</span>}
            {m.kind !== 'final' && (
              <span className="rounded-3xl bg-hot px-8 py-4">
                {q.points} {pointsWord(q.points)}
              </span>
            )}
          </div>
          {m.answerMode === 'buzzer' && m.kind !== 'final' && (
            <div className="text-3xl font-bold text-white/60">Atbild komanda, kura pirmā nospiež pogu!</div>
          )}
        </>
      )}
    </div>
  );
}

function QuestionBody({ view }: { view: PublicView }) {
  const q = view.question!;
  const def = QUESTION_TYPES[q.type];
  const hasVisual = !!def.Screen && (q.type !== 'choice' || !!q.options);
  const long = (q.text?.length ?? 0) > 90;
  return (
    <div key={q.id} className="flex w-full flex-col items-center gap-8">
      {q.author && (
        <div className="anim-slide glass flex items-center gap-4 rounded-full px-8 py-3 text-3xl font-bold">
          🙋 Skatītāja jautājums · <span className="text-gold">{q.author}</span>
        </div>
      )}
      <div
        className={`anim-flip text-center font-black leading-tight text-balance ${hasVisual ? (long ? 'text-[52px]' : 'text-[64px]') : long ? 'text-[72px]' : 'text-[88px]'}`}
        style={{ textShadow: '0 6px 30px rgba(0,0,0,0.5)' }}
      >
        {q.text}
      </div>
      {def.Screen && <def.Screen q={q} view={view} />}
      {/* Variantiem pareizo izceļ pats variants; attēlam/video atbilde parādās virs attēla. */}
      {view.revealed && q.answer && q.type !== 'choice' && (
        <div className={hasVisual ? 'absolute inset-x-0 bottom-6 z-10 flex justify-center' : ''}>
          <div className="anim-pop rounded-[32px] border-4 border-emerald-300 bg-emerald-500/90 px-14 py-6 text-center shadow-[0_0_100px_rgba(16,185,129,0.6)]">
            <div className="text-2xl font-bold tracking-[0.3em] text-white/80 uppercase">Pareizā atbilde</div>
            <div className="text-[68px] leading-tight font-black">{q.answer}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function BettingStage({ view, teams }: { view: PublicView; teams: [PublicTeam, PublicTeam] }) {
  const f = view.final!;
  const q = view.question;
  return (
    <div className="flex w-full flex-col items-center gap-10">
      <div className="anim-pop text-center">
        <div className="text-4xl font-bold tracking-[0.3em] text-white/60 uppercase">Fināls · {q?.number}. jautājums</div>
        <div className="gold-text text-[130px] leading-none font-black">LIKMES</div>
        {q?.topic && <div className="mt-4 text-5xl font-extrabold">Tēma: {q.topic}</div>}
      </div>
      <div className="grid w-full grid-cols-2 gap-16 px-20">
        {([0, 1] as Side[]).map((side) => (
          <div
            key={side}
            className="glass flex h-[260px] flex-col items-center justify-center rounded-[40px] text-center"
            style={{ borderColor: teams[side].color }}
          >
            <div className="text-4xl font-black" style={{ color: teams[side].color }}>
              {teams[side].name}
            </div>
            {f.betsRevealed ? (
              <div key="bet" className="anim-flip text-[130px] leading-none font-black text-glow">
                {f.bets[side]}
              </div>
            ) : f.betsLocked[side] ? (
              <div className="anim-pop mt-4 text-5xl font-black text-emerald-300">✔ Likme likta</div>
            ) : (
              <div className="mt-4 animate-pulse text-5xl font-bold text-white/50">Liek likmi…</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalAnswerCard({ view, side, team }: { view: PublicView; side: Side; team: PublicTeam }) {
  const f = view.final!;
  const revealed = f.revealed[side];
  const verdict = f.verdict[side];
  const bet = f.bets[side] ?? 0;
  return (
    <div className="h-[150px]" style={{ perspective: 1400 }}>
      {revealed ? (
        <div
          key="open"
          className={`anim-flip flex h-full items-center justify-between rounded-[32px] border-4 px-10 ${verdict ? 'border-emerald-300 bg-emerald-600/85' : 'border-rose-300 bg-rose-600/85'}`}
        >
          <div className="min-w-0">
            <div className="text-2xl font-bold text-white/80">{team.name} atbild:</div>
            <div className="truncate text-[56px] leading-tight font-black">{f.answers[side] || '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-6xl">{verdict ? '✔' : '✘'}</div>
            <div className="text-4xl font-black">
              {verdict ? '+' : '−'}
              {bet}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="glass flex h-full items-center justify-center gap-6 rounded-[32px] text-5xl font-black text-white/40"
          style={{ borderColor: team.color }}
        >
          <span className="anim-drum inline-block">✉</span> {team.name} atbilde
        </div>
      )}
    </div>
  );
}
