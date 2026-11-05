// ─────────────────────────────────────────────────────────────
//  Turnīra loģika: slotu atrisināšana, kas iet tālāk, statusi.
// ─────────────────────────────────────────────────────────────
import type { AppState, ID, Match, Question, RankPool, Side, Slot, Team, Tournament } from '../types';

export function teamById(t: Tournament, id: ID | null | undefined): Team | undefined {
  return id ? t.teams.find((x) => x.id === id) : undefined;
}

export function matchById(t: Tournament, id: ID | null | undefined): Match | undefined {
  return id ? t.matches.find((m) => m.id === id) : undefined;
}

export function currentMatch(s: AppState): Match | undefined {
  return matchById(s.tournament, s.live.matchId);
}

export function matchQuestions(t: Tournament, m: Match): Question[] {
  const set = t.questionSets.find((q) => q.id === m.questionSetId);
  if (!set) return [];
  return m.questionCount > 0 ? set.questions.slice(0, m.questionCount) : set.questions;
}

export function goldenPool(t: Tournament): Question[] {
  return t.questionSets.find((q) => q.id === t.goldenSetId)?.questions ?? [];
}

/** Pašreizējais jautājums (ņemot vērā zelta jautājumu). */
export function currentQuestion(s: AppState): Question | undefined {
  const m = currentMatch(s);
  if (!m) return undefined;
  if (s.live.golden.active) return goldenPool(s.tournament).find((q) => q.id === s.live.golden.questionId);
  return matchQuestions(s.tournament, m)[s.live.qIndex];
}

export function questionTime(m: Match, q: Question | undefined): number {
  return q?.timeSec && q.timeSec > 0 ? q.timeSec : m.timerSec;
}

export function sideOf(m: Match, teamId: ID): Side | null {
  if (m.teams[0] === teamId) return 0;
  if (m.teams[1] === teamId) return 1;
  return null;
}

// ── Slotu atrisināšana ───────────────────────────────────────

/** Uzvarētāji (vai zaudētāji) no norādītajām spēlēm, sakārtoti pēc kopējiem punktiem. null — ja kāda vēl nav beigusies. */
export function rankedTeams(t: Tournament, matchIds: ID[], pool: RankPool = 'winners'): ID[] | null {
  const ms = matchIds.map((id) => matchById(t, id));
  if (ms.some((m) => !m || m.status !== 'done' || !m.result)) return null;
  const rows = (ms as Match[]).map((m, order) => {
    const id = pool === 'losers' ? m.result!.loser : m.result!.winner;
    return {
      id,
      total: teamById(t, id)?.score ?? 0,
      duel: m.points[sideOf(m, id)!],
      order,
    };
  });
  rows.sort((a, b) => b.total - a.total || b.duel - a.duel || a.order - b.order);
  return rows.map((r) => r.id);
}

export function resolveSlot(t: Tournament, slot: Slot): ID | null {
  switch (slot.kind) {
    case 'seed':
      return null;
    case 'winner': {
      const m = matchById(t, slot.matchId);
      return m?.status === 'done' ? (m.result?.winner ?? null) : null;
    }
    case 'loser': {
      const m = matchById(t, slot.matchId);
      return m?.status === 'done' ? (m.result?.loser ?? null) : null;
    }
    case 'ranked':
      return rankedTeams(t, slot.matchIds, slot.pool)?.[slot.rank - 1] ?? null;
  }
}

/** Aizpilda nākamo spēļu komandas, kad iepriekšējās spēles ir beigušās. Rezultāts tiek "iesaldēts". */
export function advance(t: Tournament): void {
  for (const m of t.matches) {
    if (m.status !== 'pending') continue;
    m.slots.forEach((slot, i) => {
      if (slot.kind === 'seed' || m.teams[i]) return;
      const id = resolveSlot(t, slot);
      if (id) m.teams[i] = id;
    });
  }
  avoidRematches(t);
}

function havePlayed(t: Tournament, a: ID, b: ID): boolean {
  return t.matches.some((m) => m.status === 'done' && m.teams.includes(a) && m.teams.includes(b));
}

/**
 * Ja pēc ranžēšanas vienā kārtā sanāk atkārtots pāris (piem., labākais zaudētājs pret to,
 * kurš viņu jau uzvarēja), samaina pretiniekus ar citu tās pašas kārtas spēli.
 * Vispirms mēģina mainīt ar otras spēles B pusi (vājāko pretinieku). Skar tikai vēl nesāktas spēles bez izlozes slotiem.
 */
function avoidRematches(t: Tournament): void {
  const open = t.matches.filter((m) => m.status === 'pending' && m.teams[0] && m.teams[1] && m.slots.every((s) => s.kind !== 'seed'));
  const rematch = (m: Match) => havePlayed(t, m.teams[0]!, m.teams[1]!);
  for (const a of open) {
    if (!rematch(a)) continue;
    for (const b of open) {
      if (b === a || b.round !== a.round) continue;
      const swapped = ([1, 0] as const).find((j) => {
        [a.teams[1], b.teams[j]] = [b.teams[j], a.teams[1]];
        if (!rematch(a) && !rematch(b)) return true;
        [a.teams[1], b.teams[j]] = [b.teams[j], a.teams[1]];
        return false;
      });
      if (swapped !== undefined) break;
    }
  }
}

export function slotLabel(t: Tournament, slot: Slot): string {
  switch (slot.kind) {
    case 'seed':
      return 'Izloze';
    case 'winner':
      return `${matchById(t, slot.matchId)?.title ?? '?'} — uzvarētājs`;
    case 'loser':
      return `${matchById(t, slot.matchId)?.title ?? '?'} — zaudētājs`;
    case 'ranked': {
      const round = matchById(t, slot.matchIds[0])?.roundName ?? '';
      const noun = slot.pool === 'losers' ? 'zaudētājs' : 'uzvarētājs';
      const who = slot.rank === 1 ? `Labākais ${noun}` : `${slot.rank}. labākais ${noun}`;
      return `${who} (${round})`;
    }
  }
}

// ── Komandu statusi ─────────────────────────────────────────

export type TeamStatus = 'playing' | 'waiting' | 'out' | 'champion' | 'second';

function isPlaced(t: Tournament, teamId: ID): boolean {
  return t.matches.some((m) => m.teams.includes(teamId));
}

function mayResolveTo(t: Tournament, slot: Slot, teamId: ID, depth = 0): boolean {
  if (depth > 10) return false;
  const viaMatch = (mid: ID) => {
    const m = matchById(t, mid);
    if (!m || m.status === 'done') return false;
    return m.teams.includes(teamId) || m.teams.some((x, i) => !x && mayResolveTo(t, m.slots[i], teamId, depth + 1));
  };
  switch (slot.kind) {
    case 'seed':
      return !isPlaced(t, teamId);
    case 'winner':
    case 'loser':
      return viaMatch(slot.matchId);
    case 'ranked':
      return slot.matchIds.some((mid) => {
        const m = matchById(t, mid);
        if (m?.status === 'done') return (slot.pool === 'losers' ? m.result?.loser : m.result?.winner) === teamId;
        return viaMatch(mid);
      });
  }
}

export function teamStatus(t: Tournament, teamId: ID): TeamStatus {
  if (t.championId === teamId) return 'champion';
  if (t.matches.some((m) => m.status === 'live' && m.teams.includes(teamId))) return 'playing';
  const open = t.matches.filter((m) => m.status !== 'done');
  if (open.some((m) => m.teams.includes(teamId))) return 'waiting';
  if (open.some((m) => m.teams.some((x, i) => !x && mayResolveTo(t, m.slots[i], teamId)))) return 'waiting';
  const final = t.matches.find((m) => m.kind === 'final');
  if (final?.status === 'done' && final.result?.loser === teamId) return 'second';
  return 'out';
}

export const STATUS_LABEL: Record<TeamStatus, string> = {
  playing: 'Spēlē',
  waiting: 'Turpina',
  out: 'Izkritusi',
  champion: 'Čempioni',
  second: '2. vieta',
};

export function standings(t: Tournament): Team[] {
  return [...t.teams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'lv'));
}

/** Nākamā spēle, kurai abas komandas ir zināmas. */
export function nextPlayableMatch(t: Tournament): Match | undefined {
  return t.matches.find((m) => m.status === 'pending' && m.teams[0] && m.teams[1]);
}

export function seedSlots(t: Tournament): { match: Match; index: Side }[] {
  const out: { match: Match; index: Side }[] = [];
  for (const m of t.matches) m.slots.forEach((s, i) => s.kind === 'seed' && out.push({ match: m, index: i as Side }));
  return out;
}

export function rounds(t: Tournament): { round: number; name: string; matches: Match[] }[] {
  const map = new Map<number, Match[]>();
  for (const m of t.matches) map.set(m.round, [...(map.get(m.round) ?? []), m]);
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, matches]) => ({ round, name: matches[0].roundName, matches }));
}
