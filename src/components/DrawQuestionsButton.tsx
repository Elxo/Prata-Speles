import type { AppState } from '../types';
import { commit } from '../lib/store';
import { bankQuestions, drawQuestions, type DrawResult } from '../lib/draw';

/** Izlozē jaunus jautājumus (un fināla tēzes) visām vēl nesāktajām spēlēm. */
export function DrawQuestionsButton({ s, className = 'btn btn-warn' }: { s: AppState; className?: string }) {
  const t = s.tournament;
  const bankSize = bankQuestions(t, 'questions').length + bankQuestions(t, 'theses').length;

  const draw = () => {
    if (!confirm('Izlozēt jaunus jautājumus visām vēl nesāktajām spēlēm un fināla tēzes? Šo spēļu pašreizējie jautājumi tiks aizstāti.')) return;
    let result: DrawResult = { filled: 0, warnings: [] };
    commit((d) => void (result = drawQuestions(d.tournament)), 'Izlozēt jautājumus');
    if (result.warnings.length) alert(result.warnings.join('\n'));
  };

  return (
    <button className={className} disabled={!bankSize} onClick={draw} title={bankSize ? undefined : 'Nav jautājumu bankas'}>
      🎲 Izlozēt jautājumus
    </button>
  );
}
