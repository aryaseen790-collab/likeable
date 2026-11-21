// Language for the whole app: the person's choice in Settings, else the phone's
// language, else English. Arabic and Urdu lay out right to left: the root view sets
// `direction`, and every style uses start/end instead of left/right, so switching
// language takes effect at once (no restart, unlike I18nManager.forceRTL).
import { getLocales } from 'expo-localization';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { appStrings, bundles, type Bundle } from '../content';
import { langOf, pickLanguage, type Lang } from './languages';
import { useSettings } from './store';

export type T = (key: string, vars?: Record<string, string | number>) => string;
type I18n = { lang: Lang; bundle: Bundle; t: T; rtl: boolean; formatDate(iso: string): string };
const Ctx = createContext<I18n | null>(null);

export const deviceLanguage = () => {
  try {
    return pickLanguage(getLocales().map((l) => l.languageTag));
  } catch {
    return 'en';
  }
};

export function makeT(code: string): T {
  const app = appStrings[code] ?? appStrings.en;
  const site = (bundles[code] ?? bundles.en).strings;
  return (key, vars = {}) => {
    const s = app[key] ?? site[key] ?? appStrings.en[key] ?? bundles.en.strings[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { lang: chosen } = useSettings();
  const value = useMemo(() => {
    const lang = langOf(chosen && bundles[chosen] ? chosen : deviceLanguage());
    let dateFmt: Intl.DateTimeFormat | null = null;
    try {
      dateFmt = new Intl.DateTimeFormat(lang.tag, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {}
    return {
      lang,
      bundle: bundles[lang.code],
      t: makeT(lang.code),
      rtl: lang.dir === 'rtl',
      formatDate: (iso: string) => (dateFmt ? dateFmt.format(new Date(iso)) : iso.slice(0, 10)),
    };
  }, [chosen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
};
/** Strip the little HTML some website strings carry (e.g. <em>). */
export const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
