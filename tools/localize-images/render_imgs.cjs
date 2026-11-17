// Renders translated versions of the five article images.
// usage: node render_imgs.cjs <scratchpad> <outDir> [lang ...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const D = process.argv[2];
const OUT = process.argv[3];
const only = process.argv.slice(4);
const specs = JSON.parse(fs.readFileSync(`${D}/img_specs.json`, 'utf8'));
const text = JSON.parse(fs.readFileSync(`${D}/imgtext.json`, 'utf8'));
const F = `file://${D}/fonts`;

const FONT = {
  latin: ['fontsource-nunito-5.3.0', 'Nunito'],
  hi: ['fontsource-noto-sans-devanagari-5.3.0', 'Noto Sans Devanagari'],
  mr: ['fontsource-noto-sans-devanagari-5.3.0', 'Noto Sans Devanagari'],
  bn: ['fontsource-noto-sans-bengali-5.3.0', 'Noto Sans Bengali'],
  te: ['fontsource-noto-sans-telugu-5.3.0', 'Noto Sans Telugu'],
  ta: ['fontsource-noto-sans-tamil-5.3.0', 'Noto Sans Tamil'],
  ar: ['fontsource-noto-sans-arabic-5.3.0', 'Noto Sans Arabic'],
  ur: ['fontsource-noto-sans-arabic-5.3.0', 'Noto Sans Arabic'],
  ja: ['fontsource-noto-sans-jp-5.3.1', 'Noto Sans JP'],
  zh: ['fontsource-noto-sans-sc-5.3.1', 'Noto Sans SC'],
  ko: ['fontsource-noto-sans-kr-5.3.1', 'Noto Sans KR'],
};
const RTL = new Set(['ar', 'ur']);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');

function page(img, lang) {
  const sp = specs[img];
  const [W, H] = sp.size;
  const [pkg, fam] = FONT[lang] || FONT.latin;
  const weights = [700, 800, 900].filter((w) => fs.existsSync(`${D}/fonts/${pkg}/package/${w}.css`));
  const css = weights.map((w) => `<link rel="stylesheet" href="${F}/${pkg}/package/${w}.css">`).join('')
    + `<link rel="stylesheet" href="${F}/fontsource-nunito-5.3.0/package/800.css">`;
  const T = text[lang];
  const els = sp.regions.map((r) => {
    let [x0, y0, x1, y1] = r.box;
    const isPill = r.kind === 'pill';
    if (isPill) { x0 -= 3; y0 -= 3; x1 += 3; y1 += 3; if (r.top_bleed) y0 -= 20; }
    const w = x1 - x0, h = y1 - y0;
    const radius = isPill ? (r.vertical ? w / 2 : Math.min(h, 60) / 2) : r.radius;
    let inner;
    if (r.quad) inner = `<b>${esc(T[r.key + '1'])}</b><span>${esc(T[r.key + '2'])}</span>`;
    else inner = esc(T[r.key] + (r.suffix || ''));
    const padX = r.pad ?? 6;
    const rot = r.rotate ? `transform:rotate(${r.rotate}deg);` : '';
    const box = `left:${x0}px;top:${y0}px;width:${w}px;height:${h}px;background:${r.bg};border-radius:${radius}px;box-shadow:0 0 3px 2px ${r.bg};${rot}`;
    const tw = r.vertical ? h - 2 * padX : w - 2 * padX;
    const th = r.vertical ? w - 6 : (r.top_bleed ? h - 26 : h - 6);
    const txt = `width:${tw}px;height:${th}px;color:${r.color};font-weight:${r.weight};text-align:${RTL.has(lang) ? 'center' : (r.align || 'center')};`
      + (r.vertical ? 'transform:rotate(-90deg);' : '') + (r.top_bleed ? 'margin-top:20px;' : '');
    const one = ['t1','t2','t3','t4','t5','c1','cap2','hi','lo','warmth','comp','eye','posture','listen','start'].includes(r.key);
    const bg = r.gradient ? `background:linear-gradient(180deg,${r.gradient[0]},${r.gradient[1]});box-shadow:none;` : '';
    return `<div class="reg" style="${box}${bg}"><div class="t${r.quad ? ' quad' : ''}" data-max="${r.size}" data-one="${one ? 1 : ''}" style="${txt}"><div class="in">${inner}</div></div></div>`;
  }).join('');
  return `<!doctype html><html dir="${RTL.has(lang) ? 'rtl' : 'ltr'}" lang="${lang}"><head><meta charset="utf-8">${css}<style>
  html,body{margin:0;padding:0}
  #c{position:relative;width:${W}px;height:${H}px;background:url('file://${D}/crops/${img}.png') no-repeat;overflow:hidden}
  .reg{position:absolute;display:flex;align-items:center;justify-content:center}
  .t{display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'${fam}','Nunito',sans-serif;line-height:${RTL.has(lang) || ['hi','mr','bn','te','ta'].includes(lang) ? 1.3 : 1.12};overflow:hidden;overflow-wrap:normal;word-break:${lang === 'ko' ? 'keep-all' : lang === 'ja' ? 'auto-phrase' : 'normal'};flex:none}
  .t.quad .in{display:flex;flex-direction:column;align-items:${RTL.has(lang) ? 'flex-end' : 'flex-start'};text-align:${RTL.has(lang) ? 'right' : 'left'}}
  .in{max-width:100%}
  .t.quad b{display:block;font-weight:inherit;margin-bottom:.35em}
  .t.quad span{display:block;font-weight:500;font-size:.8em;color:#27324a}
  </style></head><body><div id="c">${els}</div></body></html>`;
}

const fit = () => {
  for (const el of document.querySelectorAll('.t')) {
    const inn = el.querySelector('.in');
    const max = Number(el.dataset.max);
    const fits = () => inn.offsetHeight <= el.clientHeight + 0.5 && inn.scrollWidth <= el.clientWidth + 0.5;
    const shrink = (floor) => { let s = max; el.style.fontSize = s + 'px'; while (s > floor && !fits()) { s -= 0.5; el.style.fontSize = s + 'px'; } return fits(); };
    if (el.dataset.one) { inn.style.whiteSpace = 'nowrap'; if (shrink(max * 0.66)) continue; inn.style.whiteSpace = ''; }
    shrink(9);
  }
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  const langs = only.length ? only : Object.keys(text);
  for (const lang of langs) {
    fs.mkdirSync(`${OUT}/${lang}`, { recursive: true });
    for (const img of Object.keys(specs)) {
      const [W, H] = specs[img].size;
      await p.setViewportSize({ width: W, height: H });
      const f = `${D}/render_${lang}_${img}.html`;
      fs.writeFileSync(f, page(img, lang));
      await p.goto('file://' + f);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(150);
      await p.evaluate(fit);
      await p.evaluate(() => document.fonts.ready);
      await p.locator('#c').screenshot({ path: `${OUT}/${lang}/${img}.png` });
      fs.unlinkSync(f);
    }
    console.log('done', lang);
  }
  await b.close();
})();
