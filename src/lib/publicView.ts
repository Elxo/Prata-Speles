// ─────────────────────────────────────────────────────────────
//  Publiskā projekcija: TIKAI tas, ko drīkst redzēt zāle.
//  Lielā ekrāna komponentes saņem šo tipu, nevis pilno stāvokli,
//  tāpēc pareizās atbildes un slēptās likmes tur nevar "noplūst".
// ─────────────────────────────────────────────────────────────
import type {
  AnswerMode,
  AppState,
  LiveEvent,
  MatchKind,
  MatchStatus,
  MediaCmd,
  Pair,
  PowerUpKind,
  QuestionType,
  RuleSlide,
  ScreenMode,
  Side,
  TimerState,
} from '../types';
import { hasPowerUp, powerUpPrice, powerUpsBought, rulesDeck } from './engine';
import { POWER_UP_LIST } from './powerUps';
import {
  currentMatch,
  currentQuestion,
  matchQuestions,
  rounds,
  sideOf,
  slotLabel,
  standings,
  teamById,
  teamStatus,
  type TeamStatus,
} from './tournament';

export interface PublicTeam {
  id: string;
  name: string;
  color: string;
  logo?: string;
  captain: string;
  members: string[];
  score: number;
  status: TeamStatus;
}

export interface PublicMatch {
  id: string;
  title: string;
  roundName: string;
  kind: MatchKind;
  status: MatchStatus;
  answerMode: AnswerMode;
  teams: Pair<PublicTeam | null>;
  labels: Pair<string>;
  points: Pair<number>;
  winnerSide: Side | null;
  decidedBy?: 'points' | 'golden' | 'manual';
  questionCount: number;
}

export interface PublicQuestion {
  id: string;
  number: number;
  total: number;
  golden: boolean;
  topic?: string;
  points: number;
  type: QuestionType;
  /** Saturs — tikai, kad jautājums parādīts. */
  text?: string;
  options?: string[];
  media?: string;
  author?: string;
  revealSteps: number;
  /** Atbilde — tikai pēc atklāšanas. */
  answer?: string;
  correctOption?: number;
}

export interface PublicFinal {
  /** Komanda, kas aizstāv tēzi („par”). */
  forSide: Side;
  scored: boolean;
  /** Žūrijas punkti — tikai pēc piešķiršanas. */
  jury: Pair<number | null>;
  maxPoints: number;
}

/** Papildiespēja komandas „veikalā” lielajā ekrānā. */
export interface PublicPowerUp {
  kind: PowerUpKind;
  price: number;
  /** Nopirkta pašreizējam jautājumam. */
  used: boolean;
  /** Komanda to vispār var atļauties (punkti un spēles limits). */
  available: boolean;
}

export interface PublicView {
  name: string;
  subtitle: string;
  logo?: string;
  screen: ScreenMode;
  rules: { slides: RuleSlide[]; index: number; deck: 'all' | 'final' };
  rounds: { round: number; name: string; matches: PublicMatch[] }[];
  standings: PublicTeam[];
  match: PublicMatch | null;
  question: PublicQuestion | null;
  shown: boolean;
  revealed: boolean;
  imageStep: number;
  timer: TimerState;
  activeSide: Side | null;
  goldenTries: Pair<boolean>;
  final: PublicFinal | null;
  champion: PublicTeam | null;
  event: LiveEvent | null;
  media: { cmd: MediaCmd; n: number };
  /** Papildiespējas katrai komandai (tukšs ārpus dueļa jautājumiem). */
  powerUps: Pair<PublicPowerUp[]>;
  sound: boolean;
}

export function toPublicView(s: AppState): PublicView {
  const t = s.tournament;
  const live = s.live;

  const pubTeam = (id: string | null | undefined): PublicTeam | null => {
    const team = teamById(t, id);
    if (!team) return null;
    return {
      id: team.id,
      name: team.name,
      color: team.color,
      logo: team.logo,
      captain: team.captain,
      members: team.members,
      score: team.score,
      status: teamStatus(t, team.id),
    };
  };

  const pubMatch = (id: string): PublicMatch | null => {
    const m = t.matches.find((x) => x.id === id);
    if (!m) return null;
    return {
      id: m.id,
      title: m.title,
      roundName: m.roundName,
      kind: m.kind,
      status: m.status,
      answerMode: m.answerMode,
      teams: [pubTeam(m.teams[0]), pubTeam(m.teams[1])],
      labels: [slotLabel(t, m.slots[0]), slotLabel(t, m.slots[1])],
      points: m.points,
      winnerSide: m.result ? sideOf(m, m.result.winner) : null,
      decidedBy: m.result?.decidedBy,
      questionCount: matchQuestions(t, m).length,
    };
  };

  const m = currentMatch(s);
  const q = currentQuestion(s);
  let question: PublicQuestion | null = null;
  if (m && (q || live.golden.active)) {
    const total = matchQuestions(t, m).length;
    question = {
      id: q?.id ?? 'golden',
      number: live.qIndex + 1,
      total,
      golden: live.golden.active,
      topic: q?.topic,
      points: q?.points ?? 0,
      type: q?.type ?? 'text',
      revealSteps: q?.type === 'image' ? (q.revealSteps ?? t.settings.imageRevealSteps) : 0,
    };
    if (q && live.shown) {
      question.text = q.text;
      question.options = q.type === 'choice' ? q.options : undefined;
      question.media = q.media;
      question.author = q.type === 'audience' ? q.author : undefined;
    }
    if (q && live.revealed) {
      question.answer = q.type === 'choice' && q.options && q.correctOption != null ? q.options[q.correctOption] : q.answer;
      question.correctOption = q.correctOption;
    }
  }

  const f = live.final;
  const final: PublicFinal | null =
    m?.kind === 'final'
      ? {
          forSide: f.forSide,
          scored: f.scored,
          jury: f.scored ? f.jury : [null, null],
          maxPoints: t.settings.debateMaxPoints,
        }
      : null;

  return {
    name: t.name,
    subtitle: t.subtitle,
    logo: t.logo,
    screen: live.screen,
    rules: { slides: rulesDeck(s), index: live.rules.index, deck: live.rules.deck },
    rounds: rounds(t).map((r) => ({ ...r, matches: r.matches.map((x) => pubMatch(x.id)!) })),
    standings: standings(t).map((x) => pubTeam(x.id)!),
    match: m ? pubMatch(m.id) : null,
    question,
    shown: live.shown,
    revealed: live.revealed,
    imageStep: live.imageStep,
    timer: live.timer,
    activeSide: live.activeSide,
    goldenTries: live.golden.tries,
    final,
    champion: pubTeam(t.championId),
    event: live.event,
    media: live.media,
    powerUps: ([0, 1] as Side[]).map((side): PublicPowerUp[] => {
      if (!m || !q || m.kind !== 'duel' || m.status !== 'live' || live.golden.active) return [];
      const limit = t.settings.powerUpsPerGame;
      const underLimit = !(limit > 0 && powerUpsBought(s, side) >= limit);
      const score = teamById(t, m.teams[side])?.score ?? 0;
      return POWER_UP_LIST.filter(([kind]) => t.settings.powerUps?.[kind]?.enabled).map(([kind]) => {
        const price = powerUpPrice(s, side, kind);
        const used = hasPowerUp(m, side, q.id, kind);
        return { kind, price, used, available: used || (underLimit && score >= price) };
      });
    }) as Pair<PublicPowerUp[]>,
    sound: live.sound,
  };
}
