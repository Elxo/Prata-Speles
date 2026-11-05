import type { FinalLive, Live, RuleSlide, Settings } from '../types';
import { uid } from './util';

export const DEFAULT_SETTINGS: Settings = {
  defaultTimerSec: 30,
  finalQuestionCount: 5,
  finalTimerSec: 45,
  imageRevealSteps: 4,
};

export const TEAM_COLORS = ['#ff3d7f', '#2ec4ff', '#ffcc33', '#4ade80', '#b47cff', '#ff8a3d', '#f43f5e', '#14b8a6'];

export function createFinalLive(): FinalLive {
  return {
    stage: 'bet',
    bets: [null, null],
    betsLocked: [false, false],
    betsRevealed: false,
    answers: ['', ''],
    verdict: [null, null],
    revealed: [false, false],
  };
}

export function createLive(): Live {
  return {
    screen: 'logo',
    rules: { deck: 'all', index: 0, then: null },
    matchId: null,
    qIndex: 0,
    shown: false,
    revealed: false,
    imageStep: 0,
    timer: { durationMs: DEFAULT_SETTINGS.defaultTimerSec * 1000, startedAt: null, elapsedMs: 0 },
    activeSide: null,
    golden: { active: false, questionId: null, tries: [false, false] },
    final: createFinalLive(),
    media: { cmd: 'stop', n: 0 },
    event: null,
    sound: true,
  };
}

export function defaultRules(): RuleSlide[] {
  const r = (title: string, body: string, extra: Partial<RuleSlide> = {}): RuleSlide => ({
    id: uid('rule'),
    title,
    body,
    kind: 'text',
    final: false,
    ...extra,
  });
  return [
    r(
      'Laipni lūgti „Prāta spēlēs”!',
      'Sešas komandas. Sešas spēles. Viens čempions.\nŠovakar uzvarēs veiksme, intuīcija un prāts.',
    ),
    r(
      'Turnīra shēma',
      'Pirmajā kārtā — 3 dueļi, komanda pret komandu.\nPusfinālos spēlē 3 uzvarētāji un labākais zaudētājs pēc kopējiem punktiem.\nLabākais uzvarētājs tiekas ar labāko zaudētāju. Pusfinālu uzvarētāji spēlē finālā.',
      { kind: 'bracket' },
    ),
    r(
      'Kā tiek piešķirti punkti',
      'Katram jautājumam ir sava vērtība — 10, 20 vai 30 punkti.\nPar pareizu atbildi komanda saņem jautājuma punktus, par nepareizu — 0.\nDueli uzvar komanda, kas šajā spēlē ieguvusi vairāk punktu.',
    ),
    r(
      'Laiks',
      'Atbildei ir 30 sekundes.\nPēdējās 5 sekundēs taimeris kļūst sarkans un sāk tikšķēt.\nKad laiks beidzies — atbilde jāsniedz uzreiz!',
    ),
    r(
      'Punkti saglabājas!',
      'Katras komandas KOPĒJIE punkti pāriet no kārtas uz kārtu un netiek atiestatīti.\nKatrs punkts ir svarīgs — arī finālā.',
    ),
    r(
      'Neizšķirts',
      'Ja duelis beidzas neizšķirti, tiek uzdots zelta jautājums.\nUzvar komanda, kas pirmā sniedz pareizo atbildi.',
    ),
    r(
      'Fināls: likmes',
      'Finālā ir 5 jautājumi.\nPIRMS katra jautājuma katra komanda liek likmi — no 0 līdz VISIEM saviem punktiem.\nPareiza atbilde: likme tiek pieskaitīta. Nepareiza atbilde: likme tiek atņemta.\nLiekot visu, punktus var dubultot — vai zaudēt visu!',
      { final: true },
    ),
    r(
      'Fināls: atbildes',
      'Abas komandas atbildes raksta vienlaikus uz lapas.\nVadītājs atbildes atklās pa vienai.\nUzvar komanda ar visvairāk kopējo punktu pēc pēdējā jautājuma.',
      { final: true },
    ),
  ];
}
