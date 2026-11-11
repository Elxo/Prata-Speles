import { useEffect, useState } from 'react';
import HostApp from './views/host/HostApp';
import ScreenApp from './views/screen/ScreenApp';
import EditorApp from './views/editor/EditorApp';
import Home from './views/Home';
import FinalPreview from './views/preview/FinalPreview';
import RulesPage from './views/RulesPage';

export type Route = 'home' | 'host' | 'screen' | 'editor' | 'final-preview' | 'rules';

/** Atbalsta gan /host, gan #/host (statiskam hostingam bez SPA pāradresācijas). */
function getRoute(): Route {
  const path = (window.location.hash.replace(/^#/, '') || window.location.pathname).replace(/\/+$/, '');
  if (path.endsWith('/host')) return 'host';
  if (path.endsWith('/screen')) return 'screen';
  if (path.endsWith('/editor')) return 'editor';
  if (path.endsWith('/final-preview')) return 'final-preview';
  if (path.endsWith('/noteikumi')) return 'rules';
  return 'home';
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener('popstate', onChange);
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener('hashchange', onChange);
    };
  }, []);

  useEffect(() => {
    const titles: Record<Route, string> = {
      home: 'Prāta spēles',
      host: 'Vadītāja pults — Prāta spēles',
      screen: 'Lielais ekrāns — Prāta spēles',
      editor: 'Redaktors — Prāta spēles',
      'final-preview': 'Fināla priekšskats — Prāta spēles',
      rules: 'Noteikumi — Prāta spēles',
    };
    document.title = titles[route];
  }, [route]);

  switch (route) {
    case 'host':
      return <HostApp />;
    case 'screen':
      return <ScreenApp />;
    case 'editor':
      return <EditorApp />;
    case 'final-preview':
      return <FinalPreview />;
    case 'rules':
      return <RulesPage />;
    default:
      return <Home />;
  }
}
