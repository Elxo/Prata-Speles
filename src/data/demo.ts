// ─────────────────────────────────────────────────────────────
//  Demo turnīrs: 6 komandas, jautājumu un tēžu bankas, no kurām
//  spēlēm uzreiz tiek izlozēti jautājumi (skat. lib/draw.ts).
// ─────────────────────────────────────────────────────────────
import type { AppState, QuestionSet, Team, Tournament } from '../types';
import { createLive, DEFAULT_QUESTION_POINTS, DEFAULT_SETTINGS, defaultRules, TEAM_COLORS } from '../lib/defaults';
import { getScheme } from '../lib/schemes';
import { drawQuestions } from '../lib/draw';
import { uid } from '../lib/util';
import { QUESTION_BANK } from './questions';
import { THESIS_BANK } from './theses';

const QUESTION_POINTS = DEFAULT_QUESTION_POINTS;

export function questionBanks(): QuestionSet[] {
  return [
    {
      id: uid('set'),
      name: '📚 Jautājumu banka',
      bank: 'questions',
      questions: QUESTION_BANK.map(([topic, text, answer]) => ({ id: uid('q'), type: 'text', text, answer, points: QUESTION_POINTS, topic })),
    },
    {
      id: uid('set'),
      name: '📚 Debašu tēžu banka',
      bank: 'theses',
      questions: THESIS_BANK.map(([topic, text]) => ({ id: uid('q'), type: 'text', text, answer: '', points: 0, topic })),
    },
  ];
}

const TEAMS: [string, string, string[]][] = [
  ['Gudrās Pūces', 'Anna Kalniņa', ['Pēteris Ozols', 'Līga Bērziņa', 'Mārtiņš Liepa']],
  ['Daugavas Viļņi', 'Jānis Krūmiņš', ['Ieva Jansone', 'Edgars Zariņš', 'Dace Vītola']],
  ['Gaiziņa Ērgļi', 'Kristīne Sproģe', ['Raivis Āboliņš', 'Elīna Putniņa', 'Gatis Ločmelis']],
  ['Rīgas Runči', 'Toms Eglītis', ['Zane Kļaviņa', 'Uldis Grīnbergs', 'Sanita Cīrule']],
  ['Latgales Lāči', 'Valdis Šķēle', ['Inga Ruskule', 'Oskars Ģērmanis', 'Laura Žagare']],
  ['Kurzemes Vēji', 'Agnese Dūmiņa', ['Kārlis Celms', 'Signe Bauma', 'Rūdolfs Ķezbers']],
];

export function createDemoTournament(): Tournament {
  const settings = { ...DEFAULT_SETTINGS };
  const teams: Team[] = TEAMS.map(([name, captain, members], i) => ({
    id: uid('team'),
    name,
    color: TEAM_COLORS[i],
    captain,
    members,
    score: settings.startingScore,
  }));
  const matches = getScheme('six')!.build(settings);
  const [m1, m2, m3] = matches;
  m2.answerMode = 'buzzer';
  // Pāri jau sadalīti, lai var sākt uzreiz (pultī tos var izlozēt no jauna).
  [m1, m2, m3].forEach((m, i) => (m.teams = [teams[i * 2].id, teams[i * 2 + 1].id]));

  const t: Tournament = {
    id: uid('t'),
    name: 'Prāta spēles',
    subtitle: 'Erudīcijas turnīrs par Latviju',
    schemeId: 'six',
    teams,
    matches,
    questionSets: questionBanks(),
    goldenSetId: null,
    rules: defaultRules(),
    settings,
    championId: null,
  };
  drawQuestions(t);
  // Spēļu kopas sarakstā pirms bankām.
  t.questionSets.sort((a, b) => Number(!!a.bank) - Number(!!b.bank));
  return t;
}

export function createDemoState(): AppState {
  return { version: 1, tournament: createDemoTournament(), live: createLive() };
}
