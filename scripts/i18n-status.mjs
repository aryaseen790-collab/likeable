// Coverage of every language: which documents are translated, current and valid.
import fs from 'node:fs';
import path from 'node:path';
import { validSegment } from '../src/lib/segment.mjs';

const SRC = path.resolve('src/i18n/source');
const docs = fs.readdirSync(SRC).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const en = JSON.parse(fs.readFileSync('src/i18n/ui/en.json', 'utf8'));
const markers = (s) => [...(s.match(/<\/?[a-z]+>|\{\w+\}/g) || [])].sort().join('|');
const langs = fs.readdirSync('src/i18n').filter((d) => /^[a-z]{2}$/.test(d)).sort();
const uiLangs = fs.readdirSync('src/i18n/ui').map((f) => f.replace('.json', '')).filter((l) => l !== 'en');
for (const lang of [...new Set([...langs, ...uiLangs])].sort()) {
  const row = [];
  const uiFile = `src/i18n/ui/${lang}.json`;
  if (fs.existsSync(uiFile)) {
    const ui = JSON.parse(fs.readFileSync(uiFile, 'utf8'));
    const missing = Object.keys(en).filter((k) => ui[k] === undefined).length;
    const bad = Object.keys(en).filter((k) => ui[k] !== undefined && markers(ui[k]) !== markers(en[k])).length;
    row.push(`ui${missing || bad ? `(${missing} missing, ${bad} bad)` : '✓'}`);
  } else row.push('ui✗');
  for (const d of docs) {
    const f = `src/i18n/${lang}/${d}.json`;
    if (!fs.existsSync(f)) continue;
    const src = JSON.parse(fs.readFileSync(path.join(SRC, `${d}.json`), 'utf8'));
    const tr = JSON.parse(fs.readFileSync(f, 'utf8'));
    const bad = src.segments.filter((s, i) => !validSegment(s, tr.segments[i])).length;
    const ok = tr.source === src.source && tr.segments.length === src.segments.length && !bad;
    row.push(`${d}${ok ? '✓' : `✗(${tr.source !== src.source ? 'stale ' : ''}${tr.segments.length}/${src.segments.length} segs, ${bad} bad)`}`);
  }
  console.log(lang.padEnd(3), row.join('  '));
}
