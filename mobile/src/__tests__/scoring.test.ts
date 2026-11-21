// The app must score exactly like the website: both import ../../shared/scoring,
// and these cases pin the behaviour the website has always had.
import { CATEGORIES, decodeAnswers, encodeAnswers, score } from '@shared/scoring';
import { bundles } from '../content';
import { makeT } from '../lib/i18n';
import { summarize, textReport } from '../lib/result';

const qs = bundles.en.questions;

test('25 questions across the 9 site categories', () => {
  expect(qs).toHaveLength(25);
  expect(new Set(qs.map((q) => q.category))).toEqual(new Set(CATEGORIES));
  qs.forEach((q) => expect(q.options).toHaveLength(4));
});

test('website scoring: best answers 100%, worst 25%, mixed rounds the same way', () => {
  expect(score(qs, Array(25).fill(0)).overall).toBe(100);
  expect(score(qs, Array(25).fill(3)).overall).toBe(25);
  const mixed = Array.from({ length: 25 }, (_, i) => i % 4);
  const r = score(qs, mixed);
  // 4,3,2,1 repeating: points = 6*(4+3+2+1) + 4 = 64 of 100.
  expect(r.overall).toBe(64);
  expect(r.categories.every((c) => c.score >= 25 && c.score <= 100)).toBe(true);
});

test('unanswered categories score -1 and do not count', () => {
  const a = Array(25).fill(null);
  a[0] = 0;
  const r = score(qs, a);
  expect(r.overall).toBe(100);
  expect(r.categories.filter((c) => c.score === -1)).toHaveLength(8);
});

test('share-link encoding matches the website (?r=)', () => {
  const a = Array.from({ length: 25 }, (_, i) => i % 4);
  expect(decodeAnswers(encodeAnswers(a), 25)).toEqual(a);
  expect(decodeAnswers('0123', 25)).toBeNull();
  expect(decodeAnswers('4'.repeat(25), 25)).toBeNull();
  expect(decodeAnswers('<script>'.padEnd(25, '0'), 25)).toBeNull();
});

test('every language produces a full summary and report', () => {
  for (const code of Object.keys(bundles)) {
    const t = makeT(code);
    const s = summarize(t, bundles[code].questions, Array(25).fill(1));
    expect(s.overall).toBe(75);
    expect(s.band.label).toBeTruthy();
    expect(s.band.feedback).toBeTruthy();
    s.dims.forEach((d) => {
      expect(d.label).not.toMatch(/^dim\./);
      expect(d.feedback).toBeTruthy();
    });
    expect(textReport(t, s, '2026-01-01', code)).toContain('75%');
  }
});
