import { useState } from 'react';
import type { AppState, Match, RankPool, Settings, Slot } from '../../types';
import { commit } from '../../lib/store';
import { SCHEMES, getScheme, makeMatch } from '../../lib/schemes';
import { resetProgress } from '../../lib/engine';
import { slotLabel } from '../../lib/tournament';
import { readFileAsDataURL, uid } from '../../lib/util';

const SLOT_KINDS: { kind: Slot['kind']; label: string }[] = [
  { kind: 'seed', label: 'Izloze / manuāli' },
  { kind: 'winner', label: 'Spēles uzvarētājs' },
  { kind: 'loser', label: 'Spēles zaudētājs' },
  { kind: 'ranked', label: 'N-tais labākais (pēc kopējiem punktiem)' },
];

function editMatch(id: string, fn: (m: Match) => void) {
  commit((d) => {
    const m = d.tournament.matches.find((x) => x.id === id);
    if (m) fn(m);
  });
}

export function TournamentTab({ s }: { s: AppState }) {
  const t = s.tournament;
  const [schemeId, setSchemeId] = useState(t.schemeId);
  const started = t.matches.some((m) => m.status !== 'pending');

  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => commit((d) => void (d.tournament.settings[k] = v));

  const applyScheme = () => {
    const scheme = getScheme(schemeId);
    if (!scheme) return;
    if (!confirm(`Pielietot shēmu „${scheme.name}”? Spēļu saraksts tiks izveidots no jauna un turnīra progress atiestatīts.`)) return;
    commit((d) => {
      const old = d.tournament.matches;
      const fresh = scheme.build(d.tournament.settings);
      // Saglabā jautājumu kopas pēc kārtas: duelis→duelis, fināls→fināls.
      const oldDuels = old.filter((m) => m.kind === 'duel');
      const freshDuels = fresh.filter((m) => m.kind === 'duel');
      freshDuels.forEach((m, i) => (m.questionSetId = oldDuels[i]?.questionSetId ?? null));
      const oldFinal = old.find((m) => m.kind === 'final');
      fresh.filter((m) => m.kind === 'final').forEach((m) => (m.questionSetId = oldFinal?.questionSetId ?? null));
      d.tournament.matches = fresh;
      d.tournament.schemeId = scheme.id;
      resetProgress(d, false);
    });
  };

  const addMatch = () =>
    commit((d) => {
      const round = Math.max(1, ...d.tournament.matches.map((m) => m.round));
      d.tournament.matches.push(
        makeMatch({ id: uid('m'), title: 'Jauna spēle', round, roundName: `${round}. kārta`, slots: [{ kind: 'seed' }, { kind: 'seed' }] }, d.tournament.settings),
      );
    });

  return (
    <div className="space-y-4">
      <div className="card grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="label">Turnīra nosaukums</label>
          <input className="input text-lg font-bold" value={t.name} onChange={(e) => commit((d) => void (d.tournament.name = e.target.value))} />
        </div>
        <div>
          <label className="label">Apakšvirsraksts</label>
          <input className="input" value={t.subtitle} onChange={(e) => commit((d) => void (d.tournament.subtitle = e.target.value))} />
        </div>
        <div>
          <label className="label">Logotips</label>
          <div className="flex items-center gap-2">
            {t.logo && <img src={t.logo} alt="" className="h-10 rounded" />}
            <label className="btn btn-sm">
              Augšupielādēt
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await readFileAsDataURL(f);
                    commit((d) => void (d.tournament.logo = url));
                  }
                }}
              />
            </label>
            {t.logo && (
              <button className="btn btn-sm" onClick={() => commit((d) => void delete d.tournament.logo)}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Taimeris dueļos (s)" value={t.settings.defaultTimerSec} onChange={(v) => setSetting('defaultTimerSec', v)} />
        <NumberField label="Fināla jautājumu skaits" value={t.settings.finalQuestionCount} onChange={(v) => setSetting('finalQuestionCount', v)} />
        <NumberField label="Fināla taimeris (s)" value={t.settings.finalTimerSec} onChange={(v) => setSetting('finalTimerSec', v)} />
        <NumberField label="Attēla atklāšanas soļi" value={t.settings.imageRevealSteps} onChange={(v) => setSetting('imageRevealSteps', v)} />
        <div className="col-span-full">
          <label className="label">Fināla likmes</label>
          <select
            className="input"
            value={t.settings.finalBetCap ?? 'own'}
            onChange={(e) => setSetting('finalBetCap', e.target.value as Settings['finalBetCap'])}
          >
            <option value="own">Līdz visiem saviem punktiem</option>
            <option value="lower">Ne vairāk kā atpalicējas komandas punkti (mazāka plaisa)</option>
          </select>
          {t.settings.finalBetCap === 'lower' && (
            <p className="mt-1 text-xs text-amber-300">
              Atcerieties pielāgot noteikumu slaidu „Fināls: likmes” (cilne „Noteikumi”), lai komandas zina par ierobežojumu.
            </p>
          )}
        </div>
        <p className="col-span-full text-xs text-white/40">
          Noklusējuma vērtības jaunām spēlēm. Katrai spēlei tās var mainīt atsevišķi zemāk.
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold">Turnīra shēma</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="label">Shēmas paraugs</label>
            <select className="input" value={schemeId} onChange={(e) => setSchemeId(e.target.value)}>
              {SCHEMES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-warn" onClick={applyScheme}>
            Pielietot shēmu
          </button>
        </div>
        <p className="text-sm text-white/50">{getScheme(schemeId)?.description}</p>
        {started && <p className="text-sm text-amber-300">⚠ Turnīrs jau sākts. Spēļu struktūras maiņa var ietekmēt rezultātus.</p>}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Spēles ({t.matches.length})</h3>
          <div className="flex items-center gap-3">
            <label className="text-sm text-white/60">Zelta jautājumi (neizšķirtam):</label>
            <select
              className="input w-56"
              value={t.goldenSetId ?? ''}
              onChange={(e) => commit((d) => void (d.tournament.goldenSetId = e.target.value || null))}
            >
              <option value="">— nav —</option>
              {t.questionSets.map((qs) => (
                <option key={qs.id} value={qs.id}>
                  {qs.name} ({qs.questions.length})
                </option>
              ))}
            </select>
          </div>
        </div>
        {t.matches.map((m, idx) => (
          <MatchEditor key={m.id} s={s} m={m} idx={idx} />
        ))}
        <button className="btn" onClick={addMatch}>
          + Pievienot spēli
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" min={0} className="input" value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
    </div>
  );
}

function MatchEditor({ s, m, idx }: { s: AppState; m: Match; idx: number }) {
  const t = s.tournament;
  const others = t.matches.filter((x) => x.id !== m.id);
  const set = t.questionSets.find((q) => q.id === m.questionSetId);

  const setSlot = (i: 0 | 1, slot: Slot) => editMatch(m.id, (x) => void ((x.slots[i] = slot), (x.teams[i] = null)));

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="label">{idx + 1}. Nosaukums</label>
          <input className="input font-bold" value={m.title} onChange={(e) => editMatch(m.id, (x) => void (x.title = e.target.value))} />
        </div>
        <div>
          <label className="label">Kārta (kolonna)</label>
          <div className="flex gap-1">
            <input type="number" min={1} className="input w-16" value={m.round} onChange={(e) => editMatch(m.id, (x) => void (x.round = Number(e.target.value) || 1))} />
            <input className="input" value={m.roundName} onChange={(e) => editMatch(m.id, (x) => void (x.roundName = e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label">Veids</label>
          <select className="input" value={m.kind} onChange={(e) => editMatch(m.id, (x) => void (x.kind = e.target.value as Match['kind']))}>
            <option value="duel">Duelis</option>
            <option value="final">Fināls (likmes)</option>
          </select>
        </div>
        <div>
          <label className="label">Atbildēšana</label>
          <select
            className="input"
            disabled={m.kind === 'final'}
            value={m.answerMode}
            onChange={(e) => editMatch(m.id, (x) => void (x.answerMode = e.target.value as Match['answerMode']))}
          >
            <option value="turns">Pēc kārtas</option>
            <option value="buzzer">Ar pogu (kurš pirmais)</option>
          </select>
        </div>
        <div>
          <label className="label">Taimeris (s)</label>
          <input type="number" min={5} className="input" value={m.timerSec} onChange={(e) => editMatch(m.id, (x) => void (x.timerSec = Number(e.target.value) || 30))} />
        </div>
        <div className="md:col-span-3">
          <label className="label">Jautājumu kopa</label>
          <select className="input" value={m.questionSetId ?? ''} onChange={(e) => editMatch(m.id, (x) => void (x.questionSetId = e.target.value || null))}>
            <option value="">— nav piesaistīta —</option>
            {t.questionSets.map((qs) => (
              <option key={qs.id} value={qs.id}>
                {qs.name} ({qs.questions.length} jaut.)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Jautājumu skaits</label>
          <input
            type="number"
            min={0}
            className="input"
            value={m.questionCount}
            title="0 = visi kopas jautājumi"
            onChange={(e) => editMatch(m.id, (x) => void (x.questionCount = Math.max(0, Number(e.target.value) || 0)))}
          />
          <div className="mt-1 text-[10px] text-white/40">
            0 = visi ({set?.questions.length ?? 0})
          </div>
        </div>
        <div className="flex items-end justify-end md:col-span-2">
          <button
            className="btn btn-sm btn-bad"
            onClick={() =>
              confirm(`Dzēst spēli „${m.title}”?`) &&
              commit((d) => void (d.tournament.matches = d.tournament.matches.filter((x) => x.id !== m.id)))
            }
          >
            Dzēst spēli
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {([0, 1] as const).map((i) => {
          const slot = m.slots[i];
          return (
            <div key={i} className="rounded-md bg-white/5 p-2">
              <label className="label">Komanda {i === 0 ? 'A' : 'B'}: {slotLabel(t, slot)}</label>
              <div className="flex flex-wrap gap-2">
                <select
                  className="input w-auto"
                  value={slot.kind}
                  onChange={(e) => {
                    const kind = e.target.value as Slot['kind'];
                    const first = others[0]?.id ?? '';
                    setSlot(
                      i,
                      kind === 'seed'
                        ? { kind }
                        : kind === 'ranked'
                          ? { kind, matchIds: others.filter((x) => x.round < m.round).map((x) => x.id), rank: 1, pool: 'winners' }
                          : { kind, matchId: first },
                    );
                  }}
                >
                  {SLOT_KINDS.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {(slot.kind === 'winner' || slot.kind === 'loser') && (
                  <select className="input w-auto" value={slot.matchId} onChange={(e) => setSlot(i, { ...slot, matchId: e.target.value })}>
                    {others.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title}
                      </option>
                    ))}
                  </select>
                )}
                {slot.kind === 'ranked' && (
                  <>
                    <input
                      type="number"
                      min={1}
                      className="input w-20"
                      title="Vieta (1 = visvairāk punktu)"
                      value={slot.rank}
                      onChange={(e) => setSlot(i, { ...slot, rank: Math.max(1, Number(e.target.value) || 1) })}
                    />
                    <select
                      className="input w-auto"
                      value={slot.pool ?? 'winners'}
                      onChange={(e) => setSlot(i, { ...slot, pool: e.target.value as RankPool })}
                    >
                      <option value="winners">uzvarētājs</option>
                      <option value="losers">zaudētājs</option>
                    </select>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {others.map((x) => (
                        <label key={x.id} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={slot.matchIds.includes(x.id)}
                            onChange={(e) =>
                              setSlot(i, {
                                ...slot,
                                matchIds: e.target.checked ? [...slot.matchIds, x.id] : slot.matchIds.filter((y) => y !== x.id),
                              })
                            }
                          />
                          {x.title}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
