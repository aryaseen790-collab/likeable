// Scoring for the Likeable Person Test, shared by the website (src/scripts/quiz.ts)
// and the mobile app (mobile/), so both always give the same result for the same
// answers. Pure functions only: no DOM, no React Native, no import.meta.

export type Question = { text: string; options: string[]; hook: string; category: string };
export type Strings = Record<string, string>;

export const CATEGORIES = ['First Impressions', 'Communication', 'Positivity', 'Empathy', 'Emotional Intelligence', 'Kindness', 'Reliability', 'Trustworthiness', 'Social Skills'];
export const COLORS = ['#22b8e6', '#4f73ff', '#f5b301', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#f76a0c', '#d946ef'];

export type BandKey = 'exceptional' | 'excellent' | 'good' | 'above' | 'average' | 'low';
export const bandKey = (overall: number): BandKey =>
  overall >= 90 ? 'exceptional' : overall >= 80 ? 'excellent' : overall >= 70 ? 'good' : overall >= 60 ? 'above' : overall >= 50 ? 'average' : 'low';
export const overallBand = (S: Strings, overall: number) => {
  const key = bandKey(overall);
  return { key, label: S[`band.${key}.label`], feedback: S[`band.${key}.text`] };
};

export type CategoryClass = 'excellent' | 'good' | 'average' | 'needs-improvement';
export const categoryBand = (S: Strings, score: number): { cls: CategoryClass; feedback: string } => {
  if (score >= 85) return { cls: 'excellent', feedback: S['cat.excellent'] };
  if (score >= 70) return { cls: 'good', feedback: S['cat.good'] };
  if (score >= 55) return { cls: 'average', feedback: S['cat.average'] };
  return { cls: 'needs-improvement', feedback: S['cat.low'] };
};

/** Answer i (0 = first option) is worth 4 - i points; each score is a percentage of 4 points per question. */
export function score(questions: Question[], answers: (number | null)[]) {
  const per: Record<string, number[]> = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  answers.forEach((a, i) => {
    if (a !== null) per[questions[i].category].push(4 - a);
  });
  let total = 0;
  let count = 0;
  const categories = CATEGORIES.map((c) => {
    const s = per[c];
    const sum = s.reduce((x, y) => x + y, 0);
    total += sum;
    count += s.length;
    return { name: c, score: s.length ? Math.round((sum / s.length / 4) * 100) : -1 };
  });
  return { overall: count ? Math.round((total / (count * 4)) * 100) : 0, categories };
}

/** Answers as the share-link string used by the site (`?r=0123…`), and back. */
export const encodeAnswers = (answers: (number | null)[]) => answers.map((a) => a ?? 0).join('');
export const decodeAnswers = (r: string | null | undefined, n: number): number[] | null =>
  r && r.length === n && /^[0-3]+$/.test(r) ? [...r].map(Number) : null;
