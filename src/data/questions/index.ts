// ─────────────────────────────────────────────────────────────
//  Jautājumu banka: visas tēmas kopā. No tās izlozē jautājumus
//  spēlēm (skat. lib/draw.ts). Formāts: [tēma, jautājums, atbilde].
// ─────────────────────────────────────────────────────────────
import { IT } from './it';
import { KULTURA } from './kultura';
import { LATVIJA } from './latvija';
import { POLITIKA } from './politika';
import { SPORTS } from './sports';
import { TURIBA } from './turiba';
import { TURISMS } from './turisms';
import { UZNEMEJDARBIBA } from './uznemejdarbiba';
import { VESELIBA } from './veseliba';

const TOPICS: [string, [string, string][]][] = [
  ['Turība', TURIBA],
  ['Sports', SPORTS],
  ['Latvija', LATVIJA],
  ['Politika', POLITIKA],
  ['Kultūra', KULTURA],
  ['IT', IT],
  ['Tūrisms', TURISMS],
  ['Uzņēmējdarbība', UZNEMEJDARBIBA],
  ['Veselības aprūpe', VESELIBA],
];

export const QUESTION_BANK: [topic: string, text: string, answer: string][] = TOPICS.flatMap(([topic, rows]) =>
  rows.map(([text, answer]) => [topic, text, answer] as [string, string, string]),
);
