import { useAppState } from '../lib/store';
import { routeHref } from '../lib/env';

const LINKS = [
  {
    route: 'host' as const,
    icon: '🎛️',
    title: 'Vadītāja pults',
    text: 'Redz pareizās atbildes, vada spēli, taimeri un punktus. Atveriet uz sava datora ekrāna.',
  },
  {
    route: 'screen' as const,
    icon: '📺',
    title: 'Lielais ekrāns',
    text: 'Projektoram vai TV. Pārvelciet logu uz projektoru un ieslēdziet pilnekrānu.',
  },
  {
    route: 'editor' as const,
    icon: '✏️',
    title: 'Redaktors',
    text: 'Turnīrs, spēles, jautājumi, noteikumi, imports no CSV/Excel, eksports JSON.',
  },
];

export default function Home() {
  const s = useAppState();
  return (
    <div className="stage-bg relative flex min-h-full flex-col items-center justify-center overflow-hidden p-8">
      <div className="stage-rays" />
      <h1 className="gold-text relative text-center text-6xl font-black md:text-8xl">{s.tournament.name}</h1>
      <p className="relative mt-3 text-xl text-white/70">{s.tournament.subtitle}</p>
      <div className="relative mt-12 grid w-full max-w-5xl gap-4 md:grid-cols-3">
        {LINKS.map((l) => (
          <a
            key={l.route}
            href={routeHref(l.route)}
            target={l.route === 'screen' ? '_blank' : undefined}
            rel="noreferrer"
            className="glass group rounded-3xl p-6 transition hover:-translate-y-1 hover:border-amber-300"
          >
            <div className="text-5xl">{l.icon}</div>
            <div className="mt-3 text-2xl font-black group-hover:text-amber-300">{l.title}</div>
            <p className="mt-2 text-sm text-white/60">{l.text}</p>
            <div className="mt-4 font-mono text-xs text-white/40">/{l.route}</div>
          </a>
        ))}
      </div>
      <div className="relative mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
        <a href={routeHref('noteikumi')} className="text-sm font-semibold text-amber-300 hover:underline">
          📜 Spēles noteikumi →
        </a>
        <a href={routeHref('final-preview')} className="text-sm font-semibold text-amber-300 hover:underline">
          🏆 Apskatīt, kā izskatās fināls →
        </a>
      </div>
      <p className="relative mt-6 max-w-2xl text-center text-sm text-white/50">
        Atveriet pulti un lielo ekrānu divos atsevišķos logos tajā pašā pārlūkā — tie sinhronizējas automātiski.
        Visi dati glabājas šajā pārlūkā (localStorage).
      </p>
    </div>
  );
}
