import fs from 'node:fs';
import path from 'node:path';
import { appStrings, bundles } from '../content';
import { makeT } from '../lib/i18n';
import { LANGS, pickLanguage } from '../lib/languages';

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

test('same 20 languages as the website, in the same order', () => {
  const site = fs.readFileSync(path.resolve(__dirname, '../../../src/i18n/languages.ts'), 'utf8');
  const codes = [...site.matchAll(/code: '([a-z]{2})'/g)].map((m) => m[1]);
  expect(LANGS.map((l) => l.code)).toEqual(codes);
  expect(LANGS.filter((l) => l.dir === 'rtl').map((l) => l.code)).toEqual(['ar', 'ur']);
});

test.each(LANGS.map((l) => l.code))('%s: every app string is translated with the same placeholders', (code) => {
  const en = appStrings.en;
  const tr = appStrings[code];
  expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  for (const k of Object.keys(en)) {
    expect(tr[k].trim()).not.toBe('');
    expect(placeholders(tr[k])).toBe(placeholders(en[k]));
  }
});

test.each(LANGS.map((l) => l.code))('%s: test content bundle is complete', (code) => {
  const b = bundles[code];
  expect(b.lang).toBe(code);
  expect(b.questions).toHaveLength(25);
  b.questions.forEach((q, i) => {
    expect(q.category).toBe(bundles.en.questions[i].category);
    expect(q.text && q.hook).toBeTruthy();
    expect(q.options).toHaveLength(4);
  });
  const t = makeT(code);
  for (const k of ['test.start', 'test.resume', 'test.getResults', 'band.good.label', 'cat.low', 'dim.0.name', 'dim.8.desc', 'report.heading', 'nav.privacy']) {
    expect(t(k)).not.toBe(k);
  }
});

test('device language detection', () => {
  expect(pickLanguage(['pt-BR', 'en-US'])).toBe('pt');
  expect(pickLanguage(['zh-Hans-CN'])).toBe('zh');
  expect(pickLanguage(['nl-NL', 'de-DE'])).toBe('de');
  expect(pickLanguage(['nl-NL'])).toBe('en');
  expect(pickLanguage([])).toBe('en');
});
