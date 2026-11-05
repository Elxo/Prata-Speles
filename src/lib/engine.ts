// ─────────────────────────────────────────────────────────────
//  Spēles dzinējs: tīras funkcijas, kas maina (immer) melnrakstu.
//  UI tās izsauc caur act() — skat. apakšā.
// ─────────────────────────────────────────────────────────────
import type { AppState, EventKind, Match, Mark, ScreenMode, Side, TimerState } from '../types';
import { createFinalLive, createLive } from './defaults';
import {
  advance,
  currentMatch,
  currentQuestion,
  goldenPool,
  matchById,
  matchQuestions,
  questionTime,
  seedSlots,
  sideOf,
  teamById,
} from './tournament';
import { clamp, shuffle } from './util';
import { commit } from './store';

type Draft = AppState;

/**
 * Notikuma numurs = laika zīmogs (vienmēr pieaug). Pēc "Atsaukt" atjaunotais vecais
 * notikums ir mazāks par jau redzēto, tāpēc ekrāns to neatskaņo vēlreiz.
 */
export function nextEventId(prev: number | undefined): number {
  return Math.max(Date.now(), (prev ?? 0) + 1);
}

function bump(s: Draft, kind: EventKind, side?: Side, delta?: number) {
  s.live.event = { n: nextEventId(s.live.event?.n), kind, side, delta };
}

function liveMatch(s: Draft): Match {
  const m = currentMatch(s);
  if (!m) throw new Error('Nav aktīvas spēles');
  return m;
}

// ── Taimeris ────────────────────────────────────────────────

export function timerRemaining(t: TimerState, now = Date.now()): number {
  const elapsed = t.elapsedMs + (t.startedAt ? now - t.startedAt : 0);
  return Math.max(0, t.durationMs - elapsed);
}

export function timerStart(s: Draft) {
  const t = s.live.timer;
  if (t.startedAt || timerRemaining(t) <= 0) return;
  t.startedAt = Date.now();
}

export function timerPause(s: Draft) {
  const t = s.live.timer;
  if (!t.startedAt) return;
  t.elapsedMs = Math.min(t.durationMs, t.elapsedMs + Date.now() - t.startedAt);
  t.startedAt = null;
}

export function timerToggle(s: Draft) {
  if (s.live.timer.startedAt) timerPause(s);
  else timerStart(s);
}

export function timerReset(s: Draft, durationMs = s.live.timer.durationMs) {
  s.live.timer = { durationMs, startedAt: null, elapsedMs: 0 };
}

// ── Jautājumu navigācija ────────────────────────────────────

function resetQuestionState(s: Draft) {
  const m = currentMatch(s);
  const q = currentQuestion(s);
  s.live.shown = false;
  s.live.revealed = false;
  s.live.imageStep = 0;
  s.live.final = createFinalLive();
  s.live.media = { cmd: 'stop', n: nextEventId(s.live.media.n) };
  s.live.activeSide = m && m.answerMode === 'turns' && !s.live.golden.active ? ((s.live.qIndex % 2) as Side) : null;
  timerReset(s, (m ? questionTime(m, q) : 30) * 1000);
}

export function startMatch(s: Draft, matchId: string) {
  const m = matchById(s.tournament, matchId);
  if (!m || !m.teams[0] || !m.teams[1]) return;
  const other = currentMatch(s);
  if (other && other.status === 'live' && other.id !== m.id) return;
  m.status = 'live';
  s.live.matchId = m.id;
  s.live.qIndex = 0;
  s.live.golden = { active: false, questionId: null, tries: [false, false] };
  resetQuestionState(s);
  const hasFinalRules = s.tournament.rules.some((r) => r.final);
  if (m.kind === 'final' && hasFinalRules) {
    s.live.rules = { deck: 'final', index: 0, then: 'matchIntro' };
    s.live.screen = 'rules';
  } else {
    s.live.screen = 'matchIntro';
  }
}

export function showQuestion(s: Draft) {
  const m = liveMatch(s);
  if (!currentQuestion(s)) return;
  s.live.screen = 'question';
  s.live.shown = true;
  if (m.kind === 'final') s.live.final.stage = 'question';
  bump(s, 'show');
}

/** Parāda jautājuma ievadkarti (numurs, tēma, punkti) bez paša jautājuma. */
export function showQuestionTeaser(s: Draft) {
  s.live.screen = 'question';
}

export function revealAnswer(s: Draft) {
  if (!currentQuestion(s)) return;
  s.live.screen = 'question';
  s.live.shown = true;
  s.live.revealed = true;
  s.live.imageStep = 999;
  timerPause(s);
  bump(s, 'reveal');
}

export function gotoQuestion(s: Draft, index: number) {
  const m = liveMatch(s);
  const count = matchQuestions(s.tournament, m).length;
  if (s.live.golden.active || count === 0) return;
  s.live.qIndex = clamp(index, 0, count - 1);
  resetQuestionState(s);
  if (s.live.screen === 'matchIntro') s.live.screen = 'question';
}

export function nextQuestion(s: Draft) {
  if (s.live.golden.active) return nextGolden(s);
  gotoQuestion(s, s.live.qIndex + 1);
}

export function prevQuestion(s: Draft) {
  gotoQuestion(s, s.live.qIndex - 1);
}

export function imageRevealMore(s: Draft) {
  s.live.imageStep += 1;
}

export function mediaCommand(s: Draft, cmd: 'play' | 'pause' | 'stop') {
  s.live.media = { cmd, n: nextEventId(s.live.media.n) };
}

export function setActiveSide(s: Draft, side: Side | null) {
  s.live.activeSide = side;
}

// ── Vērtēšana ───────────────────────────────────────────────

function addPoints(s: Draft, m: Match, side: Side, delta: number) {
  const team = teamById(s.tournament, m.teams[side]);
  if (!team) return;
  team.score += delta;
  m.points[side] += delta;
}

/** Pareizi / nepareizi. Dueļos piešķir punktus, finālā — fiksē slēpto vērtējumu, zelta jautājumā — izšķir. */
export function mark(s: Draft, side: Side, result: Exclude<Mark, null> | null) {
  const m = liveMatch(s);
  const q = currentQuestion(s);
  if (!q || m.status !== 'live') return;

  if (s.live.golden.active) {
    if (result === 'correct') {
      // Pirmā pareizā atbilde jau izšķīrusi — otru vairs neskaita.
      const [a, b] = decidingScores(s, m);
      if (a !== b) return;
      addPoints(s, m, side, q.points);
      s.live.golden.tries[side] = true;
      timerPause(s);
      bump(s, 'correct', side, q.points);
    } else if (result === 'wrong') {
      s.live.golden.tries[side] = true;
      bump(s, 'wrong', side, 0);
    }
    return;
  }

  if (m.kind === 'final') {
    if (s.live.final.revealed[side]) return;
    s.live.final.verdict[side] = result === null ? null : result === 'correct';
    return;
  }

  const marks = (m.marks[q.id] ??= [null, null]);
  const old = marks[side];
  if (old === result) return;
  const value = (r: Mark) => (r === 'correct' ? q.points : 0);
  const delta = value(result) - value(old);
  marks[side] = result;
  addPoints(s, m, side, delta);
  if (result === 'correct') timerPause(s);
  if (result) bump(s, result, side, delta);
}

/** Manuāla punktu korekcija. Ja komanda spēlē pašreizējā dueļā, mainās arī dueļa punkti. */
export function adjustScore(s: Draft, teamId: string, delta: number) {
  const team = teamById(s.tournament, teamId);
  if (!team) return;
  const m = currentMatch(s);
  const side = m && m.status === 'live' ? sideOf(m, teamId) : null;
  if (m && side !== null) {
    addPoints(s, m, side, delta);
    bump(s, 'adjust', side, delta);
  } else {
    team.score += delta;
  }
}

// ── Spēles beigas un zelta jautājums ────────────────────────

/** Salīdzināmie punkti: dueļos — šīs spēles punkti, finālā — kopējie punkti. */
export function decidingScores(s: AppState, m: Match): [number, number] {
  if (m.kind === 'final') {
    return [teamById(s.tournament, m.teams[0])?.score ?? 0, teamById(s.tournament, m.teams[1])?.score ?? 0];
  }
  return [m.points[0], m.points[1]];
}

export function endMatch(s: Draft) {
  const m = liveMatch(s);
  const [a, b] = decidingScores(s, m);
  if (a === b) return startGolden(s);
  finishMatch(s, a > b ? 0 : 1, s.live.golden.active ? 'golden' : 'points');
}

function startGolden(s: Draft) {
  const m = liveMatch(s);
  const q = goldenPool(s.tournament).find((x) => !m.goldenUsed.includes(x.id));
  s.live.golden = { active: true, questionId: q?.id ?? null, tries: [false, false] };
  if (q) m.goldenUsed.push(q.id);
  resetQuestionState(s);
  s.live.screen = 'question';
  bump(s, 'golden');
}

export function nextGolden(s: Draft) {
  startGolden(s);
}

export function awardWin(s: Draft, side: Side) {
  finishMatch(s, side, 'manual');
}

function finishMatch(s: Draft, winner: Side, decidedBy: 'points' | 'golden' | 'manual') {
  const m = liveMatch(s);
  const t = s.tournament;
  const totalsAfter: Record<string, number> = {};
  for (const id of m.teams) if (id) totalsAfter[id] = teamById(t, id)?.score ?? 0;
  m.status = 'done';
  m.result = { winner: m.teams[winner]!, loser: m.teams[1 - winner]!, decidedBy, totalsAfter };
  s.live.golden = { active: false, questionId: null, tries: [false, false] };
  timerPause(s);
  advance(t);
  if (m.kind === 'final') {
    t.championId = m.result.winner;
    s.live.screen = 'winner';
    bump(s, 'fanfare', winner);
  } else {
    s.live.screen = 'matchResult';
    bump(s, 'win', winner);
  }
}

// ── Fināla likmes ───────────────────────────────────────────

export function maxBet(s: AppState, side: Side): number {
  const m = currentMatch(s);
  const score = (i: Side) => Math.max(0, teamById(s.tournament, m?.teams[i])?.score ?? 0);
  const own = score(side);
  return s.tournament.settings.finalBetCap === 'lower' ? Math.min(own, score((1 - side) as Side)) : own;
}

export function setBet(s: Draft, side: Side, amount: number) {
  if (s.live.final.betsLocked[side]) return;
  s.live.final.bets[side] = clamp(Math.round(amount) || 0, 0, maxBet(s, side));
}

export function lockBet(s: Draft, side: Side, locked: boolean) {
  if (s.live.final.betsRevealed) return;
  if (locked && s.live.final.bets[side] === null) s.live.final.bets[side] = 0;
  s.live.final.betsLocked[side] = locked;
  // Ekrānā parādās likmju statuss ("Likme likta ✓").
  if (locked && s.live.screen === 'matchIntro') s.live.screen = 'question';
}

export function revealBets(s: Draft) {
  const f = s.live.final;
  if (!f.betsLocked[0] || !f.betsLocked[1]) return;
  f.betsRevealed = true;
  s.live.screen = 'question';
  bump(s, 'bets');
}

export function setFinalAnswer(s: Draft, side: Side, text: string) {
  s.live.final.answers[side] = text;
}

export function revealFinalSide(s: Draft, side: Side) {
  const m = liveMatch(s);
  const q = currentQuestion(s);
  const f = s.live.final;
  const verdict = f.verdict[side];
  if (!q || verdict === null || f.revealed[side]) return;
  const bet = f.bets[side] ?? 0;
  const delta = verdict ? bet : -bet;
  addPoints(s, m, side, delta);
  f.revealed[side] = true;
  timerPause(s);
  if (f.revealed[0] && f.revealed[1]) {
    m.finalLog[q.id] = {
      bets: [f.bets[0] ?? 0, f.bets[1] ?? 0],
      answers: [...f.answers] as [string, string],
      verdict: [!!f.verdict[0], !!f.verdict[1]],
    };
  }
  bump(s, verdict ? 'correct' : 'wrong', side, delta);
}

// ── Ekrāni un noteikumi ─────────────────────────────────────

export function setScreen(s: Draft, mode: ScreenMode) {
  s.live.screen = mode;
}

export function showRules(s: Draft, deck: 'all' | 'final', then: ScreenMode | null = null) {
  s.live.rules = { deck, index: 0, then };
  s.live.screen = 'rules';
}

export function rulesDeck(s: AppState) {
  return s.live.rules.deck === 'final' ? s.tournament.rules.filter((r) => r.final) : s.tournament.rules;
}

export function rulesStep(s: Draft, dir: 1 | -1) {
  const count = rulesDeck(s).length;
  const next = s.live.rules.index + dir;
  if (next >= count && s.live.rules.then) {
    s.live.screen = s.live.rules.then;
    s.live.rules.then = null;
    return;
  }
  s.live.rules.index = clamp(next, 0, Math.max(0, count - 1));
}

export function toggleSound(s: Draft) {
  s.live.sound = !s.live.sound;
}

// ── Pāru sadale ─────────────────────────────────────────────

export function drawPairs(s: Draft) {
  const t = s.tournament;
  const slots = seedSlots(t).filter(({ match }) => match.status === 'pending');
  const teams = shuffle(t.teams.map((x) => x.id));
  slots.forEach(({ match, index }, i) => (match.teams[index] = teams[i] ?? null));
}

export function setSeed(s: Draft, matchId: string, index: Side, teamId: string | null) {
  const m = matchById(s.tournament, matchId);
  if (!m || m.status !== 'pending' || m.slots[index].kind !== 'seed') return;
  m.teams[index] = teamId;
}

/** Atiestata turnīra progresu (punkti, rezultāti), saglabājot komandas, jautājumus un pārus. */
export function resetProgress(s: Draft, keepPairs = true) {
  const t = s.tournament;
  t.teams.forEach((x) => (x.score = 0));
  t.championId = null;
  for (const m of t.matches) {
    m.status = 'pending';
    m.points = [0, 0];
    m.marks = {};
    m.finalLog = {};
    m.goldenUsed = [];
    delete m.result;
    m.teams = m.slots.map((slot, i) => (slot.kind === 'seed' && keepPairs ? m.teams[i] : null)) as [string | null, string | null];
  }
  const sound = s.live.sound;
  s.live = createLive();
  s.live.sound = sound;
}

// ── Ērta izsaukšana no UI ───────────────────────────────────

/** Izpilda dzinēja darbību. Ja norādīts `undo` teksts — darbību var atsaukt. */
export function act(fn: (s: Draft) => void, undo?: string) {
  commit(fn, undo);
}
