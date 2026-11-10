// ─────────────────────────────────────────────────────────────
//  Jautājumu izloze: no jautājumu un tēžu bankas aizpilda visas
//  vēl nesāktās spēles. Jau spēlētie jautājumi netiek atkārtoti.
// ─────────────────────────────────────────────────────────────
import type { Match, Question, QuestionSet, Tournament } from '../types';
import { shuffle, uid } from './util';

export const GOLDEN_COUNT = 6;

export interface DrawResult {
  /** Cik spēlēm (ieskaitot zelta jautājumus) tika izlozēti jautājumi. */
  filled: number;
  /** Brīdinājumi, ja bankā pietrūka jautājumu. */
  warnings: string[];
}

export function bankQuestions(t: Tournament, kind: 'questions' | 'theses'): Question[] {
  return t.questionSets.filter((x) => x.bank === kind).flatMap((x) => x.questions);
}

/** Sajauc tā, lai tēmas mijas: katras tēmas rinda sajaukta, tēmas ņem pēc kārtas. */
function mixByTopic(pool: Question[]): Question[] {
  const byTopic = new Map<string, Question[]>();
  for (const q of shuffle(pool)) byTopic.set(q.topic ?? '', [...(byTopic.get(q.topic ?? '') ?? []), q]);
  const queues = shuffle([...byTopic.values()]);
  const out: Question[] = [];
  while (queues.some((x) => x.length)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

/** Spēles paša jautājumu kopa (ne banka un ne kopīga ar citu spēli); ja tādas nav — izveido. */
function ownSet(t: Tournament, m: Match): QuestionSet {
  const current = t.questionSets.find((x) => x.id === m.questionSetId);
  const shared = t.matches.some((x) => x !== m && x.questionSetId === m.questionSetId) || current?.id === t.goldenSetId;
  if (current && !current.bank && !shared) return current;
  const set: QuestionSet = { id: uid('set'), name: m.title, questions: [] };
  t.questionSets.push(set);
  m.questionSetId = set.id;
  return set;
}

const copy = (q: Question): Question => ({ ...q, id: uid('q') });

export function drawQuestions(t: Tournament): DrawResult {
  const warnings: string[] = [];
  const setOf = (m: Match) => t.questionSets.find((x) => x.id === m.questionSetId);
  const played = t.matches.filter((m) => m.status !== 'pending');

  // Jau uzdotie jautājumi (spēlētajās spēlēs un izmantotie zelta jautājumi) — pēc teksta.
  const goldenSet = t.questionSets.find((x) => x.id === t.goldenSetId);
  const usedGolden = new Set(played.flatMap((m) => m.goldenUsed));
  const used = new Set([
    ...played.flatMap((m) => setOf(m)?.questions ?? []).map((q) => q.text),
    ...(goldenSet?.questions ?? []).filter((q) => usedGolden.has(q.id)).map((q) => q.text),
  ]);

  let filled = 0;
  const pool = mixByTopic(bankQuestions(t, 'questions').filter((q) => !used.has(q.text)));
  const duels = t.matches.filter((m) => m.status === 'pending' && m.kind === 'duel');
  const perGame = (m: Match) => (m.questionCount > 0 ? m.questionCount : t.settings.questionsPerGame);
  if (pool.length) {
    const need = duels.reduce((n, m) => n + perGame(m), 0) + GOLDEN_COUNT;
    if (pool.length < need) warnings.push(`Bankā ir tikai ${pool.length} neizmantoti jautājumi, vajag ${need}.`);

    // Dala pa vienam katrai spēlei pēc kārtas, lai katrā spēlē būtu visas tēmas.
    const hands: Question[][] = duels.map(() => []);
    let i = 0;
    while (i < pool.length && duels.some((m, k) => hands[k].length < perGame(m))) {
      duels.forEach((m, k) => {
        if (hands[k].length < perGame(m) && i < pool.length) hands[k].push(pool[i++]);
      });
    }
    duels.forEach((m, k) => {
      const set = ownSet(t, m);
      set.questions = hands[k].map(copy);
      m.questionCount = 0;
      filled++;
    });

    let golden = goldenSet;
    if (!golden) {
      golden = { id: uid('set'), name: 'Zelta jautājumi', questions: [] };
      t.questionSets.push(golden);
      t.goldenSetId = golden.id;
    }
    // Jau izmantotos zelta jautājumus atstāj (uz tiem atsaucas spēļu vēsture).
    golden.questions = [...golden.questions.filter((q) => usedGolden.has(q.id)), ...pool.slice(i, i + GOLDEN_COUNT).map(copy)];
    filled++;
  }

  const theses = bankQuestions(t, 'theses');
  const final = t.matches.find((m) => m.status === 'pending' && m.kind === 'final');
  if (final && theses.length) {
    const count = t.settings.finalQuestionCount;
    if (theses.length < count) warnings.push(`Tēžu bankā ir tikai ${theses.length} tēzes, vajag ${count}.`);
    ownSet(t, final).questions = shuffle(theses).slice(0, count).map(copy);
    final.questionCount = 0;
    filled++;
  }

  return { filled, warnings };
}
