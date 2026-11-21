// Test content per language: synced from the website by scripts/sync-content.mjs.
import type { Question } from '@shared/scoring';

export type Bundle = { lang: string; questions: Question[]; strings: Record<string, string>; learnMore: Record<string, string> };

export const bundles: Record<string, Bundle> = {
  en: require('./bundles/en.json'),
  es: require('./bundles/es.json'),
  zh: require('./bundles/zh.json'),
  hi: require('./bundles/hi.json'),
  ar: require('./bundles/ar.json'),
  bn: require('./bundles/bn.json'),
  pt: require('./bundles/pt.json'),
  ru: require('./bundles/ru.json'),
  ur: require('./bundles/ur.json'),
  id: require('./bundles/id.json'),
  de: require('./bundles/de.json'),
  ja: require('./bundles/ja.json'),
  fr: require('./bundles/fr.json'),
  mr: require('./bundles/mr.json'),
  te: require('./bundles/te.json'),
  tr: require('./bundles/tr.json'),
  ta: require('./bundles/ta.json'),
  vi: require('./bundles/vi.json'),
  ko: require('./bundles/ko.json'),
  it: require('./bundles/it.json'),
};
export const appStrings: Record<string, Record<string, string>> = {
  en: require('../i18n/app/en.json'),
  es: require('../i18n/app/es.json'),
  zh: require('../i18n/app/zh.json'),
  hi: require('../i18n/app/hi.json'),
  ar: require('../i18n/app/ar.json'),
  bn: require('../i18n/app/bn.json'),
  pt: require('../i18n/app/pt.json'),
  ru: require('../i18n/app/ru.json'),
  ur: require('../i18n/app/ur.json'),
  id: require('../i18n/app/id.json'),
  de: require('../i18n/app/de.json'),
  ja: require('../i18n/app/ja.json'),
  fr: require('../i18n/app/fr.json'),
  mr: require('../i18n/app/mr.json'),
  te: require('../i18n/app/te.json'),
  tr: require('../i18n/app/tr.json'),
  ta: require('../i18n/app/ta.json'),
  vi: require('../i18n/app/vi.json'),
  ko: require('../i18n/app/ko.json'),
  it: require('../i18n/app/it.json'),
};
