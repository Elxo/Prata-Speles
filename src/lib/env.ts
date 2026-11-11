/** Ekrāns atvērts kā priekšskatījums pults iekšienē (bez skaņas un aktivizācijas). */
export const IS_PREVIEW = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('preview');

/** Saite uz skatu, kas darbojas gan ar /host, gan ar #/host maršrutēšanu. */
export function routeHref(route: 'host' | 'screen' | 'editor' | 'final-preview' | 'noteikumi' | '', query = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${route}${query}`;
}
