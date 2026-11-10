import type { AppState, RuleSlide } from '../../types';
import { commit } from '../../lib/store';
import { defaultRules } from '../../lib/defaults';
import { uid } from '../../lib/util';

function editRules(fn: (rules: RuleSlide[]) => void) {
  commit((d) => fn(d.tournament.rules));
}

export function RulesTab({ s }: { s: AppState }) {
  const rules = s.tournament.rules;
  const patch = (id: string, p: Partial<RuleSlide>) =>
    editRules((rs) => {
      const r = rs.find((x) => x.id === id);
      if (r) Object.assign(r, p);
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-white/60">
          Noteikumu slaidi, ko vadītājs pārslēdz lielajā ekrānā. Katra rindiņa — atsevišķa rindkopa. Slaidi ar atzīmi „Fināls” automātiski tiek
          parādīti vēlreiz pirms fināla.
        </p>
        <button
          className="btn"
          onClick={() => confirm('Aizstāt visus slaidus ar noklusējuma tekstu?') && commit((d) => void (d.tournament.rules = defaultRules()))}
        >
          Atjaunot noklusējumu
        </button>
      </div>
      {rules.map((r, i) => (
        <div key={r.id} className="card space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-6 font-bold text-white/40">{i + 1}.</span>
            <input className="input flex-1 text-lg font-bold" value={r.title} onChange={(e) => patch(r.id, { title: e.target.value })} />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.final} onChange={(e) => patch(r.id, { final: e.target.checked })} /> Fināls
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.kind === 'bracket'} onChange={(e) => patch(r.id, { kind: e.target.checked ? 'bracket' : 'text' })} />{' '}
              Rādīt turnīra shēmu
            </label>
            <button className="btn btn-sm" disabled={i === 0} onClick={() => editRules((rs) => void ([rs[i - 1], rs[i]] = [rs[i], rs[i - 1]]))}>
              ↑
            </button>
            <button
              className="btn btn-sm"
              disabled={i === rules.length - 1}
              onClick={() => editRules((rs) => void ([rs[i + 1], rs[i]] = [rs[i], rs[i + 1]]))}
            >
              ↓
            </button>
            <button className="btn btn-sm btn-bad" onClick={() => confirm('Dzēst slaidu?') && editRules((rs) => void rs.splice(i, 1))}>
              ✕
            </button>
          </div>
          <textarea className="input min-h-28 text-base" value={r.body} onChange={(e) => patch(r.id, { body: e.target.value })} />
        </div>
      ))}
      <button
        className="btn btn-primary"
        onClick={() => editRules((rs) => void rs.push({ id: uid('rule'), title: 'Jauns slaids', body: '', kind: 'text', final: false }))}
      >
        + Pievienot slaidu
      </button>
    </div>
  );
}
