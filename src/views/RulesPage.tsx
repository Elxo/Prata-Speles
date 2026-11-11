// ─────────────────────────────────────────────────────────────
//  Informatīvā lapa ar noteikumiem (/noteikumi). Skaitļi (punkti,
//  laiki, papildiespēju cenas) vienmēr tiek ņemti no turnīra
//  iestatījumiem, tāpēc lapa paliek pareiza arī pēc izmaiņām redaktorā.
// ─────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { useAppState } from '../lib/store';
import { routeHref } from '../lib/env';
import { POWER_UP_LIST } from '../lib/powerUps';
import { pointsWord } from '../lib/util';

function Section({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 md:p-7">
      <h2 className="mb-3 flex items-center gap-3 text-2xl font-black md:text-3xl">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-2 text-base leading-relaxed text-white/80 md:text-lg">{children}</div>
    </section>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-black/25 p-4 text-center">
      <div className="gold-text text-3xl font-black tabular-nums md:text-4xl">{value}</div>
      <div className="mt-1 text-sm text-white/60">{label}</div>
    </div>
  );
}

export default function RulesPage() {
  const t = useAppState().tournament;
  const st = t.settings;
  const powerUps = POWER_UP_LIST.filter(([kind]) => st.powerUps?.[kind]?.enabled);
  const finalMins = Math.round(st.finalTimerSec / 60);

  return (
    <div className="stage-bg relative min-h-full overflow-x-hidden px-4 py-8 md:px-8 md:py-12">
      <div className="stage-rays" />
      <div className="relative mx-auto max-w-4xl space-y-5">
        <header className="text-center">
          <a href={routeHref('')} className="text-sm font-semibold text-amber-300 hover:underline">
            ← {t.name}
          </a>
          <h1 className="gold-text mt-2 text-5xl font-black md:text-7xl">Noteikumi</h1>
          {t.subtitle && <p className="mt-2 text-lg text-white/70">{t.subtitle}</p>}
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat value={st.startingScore} label="sākuma punkti komandai" />
          <Stat value={st.pointsRound1} label="punkti par jautājumu 1. kārtā" />
          <Stat value={st.pointsRound2} label="punkti par jautājumu pusfinālos" />
          <Stat value={`līdz ${st.debateMaxPoints}`} label="žūrijas punkti par debašu tēmu" />
        </div>

        <Section icon="⚔️" title="Dueļi">
          <p>Divas komandas atbild uz jautājumiem. Par pareizu atbildi komanda saņem jautājuma punktus, par nepareizu — 0.</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Pirmajā kārtā jautājums ir {st.pointsRound1} {pointsWord(st.pointsRound1)} vērts, pusfinālos — {st.pointsRound2}{' '}
              {pointsWord(st.pointsRound2)}.
            </li>
            <li>Atbildei ir {st.defaultTimerSec} sekundes. Pēdējās 5 sekundēs taimeris kļūst sarkans.</li>
            <li>Dueli uzvar komanda, kas šajā spēlē ieguvusi vairāk punktu.</li>
            <li>Neizšķirta gadījumā tiek uzdots zelta jautājums — uzvar pirmā pareizā atbilde.</li>
            <li>Kopējie punkti pāriet no kārtas uz kārtu un netiek atiestatīti.</li>
          </ul>
        </Section>

        {powerUps.length > 0 && (
          <Section icon="✨" title="Papildiespējas">
            <p>Dueļos komandas var nopirkt papildiespējas par saviem kopējiem punktiem.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {powerUps.map(([kind, def]) => (
                <div key={kind} className="flex items-start gap-3 rounded-2xl bg-black/25 p-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/80 text-2xl font-black">
                    {def.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="font-black text-white">{def.label}</span>
                      <span className="font-bold text-amber-300 tabular-nums">
                        {st.powerUps[kind].price} {pointsWord(st.powerUps[kind].price)}
                      </span>
                    </div>
                    <p className="text-sm text-white/60">
                      {kind === 'time' ? `Pieliek taimerim ${st.extraTimeSec} sekundes.` : def.hint}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <ul className="list-disc space-y-1 pl-6">
              <li>Katru papildiespēju vienam jautājumam komanda var izmantot vienu reizi.</li>
              {st.powerUpsPerGame > 0 && <li>Vienā spēlē komanda var nopirkt ne vairāk kā {st.powerUpsPerGame} papildiespējas.</li>}
              {st.leaderPriceMultiplier > 1 && (
                <li>Komanda, kas pret savu pretinieku vada pēc kopējiem punktiem, maksā {st.leaderPriceMultiplier}× vairāk.</li>
              )}
              <li>Zelta jautājumā un finālā papildiespējas nav pieejamas.</li>
            </ul>
          </Section>
        )}

        <Section icon="🏆" title="Fināls: debates">
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Finālisti debatē par {st.finalQuestionCount} tēzēm. Kopējais debašu laiks — {finalMins} minūtes.
            </li>
            <li>Viena komanda aizstāv tēzi („PAR”), otra to apstrīd („PRET”). Pēc katras tēmas puses mainās.</li>
            <li>Tēze var tikt parādīta arī video formātā — pēc video ekrānā parādās tēzes teksts.</li>
            <li>
              Pēc katras tēmas žūrija katrai komandai piešķir līdz {st.debateMaxPoints} {pointsWord(st.debateMaxPoints)}, kas tiek pieskaitīti
              kopējiem punktiem.
            </li>
            <li>Uzvar komanda ar visvairāk kopējo punktu. Neizšķirta gadījumā — zelta jautājums.</li>
          </ul>
        </Section>

        {t.rules.length > 0 && (
          <Section icon="📜" title="Noteikumu slaidi">
            <div className="space-y-4">
              {t.rules.map((r, i) => (
                <div key={r.id} className="rounded-2xl bg-black/25 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white/40">{i + 1}.</span>
                    <h3 className="text-lg font-black text-white md:text-xl">{r.title}</h3>
                    {r.final && <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-black">FINĀLS</span>}
                  </div>
                  {r.body.split('\n').map((line, j) => (
                    <p key={j} className="mt-1 text-white/75">
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
