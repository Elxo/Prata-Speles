// ─────────────────────────────────────────────────────────────
//  Turnīra shēmu reģistrs.
//  Lai pievienotu jaunu shēmu: uzraksti funkciju, kas atgriež
//  spēļu sarakstu ar slotiem, un pievieno to SCHEMES masīvam.
// ─────────────────────────────────────────────────────────────
import type { Match, MatchKind, Settings, Slot } from '../types';

export interface SchemeDef {
  id: string;
  name: string;
  teamCount: number;
  description: string;
  build: (settings: Settings) => Match[];
}

interface MatchSpec {
  id: string;
  title: string;
  round: number;
  roundName: string;
  kind?: MatchKind;
  slots: [Slot, Slot];
}

export function makeMatch(spec: MatchSpec, settings: Settings): Match {
  const kind = spec.kind ?? 'duel';
  return {
    id: spec.id,
    title: spec.title,
    round: spec.round,
    roundName: spec.roundName,
    kind,
    slots: spec.slots,
    teams: [null, null],
    questionSetId: null,
    questionCount: kind === 'final' ? settings.finalQuestionCount : 0,
    timerSec: kind === 'final' ? settings.finalTimerSec : settings.defaultTimerSec,
    answerMode: 'turns',
    status: 'pending',
    points: [0, 0],
    marks: {},
    finalLog: {},
    goldenUsed: [],
  };
}

const seed: Slot = { kind: 'seed' };
const win = (matchId: string): Slot => ({ kind: 'winner', matchId });
const ranked = (matchIds: string[], rank: number): Slot => ({ kind: 'ranked', matchIds, rank });
const rankedLoser = (matchIds: string[], rank: number): Slot => ({ kind: 'ranked', matchIds, rank, pool: 'losers' });
const R1 = ['r1m1', 'r1m2', 'r1m3'];

const ORDINAL = ['Pirmās', 'Otrās', 'Trešās', 'Ceturtās'];

function firstRound(count: number): MatchSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r1m${i + 1}`,
    title: `${ORDINAL[0]} kārtas ${i + 1}. spēle`,
    round: 1,
    roundName: 'Pirmā kārta',
    slots: [seed, seed] as [Slot, Slot],
  }));
}

export const SCHEMES: SchemeDef[] = [
  {
    id: 'six',
    name: '6 komandas (standarts)',
    teamCount: 6,
    description:
      '3 dueļi pirmajā kārtā. 3 uzvarētāji un labākais zaudētājs (pēc kopējiem punktiem) spēlē 2 pusfinālus: labākais uzvarētājs pret labāko zaudētāju, 2. pret 3. uzvarētāju. Abi finālisti aizvada vienādu spēļu skaitu.',
    build: (s) =>
      [
        ...firstRound(3),
        { id: 'sf1', title: '1. pusfināls', round: 2, roundName: 'Pusfināli', slots: [ranked(R1, 1), rankedLoser(R1, 1)] as [Slot, Slot] },
        { id: 'sf2', title: '2. pusfināls', round: 2, roundName: 'Pusfināli', slots: [ranked(R1, 2), ranked(R1, 3)] as [Slot, Slot] },
        {
          id: 'final',
          title: 'Fināls',
          round: 3,
          roundName: 'Fināls',
          kind: 'final' as const,
          slots: [win('sf1'), win('sf2')] as [Slot, Slot],
        },
      ].map((m) => makeMatch(m, s)),
  },
  {
    id: 'six-bye',
    name: '6 komandas (labākais uzreiz finālā)',
    teamCount: 6,
    description:
      '3 dueļi pirmajā kārtā. Labākais uzvarētājs pēc kopējiem punktiem iet tieši uz finālu, pārējie divi spēlē pusfinālu. Īsāks (5 spēles), bet pusfināla uzvarētājs finālā parasti ienāk ar vairāk punktiem.',
    build: (s) =>
      [
        ...firstRound(3),
        {
          id: 'semi',
          title: 'Pusfināls',
          round: 2,
          roundName: 'Pusfināls',
          slots: [ranked(R1, 2), ranked(R1, 3)] as [Slot, Slot],
        },
        {
          id: 'final',
          title: 'Fināls',
          round: 3,
          roundName: 'Fināls',
          kind: 'final' as const,
          slots: [ranked(R1, 1), win('semi')] as [Slot, Slot],
        },
      ].map((m) => makeMatch(m, s)),
  },
  {
    id: 'four',
    name: '4 komandas',
    teamCount: 4,
    description: '2 pusfināli, uzvarētāji spēlē finālu.',
    build: (s) =>
      [
        ...firstRound(2).map((m, i) => ({ ...m, title: `${i + 1}. pusfināls`, roundName: 'Pusfināli' })),
        {
          id: 'final',
          title: 'Fināls',
          round: 2,
          roundName: 'Fināls',
          kind: 'final' as const,
          slots: [win('r1m1'), win('r1m2')] as [Slot, Slot],
        },
      ].map((m) => makeMatch(m, s)),
  },
  {
    id: 'eight',
    name: '8 komandas',
    teamCount: 8,
    description: '4 ceturtdaļfināli, 2 pusfināli, fināls.',
    build: (s) =>
      [
        ...firstRound(4).map((m, i) => ({ ...m, title: `${i + 1}. ceturtdaļfināls`, roundName: 'Ceturtdaļfināli' })),
        { id: 'sf1', title: '1. pusfināls', round: 2, roundName: 'Pusfināli', slots: [win('r1m1'), win('r1m2')] as [Slot, Slot] },
        { id: 'sf2', title: '2. pusfināls', round: 2, roundName: 'Pusfināli', slots: [win('r1m3'), win('r1m4')] as [Slot, Slot] },
        {
          id: 'final',
          title: 'Fināls',
          round: 3,
          roundName: 'Fināls',
          kind: 'final' as const,
          slots: [win('sf1'), win('sf2')] as [Slot, Slot],
        },
      ].map((m) => makeMatch(m, s)),
  },
  {
    id: 'two',
    name: '2 komandas (tikai fināls)',
    teamCount: 2,
    description: 'Viena fināla spēle ar likmēm.',
    build: (s) =>
      [{ id: 'final', title: 'Fināls', round: 1, roundName: 'Fināls', kind: 'final' as const, slots: [seed, seed] as [Slot, Slot] }].map(
        (m) => makeMatch(m, s),
      ),
  },
];

export function getScheme(id: string): SchemeDef | undefined {
  return SCHEMES.find((s) => s.id === id);
}
