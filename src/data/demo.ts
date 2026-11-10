// ─────────────────────────────────────────────────────────────
//  Demo turnīrs: 6 komandas, jautājumi no QUESTION_BANK sadalīti pa spēlēm.
// ─────────────────────────────────────────────────────────────
import type { AppState, Question, QuestionSet, Team, Tournament } from '../types';
import { createLive, DEFAULT_SETTINGS, defaultRules, TEAM_COLORS } from '../lib/defaults';
import { getScheme } from '../lib/schemes';
import { uid } from '../lib/util';
import { QUESTION_BANK } from './questions';

type Extra = Partial<Omit<Question, 'id' | 'text' | 'answer' | 'points'>>;

const q = (text: string, answer: string, points: number, topic: string, extra: Extra = {}): Question => ({
  id: uid('q'),
  type: 'text',
  text,
  answer,
  points,
  topic,
  ...extra,
});

function set(name: string, questions: Question[]): QuestionSet {
  return { id: uid('set'), name, questions };
}

const QUESTION_POINTS = 10;
const DUEL_GAMES = 5;
/** Pāra skaits — spēlējot pēc kārtas, abas komandas atbild uz vienādu skaitu jautājumu. */
const PER_GAME = 16;
const GOLDEN_COUNT = 6;

/** Jautājumi pa tēmām pārmaiņus, lai katrā spēlē būtu visas tēmas un blakus jautājumi būtu par dažādām. */
function mixedQuestions(): Question[] {
  const byTopic = new Map<string, Question[]>();
  for (const [topic, text, answer] of QUESTION_BANK) {
    byTopic.set(topic, [...(byTopic.get(topic) ?? []), q(text, answer, QUESTION_POINTS, topic)]);
  }
  const queues = [...byTopic.values()];
  const out: Question[] = [];
  while (queues.some((x) => x.length)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

export function demoQuestionSets() {
  const mixed = mixedQuestions();
  const duelCount = DUEL_GAMES * PER_GAME;
  const games: Question[][] = Array.from({ length: DUEL_GAMES }, () => []);
  mixed.slice(0, duelCount).forEach((x, i) => games[i % DUEL_GAMES].push(x));

  const game1 = set('1. spēle', games[0]);
  const game2 = set('2. spēle', games[1]);
  const game3 = set('3. spēle', games[2]);
  const semi1 = set('1. pusfināls', games[3]);
  const semi2 = set('2. pusfināls', games[4]);

  // Fināla debašu tēzes: jautājuma teksts = tēze, atbildes nav.
  const final = set('Fināls (debates)', [
    q('Skolās jāaizliedz mobilie tālruņi.', '', 0, 'Izglītība', {
      hostNotes: 'PAR: uzmanība, mazāk kiberhuligānisma. PRET: drošība, mācību rīks, atbildības mācīšanās.',
    }),
    q('Mākslīgais intelekts cilvēcei nesīs vairāk labuma nekā kaitējuma.', '', 0, 'Tehnoloģijas', {
      hostNotes: 'PAR: medicīna, zinātne, produktivitāte. PRET: darbavietas, dezinformācija, kontrole.',
    }),
    q('Latvijā jāievieš četru dienu darba nedēļa.', '', 0, 'Sabiedrība', {
      hostNotes: 'PAR: produktivitāte, veselība, ģimene. PRET: izmaksas uzņēmējiem, pakalpojumu pieejamība.',
    }),
  ]);


  const golden = set('Zelta jautājumi', mixed.slice(duelCount, duelCount + GOLDEN_COUNT));
  // Pārējie — rezervei (redaktorā var pārvietot uz jebkuru spēli).
  const reserve = set('Rezerves jautājumi', mixed.slice(duelCount + GOLDEN_COUNT));

  return { game1, game2, game3, semi1, semi2, final, golden, reserve };
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
    score: 0,
  }));
  const sets = demoQuestionSets();
  const matches = getScheme('six')!.build(settings);
  const [m1, m2, m3, sf1, sf2, final] = matches;
  m1.questionSetId = sets.game1.id;
  m2.questionSetId = sets.game2.id;
  m2.answerMode = 'buzzer';
  m3.questionSetId = sets.game3.id;
  sf1.questionSetId = sets.semi1.id;
  sf2.questionSetId = sets.semi2.id;
  final.questionSetId = sets.final.id;
  // Pāri jau sadalīti, lai var sākt uzreiz (pultī tos var izlozēt no jauna).
  [m1, m2, m3].forEach((m, i) => (m.teams = [teams[i * 2].id, teams[i * 2 + 1].id]));

  return {
    id: uid('t'),
    name: 'Prāta spēles',
    subtitle: 'Erudīcijas turnīrs par Latviju',
    schemeId: 'six',
    teams,
    matches,
    questionSets: Object.values(sets),
    goldenSetId: sets.golden.id,
    rules: defaultRules(),
    settings,
    championId: null,
  };
}

export function createDemoState(): AppState {
  return { version: 1, tournament: createDemoTournament(), live: createLive() };
}
