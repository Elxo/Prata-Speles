// ─────────────────────────────────────────────────────────────
//  Imports / eksports: JSON (viss turnīrs), CSV un Excel (jautājumi).
// ─────────────────────────────────────────────────────────────
import { produce } from 'immer';
import type { AppState, Question, QuestionType, Tournament } from '../types';
import { BANK_VERSION, createFinalLive, createLive, DEFAULT_QUESTION_POINTS, DEFAULT_SETTINGS } from './defaults';
import { normalize, uid } from './util';
import { questionBanks } from '../data/demo';
import { applyRoundPoints } from './draw';

const FORMAT = 'prata-speles';

// ── JSON ────────────────────────────────────────────────────

export function exportJSON(s: AppState, withProgress: boolean): string {
  const payload = withProgress
    ? { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), state: s }
    : { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), tournament: s.tournament };
  return JSON.stringify(payload, null, 2);
}

/** Atgriež jaunu stāvokli no JSON faila. Atbalsta gan pilnu stāvokli, gan tikai turnīru. */
export function importJSON(text: string, current: AppState): AppState {
  const data = JSON.parse(text);
  if (data?.format !== FORMAT) throw new Error('Tas nav „Prāta spēļu” fails.');
  if (data.state?.tournament && data.state?.live) {
    return migrateState({ ...data.state, version: 1, live: { ...createLive(), ...data.state.live, sound: current.live.sound } });
  }
  if (data.tournament) {
    validateTournament(data.tournament);
    return migrateState({ version: 1, tournament: data.tournament, live: { ...createLive(), sound: current.live.sound } });
  }
  throw new Error('Failā nav atrasts turnīrs.');
}

/** Vecāku versiju dati (fināls ar likmēm) → fināls ar debatēm. */
export function migrateState(s: AppState): AppState {
  return produce(s, (d) => {
    const st = d.tournament.settings as Partial<AppState['tournament']['settings']> & { finalBetCap?: string };
    if (st.debateMaxPoints == null) {
      st.debateMaxPoints = DEFAULT_SETTINGS.debateMaxPoints;
      st.finalQuestionCount = DEFAULT_SETTINGS.finalQuestionCount;
      st.finalTimerSec = DEFAULT_SETTINGS.finalTimerSec;
      delete st.finalBetCap;
      for (const m of d.tournament.matches) {
        if (m.kind !== 'final') continue;
        m.questionCount = DEFAULT_SETTINGS.finalQuestionCount;
        m.timerSec = DEFAULT_SETTINGS.finalTimerSec;
      }
    }
    st.questionsPerGame ??= DEFAULT_SETTINGS.questionsPerGame;
    // Punkti ×10, sākuma punkti un papildiespējas.
    if (st.startingScore == null) {
      const t = d.tournament;
      st.startingScore = DEFAULT_SETTINGS.startingScore;
      st.debateMaxPoints = (st.debateMaxPoints ?? 30) * 10;
      for (const set of t.questionSets) for (const q of set.questions) q.points *= 10;
      const started = t.matches.some((m) => m.status !== 'pending');
      if (started) {
        // Turnīrs jau notiek — tikai pārrēķina esošos punktus.
        for (const team of t.teams) team.score *= 10;
        for (const m of t.matches) {
          m.points = [m.points[0] * 10, m.points[1] * 10];
          for (const r of Object.values(m.finalLog)) r.jury = [r.jury[0] * 10, r.jury[1] * 10];
          if (m.result) for (const id in m.result.totalsAfter) m.result.totalsAfter[id] *= 10;
        }
      } else {
        for (const team of t.teams) team.score = st.startingScore;
      }
      for (const r of t.rules) {
        r.body = r.body
          .replace('Par katru pareizu atbildi komanda saņem 10 punktus', 'Katra komanda sāk ar 100 punktiem.\nPar katru pareizu atbildi komanda saņem 100 punktus')
          .replace('līdz 30 punktiem', 'līdz 300 punktiem');
      }
    }
    for (const r of d.tournament.rules) r.body = r.body.replace('Dueli uzvar komanda, kas šajā spēlē ieguvusi vairāk punktu.', 'Dueli uzvar komanda, kurai ir vairāk kopējo punktu.');
    st.powerUps ??= structuredClone(DEFAULT_SETTINGS.powerUps);
    st.extraTimeSec ??= DEFAULT_SETTINGS.extraTimeSec;
    st.leaderPriceMultiplier ??= DEFAULT_SETTINGS.leaderPriceMultiplier;
    st.powerUpsPerGame ??= DEFAULT_SETTINGS.powerUpsPerGame;
    for (const m of d.tournament.matches) m.powerUps ??= [];
    // Vecākiem turnīriem nav jautājumu/tēžu bankas — bez tās nevar izlozēt jautājumus.
    const sets = d.tournament.questionSets;
    for (const bank of questionBanks()) if (!sets.some((x) => x.bank === bank.bank)) sets.push(bank);
    // Iebūvētās bankas mainījušās (piem., labots jautājumu formulējums) — aizstāj ar jaunāko versiju.
    if ((st.bankVersion ?? 1) < BANK_VERSION) {
      for (const fresh of questionBanks()) {
        const old = sets.find((x) => x.bank === fresh.bank);
        if (old) old.questions = fresh.questions;
      }
      st.bankVersion = BANK_VERSION;
    }
    // Punkti pa kārtām: 1. kārta 100, pusfināli 150, debates līdz 200.
    if (st.pointsRound1 == null || st.pointsRound2 == null) {
      st.pointsRound1 = DEFAULT_SETTINGS.pointsRound1;
      st.pointsRound2 = DEFAULT_SETTINGS.pointsRound2;
      if (st.debateMaxPoints === 300) st.debateMaxPoints = DEFAULT_SETTINGS.debateMaxPoints;
      for (const r of d.tournament.rules) {
        r.body = r.body
          .replace('Par katru pareizu atbildi komanda saņem 100 punktus, par nepareizu', 'Par pareizu atbildi pirmajā kārtā — 100 punkti, pusfinālos — 150 punkti, par nepareizu')
          .replace('līdz 300 punktiem', 'līdz 200 punktiem');
      }
      applyRoundPoints(d.tournament);
    }
    if (!('forSide' in d.live.final)) d.live.final = createFinalLive();
  });
}

function validateTournament(t: Tournament) {
  if (!Array.isArray(t.teams) || !Array.isArray(t.matches) || !Array.isArray(t.questionSets)) {
    throw new Error('Bojāts turnīra fails (trūkst komandu, spēļu vai jautājumu).');
  }
}

// ── CSV ─────────────────────────────────────────────────────

/** CSV parsētājs ar pēdiņu atbalstu; atdalītāju (; , vai TAB) nosaka automātiski. */
export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const counts = [';', ',', '\t'].map((d) => [d, firstLine.split(d).length] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (/\.(xlsx|xls|ods)$/i.test(file.name)) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
    return rows.map((r) => r.map((c) => String(c ?? ''))).filter((r) => r.some((c) => c.trim()));
  }
  return parseCSV(await file.text());
}

// ── Rindas → jautājumi ──────────────────────────────────────

type Field = 'game' | 'topic' | 'text' | 'answer' | 'points' | 'time' | 'type' | 'author' | 'notes' | 'media' | 'a' | 'b' | 'c' | 'd';

const ALIASES: Record<Field, string[]> = {
  game: ['spele', 'game', 'karta', 'kopa', 'round'],
  topic: ['tema', 'topic', 'kategorija'],
  text: ['jautajums', 'question', 'teksts'],
  answer: ['atbilde', 'answer', 'pareiza atbilde'],
  points: ['punkti', 'points', 'vertiba'],
  time: ['laiks', 'time', 'sekundes', 'laiks (s)'],
  type: ['tips', 'type', 'veids'],
  author: ['autors', 'author'],
  notes: ['piezimes', 'notes', 'vaditaja piezimes'],
  media: ['attels', 'media', 'url', 'fails', 'audio', 'video'],
  a: ['a', 'variants a'],
  b: ['b', 'variants b'],
  c: ['c', 'variants c'],
  d: ['d', 'variants d'],
};

const TYPE_ALIASES: Record<string, QuestionType> = {
  teksts: 'text',
  text: 'text',
  teksta: 'text',
  varianti: 'choice',
  choice: 'choice',
  abcd: 'choice',
  attels: 'image',
  image: 'image',
  audio: 'audio',
  video: 'video',
  skatitaju: 'audience',
  skatitajs: 'audience',
  audience: 'audience',
};

export interface ImportedRow {
  game: string;
  question: Question;
}

export interface ImportResult {
  rows: ImportedRow[];
  warnings: string[];
}

export function rowsToQuestions(rows: string[][], defaultPoints = DEFAULT_QUESTION_POINTS): ImportResult {
  const warnings: string[] = [];
  if (rows.length < 2) return { rows: [], warnings: ['Failā nav datu rindu (pirmajai rindai jābūt kolonnu nosaukumiem).'] };
  const header = rows[0].map((h) => normalize(h));
  const col = {} as Record<Field, number>;
  (Object.keys(ALIASES) as Field[]).forEach((f) => (col[f] = header.findIndex((h) => ALIASES[f].includes(h))));
  if (col.text < 0) return { rows: [], warnings: ['Nav atrasta kolonna „jautājums”.'] };

  const out: ImportedRow[] = [];
  rows.slice(1).forEach((r, i) => {
    const get = (f: Field) => (col[f] >= 0 ? (r[col[f]] ?? '').trim() : '');
    const text = get('text');
    if (!text) return;
    const options = (['a', 'b', 'c', 'd'] as Field[]).map(get).filter(Boolean);
    let type: QuestionType = TYPE_ALIASES[normalize(get('type'))] ?? (options.length >= 2 ? 'choice' : 'text');
    if (!get('type') && get('author')) type = 'audience';
    if (!get('type') && get('media')) type = /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(get('media')) ? 'audio' : /\.(mp4|webm|mov)(\?|$)/i.test(get('media')) ? 'video' : 'image';

    let answer = get('answer');
    let correctOption: number | undefined;
    if (type === 'choice') {
      const letter = answer.toUpperCase().match(/^[A-D]$/);
      correctOption = letter ? 'ABCD'.indexOf(letter[0]) : options.findIndex((o) => normalize(o) === normalize(answer));
      if (correctOption < 0 || correctOption >= options.length) {
        warnings.push(`${i + 2}. rinda: atbilde „${answer}” nesakrīt ne ar vienu variantu — atzīmēts A.`);
        correctOption = 0;
      }
      answer = options[correctOption];
    }
    // Fināla debašu tēzēm atbildes nav.
    if (!answer && normalize(get('game')) !== 'finals') warnings.push(`${i + 2}. rinda: nav norādīta atbilde.`);

    const points = parseInt(get('points'), 10);
    const time = parseInt(get('time'), 10);
    out.push({
      game: get('game'),
      question: {
        id: uid('q'),
        type,
        text,
        answer,
        points: Number.isFinite(points) ? points : defaultPoints,
        timeSec: Number.isFinite(time) && time > 0 ? time : undefined,
        topic: get('topic') || undefined,
        options: type === 'choice' ? options : undefined,
        correctOption,
        author: get('author') || undefined,
        hostNotes: get('notes') || undefined,
        media: get('media') || undefined,
      },
    });
  });
  return { rows: out, warnings };
}

/** Piemēra CSV fails (atdalītājs „;” — atveras pareizi Excel latviešu reģionā). */
export const CSV_TEMPLATE = [
  'spēle;tēma;jautājums;atbilde;punkti;laiks;tips;A;B;C;D;autors;piezīmes',
  '1;Ģeogrāfija;Kā sauc Latvijas augstāko virsotni?;Gaiziņkalns;10;30;;;;;;;311,9 m',
  '1;Vēsture;Kurā gadā dibināta Rīga?;B;20;30;varianti;1185;1201;1282;1300;;',
  '2;Sports;Kurā sporta veidā pazīstams Mārtiņš Dukurs?;Skeletonā;20;;skatītāju;;;;;Ilze no Cēsīm;',
  'Fināls;Izglītība;Skolās jāaizliedz mobilie tālruņi.;;0;;;;;;;;debašu tēze — atbildes nav',
  'Zelta;Vēsture;Kurā gadā ieviesa eiro?;2014;10;;;;;;;;',
].join('\r\n');
