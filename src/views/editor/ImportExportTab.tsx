import { useState } from 'react';
import type { AppState, Tournament } from '../../types';
import { commit, replaceState } from '../../lib/store';
import { CSV_TEMPLATE, exportJSON, importJSON, readSpreadsheet, rowsToQuestions, type ImportResult } from '../../lib/io';
import { createDemoState } from '../../data/demo';
import { createLive, DEFAULT_SETTINGS, defaultRules, TEAM_COLORS } from '../../lib/defaults';
import { getScheme } from '../../lib/schemes';
import { downloadText, normalize, uid } from '../../lib/util';
import { QUESTION_TYPES } from '../../questionTypes';

/** Kur likt importētos jautājumus pēc kolonnas „spēle” vērtības. */
function resolveTarget(t: Tournament, game: string): { key: string; label: string; matchId?: string; golden?: boolean } {
  const g = normalize(game);
  if (!g) return { key: 'imported', label: 'Importētie jautājumi' };
  if (g.startsWith('zelta')) return { key: 'golden', label: 'Zelta jautājumi', golden: true };
  const byNumber = /^\d+$/.test(g) ? t.matches[Number(g) - 1] : undefined;
  const m = byNumber ?? t.matches.find((x) => normalize(x.title) === g || normalize(x.roundName) === g);
  if (m) return { key: `m:${m.id}`, label: m.title, matchId: m.id };
  return { key: `n:${g}`, label: game.trim() };
}

function slugDate() {
  return new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
}

export function ImportExportTab({ s }: { s: AppState }) {
  const t = s.tournament;
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [replace, setReplace] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const onSpreadsheet = async (file: File) => {
    try {
      const rows = await readSpreadsheet(file);
      setPreview(rowsToQuestions(rows));
      setMessage(null);
    } catch (err) {
      setMessage('Neizdevās nolasīt failu: ' + (err as Error).message);
    }
  };

  const applyImport = () => {
    if (!preview) return;
    commit((d) => {
      const dt = d.tournament;
      const cleared = new Set<string>();
      const target = (game: string) => {
        const r = resolveTarget(dt, game);
        let set;
        if (r.golden) {
          set = dt.questionSets.find((x) => x.id === dt.goldenSetId);
          if (!set) {
            set = { id: uid('set'), name: 'Zelta jautājumi', questions: [] };
            dt.questionSets.push(set);
            dt.goldenSetId = set.id;
          }
        } else if (r.matchId) {
          const m = dt.matches.find((x) => x.id === r.matchId)!;
          set = dt.questionSets.find((x) => x.id === m.questionSetId);
          if (!set) {
            set = { id: uid('set'), name: m.title, questions: [] };
            dt.questionSets.push(set);
            m.questionSetId = set.id;
          }
        } else {
          set = dt.questionSets.find((x) => normalize(x.name) === normalize(r.label));
          if (!set) {
            set = { id: uid('set'), name: r.label, questions: [] };
            dt.questionSets.push(set);
          }
        }
        if (replace && !cleared.has(set.id)) {
          set.questions = [];
          cleared.add(set.id);
        }
        return set;
      };
      for (const row of preview.rows) target(row.game).questions.push(row.question);
    });
    setMessage(`✔ Importēti ${preview.rows.length} jautājumi.`);
    setPreview(null);
  };

  const onJSON = async (file: File) => {
    try {
      const next = importJSON(await file.text(), s);
      if (!confirm(`Ielādēt turnīru „${next.tournament.name}”? Pašreizējais turnīrs tiks aizstāts.`)) return;
      replaceState(next);
      setMessage('✔ Turnīrs ielādēts.');
    } catch (err) {
      setMessage('Kļūda: ' + (err as Error).message);
    }
  };

  const newEmpty = () => {
    if (!confirm('Izveidot jaunu tukšu turnīru? Pašreizējais tiks aizstāts (vispirms eksportējiet to!).')) return;
    const settings = { ...DEFAULT_SETTINGS };
    replaceState({
      version: 1,
      live: createLive(),
      tournament: {
        id: uid('t'),
        name: 'Prāta spēles',
        subtitle: 'Erudīcijas turnīrs',
        schemeId: 'six',
        teams: Array.from({ length: 6 }, (_, i) => ({
          id: uid('team'),
          name: `Komanda ${i + 1}`,
          color: TEAM_COLORS[i],
          captain: '',
          members: [],
          score: 0,
        })),
        matches: getScheme('six')!.build(settings),
        questionSets: [],
        goldenSetId: null,
        rules: defaultRules(),
        settings,
        championId: null,
      },
    });
  };

  return (
    <div className="space-y-4">
      {message && <div className="card border-indigo-400/50">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <h3 className="font-bold">💾 Eksports (JSON)</h3>
          <p className="text-sm text-white/60">Saglabājiet turnīru failā — rezerves kopijai vai pārnešanai uz citu datoru.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => downloadText(`prata-speles-${slugDate()}.json`, exportJSON(s, false))}>
              Eksportēt turnīru
            </button>
            <button className="btn" onClick={() => downloadText(`prata-speles-progress-${slugDate()}.json`, exportJSON(s, true))}>
              Eksportēt ar spēles progresu
            </button>
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="font-bold">📂 Imports (JSON)</h3>
          <p className="text-sm text-white/60">Ielādē iepriekš eksportētu turnīru (aizstāj pašreizējo).</p>
          <input type="file" accept=".json,application/json" className="text-sm" onChange={(e) => e.target.files?.[0] && onJSON(e.target.files[0])} />
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold">📊 Jautājumu imports no CSV / Excel</h3>
        <p className="text-sm text-white/60">
          Pirmā rinda — kolonnu nosaukumi: <b>spēle, tēma, jautājums, atbilde, punkti, laiks</b>. Pēc izvēles: <b>tips</b> (teksts / varianti /
          attēls / audio / video / skatītāju), <b>A, B, C, D</b> (varianti; atbildē var rakstīt burtu), <b>autors</b>, <b>piezīmes</b>,{' '}
          <b>attēls</b> (URL). Kolonnā „spēle”: spēles numurs (1, 2, …), nosaukums („Pusfināls”, „Fināls”) vai „Zelta”.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,.ods"
            className="text-sm"
            onChange={(e) => e.target.files?.[0] && onSpreadsheet(e.target.files[0])}
          />
          <button className="btn btn-sm" onClick={() => downloadText('jautajumi-paraugs.csv', '﻿' + CSV_TEMPLATE, 'text/csv;charset=utf-8')}>
            ⬇ Lejupielādēt paraugu (CSV)
          </button>
        </div>

        {preview && (
          <div className="space-y-3">
            {preview.warnings.length > 0 && (
              <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
                {preview.warnings.map((w, i) => (
                  <div key={i}>⚠ {w}</div>
                ))}
              </div>
            )}
            <div className="max-h-96 overflow-auto rounded-lg border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#20242f] text-xs text-white/60 uppercase">
                  <tr>
                    <th className="p-2">Kur</th>
                    <th className="p-2">Tips</th>
                    <th className="p-2">Tēma</th>
                    <th className="p-2">Jautājums</th>
                    <th className="p-2">Atbilde</th>
                    <th className="p-2">P.</th>
                    <th className="p-2">s</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map(({ game, question: q }) => (
                    <tr key={q.id} className="border-t border-white/5">
                      <td className="p-2 whitespace-nowrap text-indigo-300">{resolveTarget(t, game).label}</td>
                      <td className="p-2">{QUESTION_TYPES[q.type].icon}</td>
                      <td className="p-2">{q.topic}</td>
                      <td className="p-2">{q.text}</td>
                      <td className="p-2 text-emerald-300">{q.answer}</td>
                      <td className="p-2">{q.points}</td>
                      <td className="p-2">{q.timeSec ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                Aizstāt esošos jautājumus attiecīgajās kopās
              </label>
              <button className="btn btn-good ml-auto" disabled={preview.rows.length === 0} onClick={applyImport}>
                Importēt {preview.rows.length} jautājumus
              </button>
              <button className="btn" onClick={() => setPreview(null)}>
                Atcelt
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card flex flex-wrap items-center gap-3 border-rose-500/30">
        <div className="flex-1 text-sm text-white/60">Sākt no jauna. Pašreizējais turnīrs tiks aizstāts — vispirms to eksportējiet.</div>
        <button
          className="btn"
          onClick={() => confirm('Ielādēt demo turnīru? Pašreizējais tiks aizstāts.') && replaceState(createDemoState())}
        >
          Ielādēt demo turnīru
        </button>
        <button className="btn btn-bad" onClick={newEmpty}>
          Jauns tukšs turnīrs
        </button>
      </div>
    </div>
  );
}
