// Copies the test content from the website build into the app, so the app asks the
// same 25 questions, scores them the same way and uses the same translations.
//
//   npm run sync          (from mobile/; builds the site first if dist/ is missing)
//   npm run sync -- --check   fails if the committed bundles are out of date (CI)
//
// Source: ../dist/i18n/quiz-<lang>.json (built by src/pages/i18n/quiz-[lang].json.ts)
// plus a few interface strings from ../src/i18n/ui/<lang>.json.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.resolve(import.meta.dirname, '../src/content/bundles');
const check = process.argv.includes('--check');
const UI_KEYS = [/^dim\.\d\.desc$/, /^test\.(hook|desc|start|resume|share|retry|howToImprove|assessment|topStrength|focusArea|resultsTitle|radarLabel|previous|next|getResults|of|shareText|shareTitle)$/, /^nav\.(privacy|terms|language)$/, /^hero\.badge$/, /^report\./];

const distDir = path.join(ROOT, 'dist/i18n');
if (!fs.existsSync(distDir)) {
  if (check) throw new Error('dist/ is missing: run `npm run build` in the repo root first');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
}
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/ui/en.json'), 'utf8'));
const files = fs.readdirSync(distDir).filter((f) => /^quiz-[a-z]{2}\.json$/.test(f)).sort();
if (files.length < 20) throw new Error(`expected 20 quiz bundles, found ${files.length}`);

let stale = 0;
fs.mkdirSync(OUT, { recursive: true });
for (const f of files) {
  const quiz = JSON.parse(fs.readFileSync(path.join(distDir, f), 'utf8'));
  const uiFile = path.join(ROOT, `src/i18n/ui/${quiz.lang}.json`);
  const ui = fs.existsSync(uiFile) ? JSON.parse(fs.readFileSync(uiFile, 'utf8')) : {};
  const strings = { ...quiz.strings };
  for (const k of Object.keys(en)) if (UI_KEYS.some((re) => re.test(k))) strings[k] = ui[k] ?? en[k];
  // The quiz links to website articles; the app opens them on the live site.
  const out = JSON.stringify({ lang: quiz.lang, questions: quiz.questions, strings: Object.fromEntries(Object.entries(strings).sort()), learnMore: quiz.learnMore }, null, 1) + '\n';
  const dest = path.join(OUT, `${quiz.lang}.json`);
  if (check) {
    if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== out) {
      console.error(`✗ ${quiz.lang} is out of date`);
      stale++;
    }
  } else fs.writeFileSync(dest, out);
}
if (check && stale) process.exit(1);
console.log(check ? `all ${files.length} bundles up to date ✓` : `wrote ${files.length} bundles to src/content/bundles`);
