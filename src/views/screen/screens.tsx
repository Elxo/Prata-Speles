import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { PublicTeam, PublicView } from '../../lib/publicView';
import { STATUS_LABEL } from '../../lib/tournament';
import { pointsWord } from '../../lib/util';
import { AnimatedNumber, TeamBadge } from '../../components/common';
import { Bracket } from '../../components/Bracket';
import { IS_PREVIEW } from '../../lib/env';

export function Logo({ view, small = false }: { view: PublicView; small?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      {view.logo && <img src={view.logo} alt="" className={small ? 'mb-2 h-20' : 'mb-8 h-64'} />}
      <div className={`gold-text font-black tracking-tight ${small ? 'text-5xl' : 'text-[190px] leading-[0.95]'}`}>{view.name}</div>
      {!small && view.subtitle && <div className="mt-6 text-5xl font-bold tracking-widest text-white/80">{view.subtitle}</div>}
    </div>
  );
}

export function LogoScreen({ view }: { view: PublicView }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="anim-pop">
        <Logo view={view} />
      </div>
      <div className="anim-slide delay-5 mt-16 flex gap-6">
        {['VEIKSME', 'INTUĪCIJA', 'PRĀTS'].map((w, i) => (
          <span
            key={w}
            className="anim-pop rounded-full border-4 border-white/20 px-10 py-4 text-4xl font-black tracking-widest"
            style={{ animationDelay: `${0.6 + i * 0.25}s`, color: ['#ff3d7f', '#2ec4ff', '#ffcc33'][i] }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RulesScreen({ view }: { view: PublicView }) {
  const { slides, index, deck } = view.rules;
  const slide = slides[index];
  if (!slide) return <LogoScreen view={view} />;
  const lines = slide.body.split('\n').filter((l) => l.trim());
  return (
    <div className="absolute inset-0 flex flex-col px-28 py-20">
      <div className="flex items-center justify-between text-3xl font-bold text-white/60">
        <span>{deck === 'final' ? '🏆 FINĀLA NOTEIKUMI' : 'SPĒLES NOTEIKUMI'}</span>
        <span>
          {index + 1} / {slides.length}
        </span>
      </div>
      <div key={slide.id} className="flex flex-1 flex-col justify-center">
        <h1 className="anim-slide gold-text mb-14 text-[110px] leading-none font-black">{slide.title}</h1>
        <div className="flex gap-16">
          <div className="flex flex-1 flex-col gap-8">
            {lines.map((l, i) => (
              <p
                key={i}
                className="anim-slide text-[50px] leading-snug font-bold"
                style={{ animationDelay: `${0.2 + i * 0.18}s` }}
              >
                {l}
              </p>
            ))}
          </div>
          {slide.kind === 'bracket' && (
            <div className="anim-fade delay-5 w-[900px] shrink-0 scale-95">
              <Bracket rounds={view.rounds} />
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-center gap-3">
        {slides.map((s, i) => (
          <span key={s.id} className={`h-3 rounded-full transition-all ${i === index ? 'w-16 bg-gold' : 'w-3 bg-white/25'}`} />
        ))}
      </div>
    </div>
  );
}

function IntroTeam({ team, side }: { team: PublicTeam; side: 0 | 1 }) {
  return (
    <div
      className="anim-slide flex flex-1 flex-col items-center gap-6 text-center"
      style={{ animationDelay: side ? '0.5s' : '0.2s' }}
    >
      <TeamBadge name={team.name} color={team.color} logo={team.logo} size={260} />
      <div className="text-[80px] leading-none font-black" style={{ color: team.color, textShadow: '0 6px 30px rgba(0,0,0,.6)' }}>
        {team.name}
      </div>
      <div className="text-3xl font-bold text-white/70">Kapteinis: {team.captain || '—'}</div>
      {team.members.length > 0 && <div className="max-w-[640px] text-2xl text-white/50">{team.members.join(' · ')}</div>}
      <div className="glass mt-2 rounded-3xl px-10 py-4">
        <span className="text-2xl font-bold text-white/60 uppercase">Kopā </span>
        <span className="text-6xl font-black">{team.score}</span>
      </div>
    </div>
  );
}

export function MatchIntroScreen({ view }: { view: PublicView }) {
  const m = view.match;
  if (!m || !m.teams[0] || !m.teams[1]) return <LogoScreen view={view} />;
  return (
    <div className="absolute inset-0 flex flex-col items-center px-20 py-16">
      <div className="anim-pop text-center">
        <div className="text-4xl font-bold tracking-[0.3em] text-white/60 uppercase">{m.roundName}</div>
        <div className="gold-text text-[110px] leading-none font-black">{m.title}</div>
      </div>
      <div className="flex w-full flex-1 items-center gap-10">
        <IntroTeam team={m.teams[0]} side={0} />
        <div className="anim-pop delay-5 text-[150px] font-black text-white/90 italic" style={{ textShadow: '0 0 60px #ff3d7f' }}>
          pret
        </div>
        <IntroTeam team={m.teams[1]} side={1} />
      </div>
      <div className="anim-fade delay-5 text-3xl font-bold text-white/60">
        {m.kind === 'final'
          ? `Debates · ${m.questionCount} ${m.questionCount === 1 ? 'tēma' : 'tēmas'} · „par” un „pret”`
          : `${m.questionCount} jautājumi · ${m.answerMode === 'turns' ? 'atbild pēc kārtas' : 'atbild, kurš pirmais nospiež pogu'}`}
      </div>
    </div>
  );
}

export function MatchResultScreen({ view }: { view: PublicView }) {
  const m = view.match;
  if (!m || m.winnerSide === null) return <BracketScreen view={view} />;
  const winner = m.teams[m.winnerSide]!;
  const loser = m.teams[1 - m.winnerSide]!;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-10">
      <div className="anim-slide text-5xl font-bold tracking-[0.25em] text-white/70 uppercase">{m.title} — uzvarētājs</div>
      <div className="anim-pop delay-2">
        <TeamBadge name={winner.name} color={winner.color} logo={winner.logo} size={280} className="anim-glow" />
      </div>
      <div className="anim-pop delay-3 text-[130px] leading-none font-black" style={{ color: winner.color, textShadow: '0 8px 40px rgba(0,0,0,.6)' }}>
        {winner.name}
      </div>
      <div className="anim-slide delay-5 flex items-center gap-10 text-6xl font-black">
        <span style={{ color: winner.color }}>{m.points[m.winnerSide]}</span>
        <span className="text-white/40">:</span>
        <span className="text-white/50">{m.points[1 - m.winnerSide]}</span>
      </div>
      {m.decidedBy === 'golden' && <div className="shimmer rounded-full bg-gold px-8 py-2 text-3xl font-black text-black">Izšķīra zelta jautājums!</div>}
      <div className="anim-fade delay-5 grid grid-cols-2 gap-10 text-3xl font-bold text-white/70">
        <div>
          {winner.name}: kopā <b className="text-white">{winner.score}</b> {pointsWord(winner.score)}
        </div>
        <div>
          {loser.name}: kopā <b className="text-white">{loser.score}</b> {pointsWord(loser.score)}
        </div>
      </div>
    </div>
  );
}

export function BracketScreen({ view }: { view: PublicView }) {
  return (
    <div className="absolute inset-0 flex flex-col px-16 py-14">
      <div className="anim-pop mb-10 flex items-center justify-between">
        <div className="gold-text text-[80px] leading-none font-black">Turnīra koks</div>
        <Logo view={view} small />
      </div>
      <div className="flex-1">
        <Bracket rounds={view.rounds} big />
      </div>
    </div>
  );
}

export function StandingsScreen({ view }: { view: PublicView }) {
  const max = Math.max(1, ...view.standings.map((t) => t.score));
  return (
    <div className="absolute inset-0 flex flex-col px-28 py-16">
      <div className="anim-pop mb-10 flex items-center justify-between">
        <div className="gold-text text-[80px] leading-none font-black">Kopējā punktu tabula</div>
        <Logo view={view} small />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-5">
        {view.standings.map((t, i) => {
          const out = t.status === 'out';
          return (
            <div
              key={t.id}
              className={`anim-slide glass relative flex items-center gap-8 overflow-hidden rounded-[28px] px-8 py-4 ${out ? 'opacity-45' : ''}`}
              style={{ animationDelay: `${0.1 + i * 0.12}s` }}
            >
              <div
                className="absolute inset-y-0 left-0 opacity-30 transition-all duration-1000"
                style={{ width: `${(Math.max(0, t.score) / max) * 100}%`, background: t.color }}
              />
              <div className="relative w-20 text-center text-6xl font-black text-white/70">{i + 1}.</div>
              <TeamBadge name={t.name} color={t.color} logo={t.logo} size={84} className="relative" />
              <div className="relative flex-1 text-[52px] font-black">{t.name}</div>
              <div
                className={`relative rounded-full px-5 py-1 text-2xl font-bold ${t.status === 'out' ? 'bg-white/10 text-white/60' : t.status === 'champion' ? 'bg-gold text-black' : 'bg-emerald-500/30 text-emerald-200'}`}
              >
                {STATUS_LABEL[t.status]}
              </div>
              <div className="relative w-48 text-right text-[72px] font-black tabular-nums">
                <AnimatedNumber value={t.score} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WinnerScreen({ view }: { view: PublicView }) {
  const champ = view.champion;
  useEffect(() => {
    if (!champ || IS_PREVIEW) return;
    const colors = [champ.color, '#ffcc33', '#ffffff', '#ff3d7f', '#2ec4ff'];
    const burst = () => {
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors, startVelocity: 55 });
      confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.8 }, colors });
      confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.8 }, colors });
    };
    burst();
    const id = setInterval(burst, 3500);
    return () => clearInterval(id);
  }, [champ]);
  if (!champ) return <StandingsScreen view={view} />;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
      <div className="anim-pop text-[160px] leading-none">🏆</div>
      <div className="anim-slide delay-2 text-5xl font-bold tracking-[0.35em] text-white/80 uppercase">{view.name} — čempioni</div>
      <div className="anim-pop delay-3">
        <TeamBadge name={champ.name} color={champ.color} logo={champ.logo} size={240} className="anim-glow" />
      </div>
      <div className="anim-pop delay-4 gold-text text-[150px] leading-none font-black">{champ.name}</div>
      <div className="anim-slide delay-5 text-6xl font-black">
        <AnimatedNumber value={champ.score} duration={2500} /> {pointsWord(champ.score)}
      </div>
      {champ.members.length > 0 && (
        <div className="anim-fade delay-5 max-w-[1500px] text-center text-3xl font-bold text-white/70">
          {[champ.captain, ...champ.members].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
}
