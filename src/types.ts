// ─────────────────────────────────────────────────────────────
//  Prāta spēles — datu modelis
// ─────────────────────────────────────────────────────────────

export type ID = string;

/** Komandas vieta dueļa ietvaros: 0 = kreisā (A), 1 = labā (B). */
export type Side = 0 | 1;
export type Pair<T> = [T, T];

// ── Jautājumi ────────────────────────────────────────────────

export type QuestionType = 'text' | 'choice' | 'image' | 'audio' | 'video' | 'audience';

export interface Question {
  id: ID;
  type: QuestionType;
  text: string;
  /** Pareizā atbilde (choice tipam — pareizā varianta teksts tiek ņemts no options). */
  answer: string;
  /** Atbilžu varianti A/B/C/D (choice tipam). */
  options?: string[];
  correctOption?: number;
  points: number;
  /** Ja nav norādīts — tiek izmantots spēles taimeris. */
  timeSec?: number;
  topic?: string;
  /** Attēls / audio / video: URL vai data: URI (base64). */
  media?: string;
  /** Skatītāja jautājuma autors. */
  author?: string;
  /** Redz tikai vadītājs. */
  hostNotes?: string;
  /** Attēla pakāpeniskās atklāšanas soļu skaits (0 = rādīt uzreiz). */
  revealSteps?: number;
}

export interface QuestionSet {
  id: ID;
  name: string;
  questions: Question[];
}

// ── Komandas ────────────────────────────────────────────────

export interface Team {
  id: ID;
  name: string;
  color: string;
  captain: string;
  members: string[];
  logo?: string;
  /** KOPĒJIE punkti — pāriet no kārtas uz kārtu, netiek atiestatīti. */
  score: number;
}

// ── Turnīra shēma ───────────────────────────────────────────

/** Kā tiek noteikta komanda konkrētajā spēles vietā. */
export type Slot =
  /** Izloze vai vadītāja manuāla izvēle. */
  | { kind: 'seed' }
  /** Norādītās spēles uzvarētājs. */
  | { kind: 'winner'; matchId: ID }
  /** Norādītās spēles zaudētājs. */
  | { kind: 'loser'; matchId: ID }
  /** N-tais labākais uzvarētājs vai zaudētājs (pēc kopējiem punktiem) no norādītajām spēlēm. */
  | { kind: 'ranked'; matchIds: ID[]; rank: number; pool?: RankPool };

/** No kuriem ranžē: uzvarētājiem (noklusējums) vai zaudētājiem ("labākais zaudētājs"). */
export type RankPool = 'winners' | 'losers';

export type MatchKind = 'duel' | 'final';
export type AnswerMode = 'turns' | 'buzzer';
export type MatchStatus = 'pending' | 'live' | 'done';
export type Mark = 'correct' | 'wrong' | null;

/** Fināla debašu tēmas rezultāts. */
export interface FinalRecord {
  /** Komanda, kas aizstāvēja tēzi („par”). */
  forSide: Side;
  jury: Pair<number>;
}

export interface MatchResult {
  winner: ID;
  loser: ID;
  decidedBy: 'points' | 'golden' | 'manual';
  /** Abu komandu kopējie punkti spēles beigās (izmanto "ranked" slotiem). */
  totalsAfter: Record<ID, number>;
}

export interface Match {
  id: ID;
  /** Piem., "Pirmās kārtas 2. spēle", "Pusfināls", "Fināls". */
  title: string;
  /** Kārtas numurs turnīra kokā (kolonna). */
  round: number;
  roundName: string;
  kind: MatchKind;
  slots: Pair<Slot>;
  /** Konkrētās komandas, kad sloti ir atrisināti. */
  teams: Pair<ID | null>;
  questionSetId: ID | null;
  /** 0 = visi kopas jautājumi. */
  questionCount: number;
  timerSec: number;
  answerMode: AnswerMode;
  status: MatchStatus;
  /** Šajā spēlē iegūtie punkti (dueļa uzvarētāja noteikšanai). */
  points: Pair<number>;
  /** Atzīmes katram jautājumam (pēc jautājuma ID). */
  marks: Record<ID, Pair<Mark>>;
  /** Fināla debašu rezultāti (pēc tēmas ID). */
  finalLog: Record<ID, FinalRecord>;
  /** Izmantotie zelta jautājumi. */
  goldenUsed: ID[];
  result?: MatchResult;
}

// ── Noteikumi ───────────────────────────────────────────────

export interface RuleSlide {
  id: ID;
  title: string;
  body: string;
  /** 'bracket' — slaidā tiek parādīta arī turnīra shēma. */
  kind: 'text' | 'bracket';
  /** Fināla noteikumu slaids (parādās vēlreiz pirms fināla). */
  final: boolean;
}

export interface Settings {
  defaultTimerSec: number;
  /** Fināla debašu tēmu skaits. */
  finalQuestionCount: number;
  /** Kopējais debašu laiks visām tēmām (s). */
  finalTimerSec: number;
  imageRevealSteps: number;
  /** Maksimālie žūrijas punkti vienai komandai par vienu tēmu. */
  debateMaxPoints: number;
}

export interface Tournament {
  id: ID;
  name: string;
  subtitle: string;
  logo?: string;
  schemeId: string;
  teams: Team[];
  matches: Match[];
  questionSets: QuestionSet[];
  /** Jautājumu kopa neizšķirta gadījumam. */
  goldenSetId: ID | null;
  rules: RuleSlide[];
  settings: Settings;
  championId: ID | null;
}

// ── Tiešraides stāvoklis ────────────────────────────────────

export type ScreenMode =
  | 'logo'
  | 'rules'
  | 'matchIntro'
  | 'question'
  | 'matchResult'
  | 'bracket'
  | 'standings'
  | 'winner';

export interface TimerState {
  durationMs: number;
  /** Date.now(), kad taimeris palaists; null = apturēts. */
  startedAt: number | null;
  /** Jau notecējušais laiks pirms pēdējās palaišanas. */
  elapsedMs: number;
}

export interface FinalLive {
  /** Komanda, kas aizstāv tēzi („par”); otra — „pret”. */
  forSide: Side;
  /** Žūrijas punkti par pašreizējo tēmu. */
  jury: Pair<number | null>;
  /** Punkti piešķirti un parādīti ekrānā. */
  scored: boolean;
}

export type EventKind = 'correct' | 'wrong' | 'reveal' | 'fanfare' | 'win' | 'jury' | 'show' | 'golden' | 'adjust';

export interface LiveEvent {
  n: number;
  kind: EventKind;
  side?: Side;
  delta?: number;
}

export interface Live {
  screen: ScreenMode;
  rules: { deck: 'all' | 'final'; index: number; then: ScreenMode | null };
  matchId: ID | null;
  qIndex: number;
  shown: boolean;
  revealed: boolean;
  imageStep: number;
  timer: TimerState;
  /** Kura komanda atbild (pēc kārtas) vai pieteicās (ar pogu). */
  activeSide: Side | null;
  golden: { active: boolean; questionId: ID | null; tries: Pair<boolean> };
  final: FinalLive;
  media: { cmd: 'play' | 'pause' | 'stop'; n: number };
  event: LiveEvent | null;
  sound: boolean;
}

export interface AppState {
  version: 1;
  tournament: Tournament;
  live: Live;
}
