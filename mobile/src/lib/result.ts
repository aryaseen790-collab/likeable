// Everything a result screen, the history list and the shared text report need,
// computed with the website's scoring (../../shared/scoring.ts).
import { CATEGORIES, categoryBand, overallBand, score, type Question } from '@shared/scoring';
import type { T } from './i18n';

export const ICONS = ['👋', '🗣️', '☀️', '💛', '🧠', '🤲', '🔐', '🤝', '🎭'];
export const SITE = 'https://likeable-person-test.com';

export const dimName = (t: T, category: string) => t(`dim.${CATEGORIES.indexOf(category)}.name`);

export function summarize(t: T, questions: Question[], answers: number[]) {
  const { overall, categories } = score(questions, answers);
  const band = overallBand(strings(t, 'band'), overall);
  const dims = categories.map((cat, i) => ({ ...cat, index: i, label: dimName(t, cat.name), icon: ICONS[i], ...categoryBand(strings(t, 'cat'), cat.score) }));
  const sorted = [...dims].sort((a, b) => b.score - a.score);
  return { overall, band, dims, top: sorted[0], focus: sorted[sorted.length - 1] };
}

// The keys overallBand/categoryBand read, resolved in the current language.
const KEYS: Record<string, string[]> = {
  band: ['exceptional', 'excellent', 'good', 'above', 'average', 'low'].flatMap((b) => [`band.${b}.label`, `band.${b}.text`]),
  cat: ['cat.excellent', 'cat.good', 'cat.average', 'cat.low'],
};
const strings = (t: T, group: 'band' | 'cat') => Object.fromEntries(KEYS[group].map((k) => [k, t(k)]));

/** The website's downloadable report, as plain text for the share sheet. */
export function textReport(t: T, s: ReturnType<typeof summarize>, date: string, locale: string) {
  const line = '━━━━━━━━━━━━━━━━━━━━━━━━';
  const out = [`✨ ${t('report.heading')} ✨`, line, `${t('report.date')}: ${date}`, `${t('report.overall')}: ${s.overall}%`, `${t('report.rating')}: ${s.band.label}`, '', t('report.assessment'), s.band.feedback, '', `📊 ${t('report.breakdown')}`, line];
  for (const d of s.dims) out.push(`${d.icon} ${d.label.toLocaleUpperCase(locale)}: ${d.score}%`, d.feedback, '');
  out.push(`💡 ${t('report.recommendations')}`, line);
  [...s.dims].sort((a, b) => a.score - b.score).slice(0, 3).forEach((d, i) => out.push(`${i + 1}. ${d.label}: ${t('report.recommendation')}`));
  out.push('', t('report.thanks'), SITE);
  return out.join('\n');
}
