// ─────────────────────────────────────────────────────────────
//  Papildiespēju apraksti (nosaukums, ikona, kad tās var izmantot).
//  Pirkšanas loģika — engine.ts (buyPowerUp).
// ─────────────────────────────────────────────────────────────
import type { PowerUpKind } from '../types';

export interface PowerUpDef {
  label: string;
  icon: string;
  /** Īss apraksts vadītājam un redaktoram. */
  hint: string;
  /** Teksts lielajā ekrānā, kad papildiespēja nopirkta. */
  screen: string;
  /** Vai jāpērk pirms jautājuma parādīšanas (citādi — kamēr jautājums ekrānā). */
  beforeShow: boolean;
}

export const POWER_UPS: Record<PowerUpKind, PowerUpDef> = {
  audience: {
    label: 'Zāles palīdzība',
    icon: '🙋',
    hint: 'Komanda drīkst pajautāt zālei. Pieejams, kamēr jautājums ir ekrānā.',
    screen: 'ZĀLES PALĪDZĪBA',
    beforeShow: false,
  },
  double: {
    label: 'Dubultie punkti',
    icon: '✖2',
    hint: 'Pareiza atbilde dod divreiz vairāk punktu. Jāpiesaka PIRMS jautājuma parādīšanas.',
    screen: 'DUBULTIE PUNKTI',
    beforeShow: true,
  },
  time: {
    label: 'Papildu laiks',
    icon: '⏱',
    hint: 'Pieliek taimerim papildu sekundes.',
    screen: 'PAPILDU LAIKS',
    beforeShow: false,
  },
  pass: {
    label: 'Nodot pretiniekam',
    icon: '↪',
    hint: 'Jautājums jāatbild pretinieku komandai.',
    screen: 'JAUTĀJUMS NODOTS',
    beforeShow: false,
  },
};

export const POWER_UP_LIST = Object.entries(POWER_UPS) as [PowerUpKind, PowerUpDef][];
