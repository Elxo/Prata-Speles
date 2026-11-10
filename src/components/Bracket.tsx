import type { PublicMatch, PublicView } from '../lib/publicView';
import { TeamBadge } from './common';

/** Turnīra koks: kolonnas pa kārtām, katrā spēles kartītes. Izmanto gan ekrānā, gan pultī. */
export function Bracket({ rounds, big = false }: { rounds: PublicView['rounds']; big?: boolean }) {
  return (
    <div className={`flex items-stretch ${big ? 'gap-10' : 'gap-3'}`}>
      {rounds.map((r, ri) => (
        <div key={r.round} className="flex flex-1 items-stretch">
          <div className="flex flex-1 flex-col">
            <div
              className={`text-center font-black tracking-widest uppercase ${big ? 'mb-6 text-2xl text-gold' : 'mb-2 text-[10px] text-white/50'}`}
            >
              {r.name}
            </div>
            <div className={`flex flex-1 flex-col justify-around ${big ? 'gap-6' : 'gap-2'}`}>
              {r.matches.map((m, mi) => (
                <MatchCard key={m.id} m={m} big={big} delay={big ? ri * 0.25 + mi * 0.1 : 0} />
              ))}
            </div>
          </div>
          {ri < rounds.length - 1 && (
            <div className={`flex items-center ${big ? 'pl-10 text-5xl' : 'pl-3 text-lg'} text-white/25`}>›</div>
          )}
        </div>
      ))}
    </div>
  );
}

function MatchCard({ m, big, delay }: { m: PublicMatch; big: boolean; delay: number }) {
  const live = m.status === 'live';
  const isFinal = m.kind === 'final';
  return (
    <div
      className={`${big ? 'anim-slide rounded-3xl p-5' : 'rounded-lg p-2'} glass relative ${live ? 'anim-glow' : ''}`}
      style={{
        animationDelay: big ? `${delay}s` : undefined,
        borderColor: live ? '#ffcc33' : isFinal ? 'rgba(255,204,51,0.4)' : undefined,
      }}
    >
      <div className={`flex items-center justify-between ${big ? 'mb-3 text-lg' : 'mb-1 text-[10px]'} font-bold text-white/60`}>
        <span>
          {isFinal && '🏆 '}
          {m.title}
        </span>
        {live && <span className="rounded-full bg-gold px-2 text-black">TIEŠRAIDĒ</span>}
        {m.status === 'done' && m.decidedBy === 'golden' && <span className="text-gold">zelta jaut.</span>}
      </div>
      {[0, 1].map((i) => {
        const team = m.teams[i];
        const won = m.winnerSide === i;
        const lost = m.winnerSide !== null && !won;
        return (
          <div
            key={i}
            className={`flex items-center ${big ? 'gap-4 py-2' : 'gap-2 py-0.5'} ${lost ? 'opacity-40' : ''}`}
          >
            {team ? (
              <>
                <TeamBadge name={team.name} color={team.color} logo={team.logo} size={big ? 52 : 20} />
                <span className={`flex-1 truncate font-extrabold ${big ? 'text-3xl' : 'text-xs'} ${lost ? 'line-through' : ''}`}>
                  {team.name}
                </span>
                {m.status !== 'pending' && !isFinal && (
                  <span className={`font-black tabular-nums ${big ? 'text-3xl' : 'text-xs'} ${won ? 'text-gold' : ''}`}>
                    {m.points[i]}
                  </span>
                )}
                {won && <span className={big ? 'text-3xl' : 'text-xs'}>{isFinal ? '👑' : '✔'}</span>}
              </>
            ) : (
              <span className={`italic text-white/40 ${big ? 'py-3 text-xl' : 'text-[10px]'}`}>{m.labels[i]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
