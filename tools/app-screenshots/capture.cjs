// The app's four store screenshots in every language: home, a question, the result and
// the per-dimension scores. Same flow, size and answers as the English set.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , OUT, BUNDLES, ...only] = process.argv;
const LANGS = only.length ? only : ['es', 'zh', 'hi', 'ar', 'bn', 'pt', 'ru', 'ur', 'id', 'de', 'ja', 'fr', 'mr', 'te', 'tr', 'ta', 'vi', 'ko', 'it'];
(async () => {
  const b = await chromium.launch();
  for (const lang of LANGS) {
    const S = JSON.parse(fs.readFileSync(path.join(BUNDLES, `${lang}.json`), 'utf8')).strings;
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light', locale: lang });
    await ctx.addInitScript((l) => localStorage.setItem('lpt-app-settings-v1', JSON.stringify({ lang: l, theme: 'light', analytics: null })), lang);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    const dir = path.join(OUT, lang);
    fs.mkdirSync(dir, { recursive: true });
    await p.goto('http://localhost:4400/');
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${dir}/screen-1.png` });
    const btn = (text) => p.getByRole('button', { name: text, exact: true });
    await btn(S['test.start']).click();
    await p.waitForTimeout(700);
    const ans = async (i) => { await p.getByRole('radio').nth(i).click(); await p.waitForTimeout(80); };
    const next = async (last) => { await btn(last ? S['test.getResults'] : S['test.next']).click(); await p.waitForTimeout(320); };
    await ans(1); await next(false); await ans(0);
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${dir}/screen-2.png` });
    await next(false);
    for (let i = 2; i < 25; i++) { await ans([0, 1, 0, 2, 1][(i - 2) % 5]); await next(i === 24); }
    await p.waitForTimeout(2400);
    await p.screenshot({ path: `${dir}/screen-3.png` });
    await p.mouse.move(195, 500);
    await p.mouse.wheel(0, 1500);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${dir}/screen-4.png` });
    console.log(lang, errs.length ? 'ERRORS ' + errs.join(' | ') : 'ok');
    await ctx.close();
  }
  await b.close();
})();
