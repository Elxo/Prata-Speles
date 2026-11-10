import { commit, useAppState } from '../../lib/store';
import { TEAM_COLORS } from '../../lib/defaults';
import { readFileAsDataURL, uid } from '../../lib/util';
import { TeamBadge } from '../../components/common';
import type { Team } from '../../types';

/** Komandu iestatīšana (izmanto gan pultī, gan redaktorā). */
export function TeamsPanel() {
  const s = useAppState();
  const teams = s.tournament.teams;
  const started = s.tournament.matches.some((m) => m.status !== 'pending');

  const update = (id: string, patch: Partial<Team>) =>
    commit((d) => {
      const t = d.tournament.teams.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
    });

  const add = () =>
    commit((d) => {
      const n = d.tournament.teams.length;
      d.tournament.teams.push({
        id: uid('team'),
        name: `Komanda ${n + 1}`,
        color: TEAM_COLORS[n % TEAM_COLORS.length],
        captain: '',
        members: [],
        score: d.tournament.settings.startingScore ?? 0,
      });
    });

  const remove = (id: string) => {
    if (!confirm('Dzēst komandu?')) return;
    commit((d) => {
      d.tournament.teams = d.tournament.teams.filter((x) => x.id !== id);
      d.tournament.matches.forEach((m) => (m.teams = m.teams.map((x) => (x === id ? null : x)) as [string | null, string | null]));
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Komandas ({teams.length})</h2>
        <button className="btn btn-primary" onClick={add}>
          + Pievienot komandu
        </button>
      </div>
      {started && (
        <p className="text-sm text-amber-300/80">Turnīrs jau sākts — komandu dzēšana var izjaukt rezultātus. Nosaukumus un krāsas var mainīt droši.</p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {teams.map((t) => (
          <div key={t.id} className="card space-y-3" style={{ borderColor: t.color }}>
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer" title="Augšupielādēt logotipu">
                <TeamBadge name={t.name} color={t.color} logo={t.logo} size={56} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) update(t.id, { logo: await readFileAsDataURL(file) });
                  }}
                />
              </label>
              <input className="input text-lg font-bold" value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} />
              <input
                type="color"
                className="h-10 w-12 shrink-0 cursor-pointer rounded border-0 bg-transparent"
                value={t.color}
                onChange={(e) => update(t.id, { color: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Kapteinis</label>
                <input className="input" value={t.captain} onChange={(e) => update(t.id, { captain: e.target.value })} />
              </div>
              <div>
                <label className="label">Kopējie punkti</label>
                <input
                  type="number"
                  className="input"
                  value={t.score}
                  onChange={(e) => update(t.id, { score: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="label">Dalībnieki (atdalīti ar komatu)</label>
              <input
                className="input"
                value={t.members.join(', ')}
                onChange={(e) => update(t.id, { members: e.target.value.split(',').map((x) => x.trimStart()).filter((x, i, a) => x || i === a.length - 1) })}
                onBlur={(e) => update(t.id, { members: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
              />
            </div>
            <div className="flex justify-between">
              {t.logo ? (
                <button className="btn btn-sm" onClick={() => update(t.id, { logo: undefined })}>
                  Noņemt logotipu
                </button>
              ) : (
                <span className="text-xs text-white/40">Klikšķiniet uz apļa, lai pievienotu logotipu</span>
              )}
              <button className="btn btn-sm btn-bad" onClick={() => remove(t.id)}>
                Dzēst
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
