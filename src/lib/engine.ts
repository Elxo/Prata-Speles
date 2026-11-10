// ─────────────────────────────────────────────────────────────
//  Spēles dzinējs: tīras funkcijas, kas maina (immer) melnrakstu.
//  UI tās izsauc caur act() — skat. apakšā.
// ─────────────────────────────────────────────────────────────
import type { AppState, EventKind, LiveEvent, Match, Mark, MediaCmd, PowerUpKind, ScreenMode, Side, TimerState } from '../types';
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

function bump(s: Draft, kind: EventKind, side?: Side, delta?: number, extra: Partial<LiveEvent> = {}) {
  s.live.event = { n: nextEventId(s.live.event?.n), kind, side, delta, ...extra };
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
  // Debatēs komandas pēc katras tēmas samaina puses.
  s.live.final = createFinalLive((s.live.qIndex % 2) as Side);
  s.live.media = { cmd: 'stop', n: nextEventId(s.live.media.n) };
  s.live.activeSide = m && m.answerMode === 'turns' && !s.live.golden.active && m.kind !== 'final' ? ((s.live.qIndex % 2) as Side) : null;
  // Finālā viens kopīgs debašu pulkstenis visām tēmām — mainot tēmu, to nepārstata.
  if (isDebate(s)) return;
  // Zelta jautājumam finālā — dueļu taimeris, nevis debašu laiks.
  const secs = m?.kind === 'final' ? q?.timeSec || s.tournament.settings.defaultTimerSec : m ? questionTime(m, q) : 30;
  timerReset(s, secs * 1000);
}

/** Notiek fināla debates (nevis duelis vai zelta jautājums). */
export function isDebate(s: AppState): boolean {
  return currentMatch(s)?.kind === 'final' && !s.live.golden.active;
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
  if (m.kind === 'final') timerReset(s, m.timerSec * 1000);
  const hasFinalRules = s.tournament.rules.some((r) => r.final);
  if (m.kind === 'final' && hasFinalRules) {
    s.live.rules = { deck: 'final', index: 0, then: 'matchIntro' };
    s.live.screen = 'rules';
  } else {
    s.live.screen = 'matchIntro';
  }
}

export function showQuestion(s: Draft) {
  if (!currentQuestion(s)) return;
  s.live.screen = 'question';
  s.live.shown = true;
  bump(s, 'show');
}

/** Parāda jautājuma ievadkarti (numurs, tēma, punkti) bez paša jautājuma. */
export function showQuestionTeaser(s: Draft) {
  s.live.screen = 'question';
}

export function revealAnswer(s: Draft) {
  if (!currentQuestion(s) || isDebate(s)) return;
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

export function mediaCommand(s: Draft, cmd: MediaCmd) {
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

/** Pareizi / nepareizi. Dueļos piešķir punktus, zelta jautājumā — izšķir. Debatēs neizmanto. */
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

  if (m.kind === 'final') return;

  const marks = (m.marks[q.id] ??= [null, null]);
  const old = marks[side];
  if (old === result) return;
  const mult = hasPowerUp(m, side, q.id, 'double') ? 2 : 1;
  const value = (r: Mark) => (r === 'correct' ? q.points * mult : 0);
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

// ── Papildiespējas ──────────────────────────────────────────

export function hasPowerUp(m: Match, side: Side, questionId: string, kind: PowerUpKind): boolean {
  return (m.powerUps ?? []).some((u) => u.side === side && u.questionId === questionId && u.kind === kind);
}

/** Vai komanda pašlaik vada (pēc kopējiem punktiem) savā spēlē. */
export function isLeader(s: AppState, side: Side): boolean {
  const m = currentMatch(s);
  if (!m) return false;
  const own = teamById(s.tournament, m.teams[side])?.score ?? 0;
  const other = teamById(s.tournament, m.teams[1 - side])?.score ?? 0;
  return own > other;
}

/** Papildiespējas cena komandai: vadošā komanda maksā vairāk. */
export function powerUpPrice(s: AppState, side: Side, kind: PowerUpKind): number {
  const st = s.tournament.settings;
  const base = st.powerUps?.[kind]?.price ?? 0;
  return isLeader(s, side) ? Math.round(base * (st.leaderPriceMultiplier || 1)) : base;
}

/** Cik papildiespēju komanda jau nopirkusi pašreizējā spēlē. */
export function powerUpsBought(s: AppState, side: Side): number {
  return (currentMatch(s)?.powerUps ?? []).filter((u) => u.side === side).length;
}

/** Kāpēc komanda pašlaik nevar nopirkt papildiespēju (null = var). */
export function powerUpBlock(s: AppState, side: Side, kind: PowerUpKind): string | null {
  const m = currentMatch(s);
  const q = currentQuestion(s);
  const cfg = s.tournament.settings.powerUps?.[kind];
  if (!m || m.status !== 'live' || m.kind !== 'duel') return 'Tikai dueļos';
  if (!cfg?.enabled) return 'Izslēgta redaktorā';
  if (s.live.golden.active) return 'Ne zelta jautājumā';
  if (!q) return 'Nav jautājuma';
  if (hasPowerUp(m, side, q.id, kind)) return 'Jau izmantota šim jautājumam';
  const limit = s.tournament.settings.powerUpsPerGame;
  if (limit > 0 && powerUpsBought(s, side) >= limit) return `Limits sasniegts (${limit} spēlē)`;
  const team = teamById(s.tournament, m.teams[side]);
  if (!team || team.score < powerUpPrice(s, side, kind)) return 'Nepietiek punktu';
  const marks = m.marks[q.id];
  if (marks?.[side]) return 'Komanda jau atbildēja';
  if (kind === 'double') return s.live.shown ? 'Jāpiesaka pirms jautājuma' : null;
  if (!s.live.shown) return 'Vispirms parādiet jautājumu';
  if (s.live.revealed) return 'Atbilde jau atklāta';
  if (kind === 'pass') {
    if (s.live.activeSide !== side) return 'Nodot var tikai atbildētāja komanda';
    if (marks?.[(1 - side) as Side]) return 'Pretinieki jau atbildēja';
  }
  return null;
}

export function buyPowerUp(s: Draft, side: Side, kind: PowerUpKind) {
  if (powerUpBlock(s, side, kind)) return;
  const m = liveMatch(s);
  const q = currentQuestion(s)!;
  const team = teamById(s.tournament, m.teams[side])!;
  const price = powerUpPrice(s, side, kind);
  // Cena tiek atņemta no KOPĒJIEM punktiem (dueļa punkti nemainās).
  team.score -= price;
  (m.powerUps ??= []).push({ kind, side, questionId: q.id, price });

  if (kind === 'time') {
    const running = !!s.live.timer.startedAt;
    timerPause(s);
    s.live.timer.durationMs += s.tournament.settings.extraTimeSec * 1000;
    if (running) timerStart(s);
  }
  if (kind === 'pass') {
    const running = !!s.live.timer.startedAt;
    s.live.activeSide = (1 - side) as Side;
    timerReset(s, questionTime(m, q) * 1000);
    if (running) timerStart(s);
  }
  bump(s, 'powerup', side, -price, { powerUp: kind });
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

// ── Fināla debates ──────────────────────────────────────────

export function swapDebateSides(s: Draft) {
  const f = s.live.final;
  if (f.scored) return;
  f.forSide = (1 - f.forSide) as Side;
}

export function setJury(s: Draft, side: Side, amount: number) {
  const f = s.live.final;
  if (f.scored) return;
  f.jury[side] = clamp(Math.round(amount) || 0, 0, s.tournament.settings.debateMaxPoints);
}

/** Pieskaita žūrijas punktus par pašreizējo tēmu un parāda tos ekrānā. */
export function scoreTopic(s: Draft) {
  const m = liveMatch(s);
  const q = currentQuestion(s);
  const f = s.live.final;
  if (!q || f.scored || f.jury[0] === null || f.jury[1] === null) return;
  const jury: [number, number] = [f.jury[0], f.jury[1]];
  addPoints(s, m, 0, jury[0]);
  addPoints(s, m, 1, jury[1]);
  f.scored = true;
  m.finalLog[q.id] = { forSide: f.forSide, jury };
  timerPause(s);
  s.live.screen = 'question';
  bump(s, 'jury');
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
  t.teams.forEach((x) => (x.score = t.settings.startingScore ?? 0));
  t.championId = null;
  for (const m of t.matches) {
    m.status = 'pending';
    m.points = [0, 0];
    m.marks = {};
    m.finalLog = {};
    m.goldenUsed = [];
    m.powerUps = [];
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
