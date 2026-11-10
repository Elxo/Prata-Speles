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
  const golden = !!q?.golden;
  if (m.kind === 'final' && !golden) return <DebateScreen view={view} m={m} teams={teams} />;

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
          {q && (
            <span className="rounded-2xl bg-hot px-5 py-2">
              {q.points} {pointsWord(q.points)}
            </span>
          )}
        </div>
      </div>

      {/* Centrs */}
      <div className="relative flex flex-1 items-center gap-10 py-8">
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-8">
          {!view.shown || !q ? <Teaser view={view} m={m} /> : <QuestionBody view={view} />}
        </div>
        {view.shown && (
          <div className="flex shrink-0 flex-col items-center gap-4">
            <TimerRing timer={view.timer} />
          </div>
        )}
      </div>

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
            showMatchPoints={m.kind !== 'final'}
            extra={golden && view.goldenTries[side] ? <span className="text-xl text-white/50">atbildēja</span> : null}
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
            <span className="rounded-3xl bg-hot px-8 py-4">
              {q.points} {pointsWord(q.points)}
            </span>
          </div>
          {m.answerMode === 'buzzer' && <div className="text-3xl font-bold text-white/60">Atbild komanda, kura pirmā nospiež pogu!</div>}
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

// ── Fināla debates ──────────────────────────────────────────

const STANCE: Record<'for' | 'against', { label: string; color: string }> = {
  for: { label: 'PAR', color: '#34d399' },
  against: { label: 'PRET', color: '#fb7185' },
};

function DebateScreen({ view, m, teams }: { view: PublicView; m: PublicMatch; teams: [PublicTeam, PublicTeam] }) {
  const q = view.question;
  const f = view.final!;
  const stance = (side: Side) => STANCE[side === f.forSide ? 'for' : 'against'];

  return (
    <div className="absolute inset-0 flex flex-col px-16 pt-10 pb-10">
      <div className="flex items-center justify-between text-3xl font-extrabold">
        <div className="flex items-center gap-4">
          <span className="rounded-2xl bg-white/10 px-5 py-2 text-white/80">{m.title}</span>
          {q && (
            <span className="rounded-2xl bg-gold px-5 py-2 text-[#1b1040]">
              {q.number}. tēma no {q.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {q?.topic && <span className="rounded-2xl bg-white/10 px-5 py-2">{q.topic}</span>}
          <span className="rounded-2xl bg-hot px-5 py-2">DEBATES</span>
        </div>
      </div>

      <div className="relative flex flex-1 items-center gap-10 py-8">
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-10">
          {!q ? (
            <div className="text-5xl font-black text-white/60">Gatavojamies…</div>
          ) : !view.shown ? (
            <div key={q.id} className="anim-pop flex flex-col items-center gap-6 text-center">
              <div className="text-4xl font-bold tracking-[0.3em] text-white/60 uppercase">{m.roundName} · debates</div>
              <div className="gold-text text-[160px] leading-none font-black">{q.number}. tēma</div>
              {q.topic && <span className="glass rounded-3xl px-8 py-4 text-5xl font-extrabold">{q.topic}</span>}
            </div>
          ) : (
            <div key={q.id} className="flex w-full flex-col items-center gap-4">
              <div className="text-3xl font-bold tracking-[0.3em] text-white/60 uppercase">Tēze</div>
              <div
                className={`anim-flip text-center leading-tight font-black text-balance ${(q.text?.length ?? 0) > 70 ? 'text-[64px]' : 'text-[80px]'}`}
                style={{ textShadow: '0 6px 30px rgba(0,0,0,0.5)' }}
              >
                „{q.text}”
              </div>
            </div>
          )}
          {q && (
            <div className="grid w-full grid-cols-2 gap-16 px-10">
              {([0, 1] as Side[]).map((side) => (
                <StanceCard key={side} team={teams[side]} stance={stance(side)} jury={f.jury[side]} max={f.maxPoints} />
              ))}
            </div>
          )}
        </div>
        {view.shown && (
          <div className="flex shrink-0 flex-col items-center gap-3">
            <TimerRing timer={view.timer} />
            <span className="text-2xl font-bold tracking-widest text-white/50 uppercase">Debašu laiks</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-10">
        {([0, 1] as Side[]).map((side) => (
          <TeamPanel
            key={side}
            team={teams[side]}
            side={side}
            matchPoints={m.points[side]}
            active={false}
            event={view.event}
            showMatchPoints={false}
            extra={
              <span className="rounded-full px-3 py-0.5 text-xl font-black text-black" style={{ background: stance(side).color }}>
                {stance(side).label}
              </span>
            }
          />
        ))}
      </div>
    </div>
  );
}

function StanceCard({ team, stance, jury, max }: { team: PublicTeam; stance: { label: string; color: string }; jury: number | null; max: number }) {
  return (
    <div
      className="glass flex h-[200px] items-center justify-between rounded-[40px] border-4 px-12"
      style={{ borderColor: stance.color, boxShadow: `0 0 60px ${stance.color}44` }}
    >
      <div className="min-w-0">
        <div className="text-6xl font-black" style={{ color: stance.color }}>
          {stance.label}
        </div>
        <div className="truncate text-4xl font-black" style={{ color: team.color }}>
          {team.name}
        </div>
      </div>
      {jury !== null && (
        <div key="jury" className="anim-flip text-right">
          <div className="text-xl font-bold tracking-widest text-white/60 uppercase">Žūrija</div>
          <div className="text-[110px] leading-none font-black text-glow">
            +{jury}
            <span className="text-4xl text-white/50">/{max}</span>
          </div>
        </div>
      )}
    </div>
  );
}
