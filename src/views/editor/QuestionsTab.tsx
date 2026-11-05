import { useState } from 'react';
import type { AppState, Question, QuestionType } from '../../types';
import { commit } from '../../lib/store';
import { OPTION_LETTERS, readFileAsDataURL, uid } from '../../lib/util';
import { QUESTION_TYPES, QUESTION_TYPE_LIST } from '../../questionTypes';

function editSet(setId: string, fn: (qs: Question[]) => void) {
  commit((d) => {
    const set = d.tournament.questionSets.find((x) => x.id === setId);
    if (set) fn(set.questions);
  });
}

function editQuestion(setId: string, qid: string, patch: Partial<Question>) {
  editSet(setId, (qs) => {
    const q = qs.find((x) => x.id === qid);
    if (q) Object.assign(q, patch);
  });
}

export function newQuestion(type: QuestionType = 'text'): Question {
  return { id: uid('q'), type, text: '', answer: '', points: 10 };
}

export function QuestionsTab({ s }: { s: AppState }) {
  const t = s.tournament;
  const [setId, setSetId] = useState(t.questionSets[0]?.id ?? '');
  const [openId, setOpenId] = useState<string | null>(null);
  const set = t.questionSets.find((x) => x.id === setId) ?? t.questionSets[0];

  const usedBy = (id: string) =>
    [...t.matches.filter((m) => m.questionSetId === id).map((m) => m.title), ...(t.goldenSetId === id ? ['Zelta jautājumi'] : [])].join(', ');

  const addSet = () => {
    const id = uid('set');
    commit((d) => void d.tournament.questionSets.push({ id, name: `Kopa ${d.tournament.questionSets.length + 1}`, questions: [] }));
    setSetId(id);
  };

  const deleteSet = (id: string) => {
    if (!confirm('Dzēst visu jautājumu kopu?')) return;
    commit((d) => {
      d.tournament.questionSets = d.tournament.questionSets.filter((x) => x.id !== id);
      d.tournament.matches.forEach((m) => m.questionSetId === id && (m.questionSetId = null));
      if (d.tournament.goldenSetId === id) d.tournament.goldenSetId = null;
    });
  };

  const addQuestion = () => {
    if (!set) return;
    const q = newQuestion();
    editSet(set.id, (qs) => void qs.push(q));
    setOpenId(q.id);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Jautājumu kopas</h3>
          <button className="btn btn-sm btn-primary" onClick={addSet}>
            + Jauna
          </button>
        </div>
        {t.questionSets.map((qs) => (
          <button
            key={qs.id}
            className={`block w-full rounded-lg p-3 text-left ${qs.id === set?.id ? 'bg-indigo-500/30 ring-1 ring-indigo-400' : 'bg-white/5 hover:bg-white/10'}`}
            onClick={() => setSetId(qs.id)}
          >
            <div className="font-bold">{qs.name}</div>
            <div className="text-xs text-white/50">
              {qs.questions.length} jaut. {usedBy(qs.id) ? `· ${usedBy(qs.id)}` : '· nav piesaistīta'}
            </div>
          </button>
        ))}
      </div>

      {set ? (
        <div className="space-y-3">
          <div className="card flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="label">Kopas nosaukums</label>
              <input
                className="input text-lg font-bold"
                value={set.name}
                onChange={(e) => commit((d) => void (d.tournament.questionSets.find((x) => x.id === set.id)!.name = e.target.value))}
              />
            </div>
            <button className="btn btn-bad" onClick={() => deleteSet(set.id)}>
              Dzēst kopu
            </button>
          </div>
          <p className="text-sm text-white/50">
            Piesaistīta: {usedBy(set.id) || '—'} (piesaisti maina cilnē „Turnīrs”). Secība šeit = secība spēlē.
          </p>

          {set.questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              setId={set.id}
              q={q}
              index={i}
              count={set.questions.length}
              open={openId === q.id}
              onToggle={() => setOpenId(openId === q.id ? null : q.id)}
              defaultSteps={t.settings.imageRevealSteps}
            />
          ))}
          <button className="btn btn-primary" onClick={addQuestion}>
            + Pievienot jautājumu
          </button>
        </div>
      ) : (
        <div className="card text-white/60">Izveidojiet jautājumu kopu.</div>
      )}
    </div>
  );
}

function QuestionRow({
  setId,
  q,
  index,
  count,
  open,
  onToggle,
  defaultSteps,
}: {
  setId: string;
  q: Question;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  defaultSteps: number;
}) {
  const def = QUESTION_TYPES[q.type];
  const move = (dir: -1 | 1) =>
    editSet(setId, (qs) => {
      const j = index + dir;
      if (j < 0 || j >= qs.length) return;
      [qs[index], qs[j]] = [qs[j], qs[index]];
    });

  return (
    <div className={`card p-0 ${open ? 'ring-1 ring-indigo-400' : ''}`}>
      <div className="flex items-center gap-3 p-3">
        <span className="w-7 text-right font-bold text-white/40">{index + 1}.</span>
        <span title={def.label}>{def.icon}</span>
        <button className="min-w-0 flex-1 text-left" onClick={onToggle}>
          <div className="truncate font-semibold">{q.text || <i className="text-white/40">(tukšs jautājums)</i>}</div>
          <div className="truncate text-xs text-emerald-300/80">
            → {q.type === 'choice' && q.options && q.correctOption != null ? `${OPTION_LETTERS[q.correctOption]}. ${q.options[q.correctOption] ?? ''}` : q.answer || '—'}
          </div>
        </button>
        {q.topic && <span className="hidden rounded bg-white/10 px-2 py-0.5 text-xs md:inline">{q.topic}</span>}
        <span className="rounded bg-pink-600/40 px-2 py-0.5 text-xs">{q.points} p.</span>
        <div className="flex gap-1">
          <button className="btn btn-sm" disabled={index === 0} onClick={() => move(-1)} title="Uz augšu">
            ↑
          </button>
          <button className="btn btn-sm" disabled={index === count - 1} onClick={() => move(1)} title="Uz leju">
            ↓
          </button>
          <button
            className="btn btn-sm"
            title="Dublēt"
            onClick={() => editSet(setId, (qs) => void qs.splice(index + 1, 0, { ...structuredClone(q), id: uid('q') }))}
          >
            ⧉
          </button>
          <button className="btn btn-sm btn-bad" title="Dzēst" onClick={() => confirm('Dzēst jautājumu?') && editSet(setId, (qs) => void qs.splice(index, 1))}>
            ✕
          </button>
        </div>
      </div>
      {open && <QuestionForm setId={setId} q={q} defaultSteps={defaultSteps} />}
    </div>
  );
}

function QuestionForm({ setId, q, defaultSteps }: { setId: string; q: Question; defaultSteps: number }) {
  const def = QUESTION_TYPES[q.type];
  const set = (patch: Partial<Question>) => editQuestion(setId, q.id, patch);
  const options = q.options ?? ['', '', '', ''];

  const changeType = (type: QuestionType) => {
    const patch: Partial<Question> = { type };
    if (type === 'choice' && !q.options) {
      patch.options = [q.answer, '', '', ''];
      patch.correctOption = 0;
    }
    set(patch);
  };

  return (
    <div className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-4">
      <div className="md:col-span-2">
        <label className="label">Tips</label>
        <select className="input" value={q.type} onChange={(e) => changeType(e.target.value as QuestionType)}>
          {QUESTION_TYPE_LIST.map(([id, d]) => (
            <option key={id} value={id}>
              {d.icon} {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Tēma</label>
        <input className="input" value={q.topic ?? ''} onChange={(e) => set({ topic: e.target.value || undefined })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Punkti</label>
          <input type="number" className="input" value={q.points} onChange={(e) => set({ points: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label">Laiks (s)</label>
          <input
            type="number"
            className="input"
            placeholder="spēles"
            value={q.timeSec ?? ''}
            onChange={(e) => set({ timeSec: Number(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div className="md:col-span-4">
        <label className="label">Jautājuma teksts</label>
        <textarea className="input min-h-20 text-base" value={q.text} onChange={(e) => set({ text: e.target.value })} />
      </div>

      {def.editor.options ? (
        <div className="space-y-2 md:col-span-4">
          <label className="label">Atbilžu varianti (atzīmējiet pareizo)</label>
          <div className="grid gap-2 md:grid-cols-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctOption === i}
                  onChange={() => set({ correctOption: i, answer: o })}
                />
                <span className="w-5 font-bold">{OPTION_LETTERS[i]}</span>
                <input
                  className={`input ${q.correctOption === i ? 'border-emerald-500' : ''}`}
                  value={o}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    set({ options: next, ...(q.correctOption === i ? { answer: e.target.value } : {}) });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="md:col-span-4">
          <label className="label">Pareizā atbilde</label>
          <input className="input border-emerald-600/50 font-bold" value={q.answer} onChange={(e) => set({ answer: e.target.value })} />
        </div>
      )}

      {def.editor.media && (
        <div className="space-y-2 md:col-span-4">
          <label className="label">
            {def.editor.media === 'image' ? 'Attēls' : def.editor.media === 'audio' ? 'Audio fails' : 'Video fails'} — URL vai fails
          </label>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="https://… vai augšupielādējiet failu"
              value={q.media?.startsWith('data:') ? '(iegults fails)' : (q.media ?? '')}
              onChange={(e) => set({ media: e.target.value || undefined })}
            />
            <label className="btn shrink-0">
              📁 Fails
              <input
                type="file"
                accept={`${def.editor.media}/*`}
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 3_000_000 && !confirm('Fails ir lielāks par 3 MB — pārlūka krātuvē var pietrūkt vietas. Labāk izmantot URL. Turpināt?')) return;
                  set({ media: await readFileAsDataURL(f) });
                }}
              />
            </label>
            {q.media && (
              <button className="btn shrink-0" onClick={() => set({ media: undefined })}>
                ✕
              </button>
            )}
          </div>
          {q.media && def.editor.media === 'image' && <img src={q.media} alt="" className="max-h-40 rounded" />}
          {q.media && def.editor.media === 'audio' && <audio src={q.media} controls className="w-full" />}
          {q.media && def.editor.media === 'video' && <video src={q.media} controls className="max-h-48 rounded" />}
        </div>
      )}

      {def.editor.revealSteps && (
        <div>
          <label className="label">Atklāšanas soļi</label>
          <input
            type="number"
            min={0}
            className="input"
            placeholder={String(defaultSteps)}
            value={q.revealSteps ?? ''}
            onChange={(e) => set({ revealSteps: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
          />
          <div className="mt-1 text-[10px] text-white/40">0 = rādīt uzreiz visu</div>
        </div>
      )}

      {def.editor.author && (
        <div className="md:col-span-2">
          <label className="label">Jautājuma autors (skatītājs)</label>
          <input className="input" placeholder="piem., Ilze no Cēsīm" value={q.author ?? ''} onChange={(e) => set({ author: e.target.value || undefined })} />
        </div>
      )}

      <div className="md:col-span-4">
        <label className="label">Vadītāja piezīmes (ekrānā neredz)</label>
        <textarea className="input min-h-14" value={q.hostNotes ?? ''} onChange={(e) => set({ hostNotes: e.target.value || undefined })} />
      </div>
    </div>
  );
}
