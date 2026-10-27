// The Likeable Person Test. Questions, scoring and feedback copy are the same
// as the original WordPress quiz; the experience around them is new.
import { scrollToEl } from './motion';

export type Question = { text: string; options: string[]; hook: string; category: string };
export type QuizHooks = {
  onStart?(): void;
  onAnswer?(categoryIndex: number, scores: number[], progress: number): void;
  onResult?(scores: number[]): void;
  onReset?(): void;
};

export const CATEGORIES = ['First Impressions', 'Communication', 'Positivity', 'Empathy', 'Emotional Intelligence', 'Kindness', 'Reliability', 'Trustworthiness', 'Social Skills'];
const COLORS = ['#22b8e6', '#4f73ff', '#f5b301', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#f76a0c', '#d946ef'];
// '/' in production; '/likeable/' on the GitHub Pages preview.
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const LEARN_MORE: Record<string, string> = {
  'First Impressions': '/how-to-make-a-great-first-impression/',
  Communication: '/how-to-be-more-likable/',
  'Social Skills': '/likeability-in-friendships/',
  Empathy: '/the-science-of-likeability-what-psychology-actually-says/',
  Positivity: '/am-i-likable-signs/',
};
const STORE = 'lpt-quiz-v1';

const overallBand = (overall: number) => {
  if (overall >= 90) return { label: '🌟 Exceptional!', feedback: 'You are extremely likeable! People naturally gravitate towards you. You possess outstanding social skills, genuine empathy, and a warm personality that makes others feel valued and appreciated.' };
  if (overall >= 80) return { label: '😊 Excellent!', feedback: 'You are very likeable! You have great interpersonal skills and people enjoy your company. You show genuine care for others and maintain positive relationships with ease.' };
  if (overall >= 70) return { label: '👍 Good!', feedback: "You are quite likeable! You have solid social skills and generally make a positive impression. People feel comfortable around you, though there's always room to grow your likability score." };
  if (overall >= 60) return { label: '🙂 Above Average!', feedback: 'You have a decent level of likability. You get along well with most people, but enhancing your listening skills and empathy could make you even more approachable.' };
  if (overall >= 50) return { label: '😐 Average', feedback: 'You have moderate likability. Working on your social skills, positivity, and showing more genuine interest in others would significantly improve how people perceive you.' };
  return { label: '💪 Needs Work', feedback: 'You have significant room to grow in terms of likability. Focus on empathy, positivity, reliability, and communication. Everyone can improve their likeability score with intentional practice!' };
};
const categoryBand = (score: number) => {
  if (score >= 85) return { cls: 'excellent', feedback: 'Outstanding! You excel in this area.' };
  if (score >= 70) return { cls: 'good', feedback: "Great work! You're doing well here." };
  if (score >= 55) return { cls: 'average', feedback: 'Solid foundation. Room for improvement.' };
  return { cls: 'needs-improvement', feedback: 'Focus area. Work on developing this skill.' };
};

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

const track = (name: string, params: Record<string, unknown> = {}) => (window as any).gtag?.('event', name, params);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE) || 'null');
  } catch {
    return null;
  }
};
const save = (v: unknown) => {
  try {
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {}
};

export function initQuiz(root: HTMLElement, questions: Question[], hooks: QuizHooks = {}) {
  const N = questions.length;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const steps = { start: $('[data-step="start"]'), run: $('[data-step="run"]'), result: $('[data-step="result"]') };
  const el = {
    current: $('[data-current]'), total: $('[data-total]'), cat: $('[data-cat]'), hook: $('[data-hook]'), q: $('[data-q]'),
    options: $('[data-options]'), prev: $<HTMLButtonElement>('[data-prev]'), next: $<HTMLButtonElement>('[data-next]'),
    ring: $<HTMLElement>('[data-ring]'), card: $('[data-card]'), dims: $('[data-dims]'), resume: $<HTMLButtonElement>('[data-resume]'),
    overall: $('[data-overall]'), label: $('[data-label]'), feedback: $('[data-feedback]'), grid: $('[data-grid]'),
    radar: $('[data-radar]'), strength: $('[data-strength]'), focus: $('[data-focus]'), shareMsg: $('[data-share-msg]'),
    scoreRing: $<HTMLElement>('[data-score-ring]'),
  };
  el.total.textContent = String(N);

  let answers: (number | null)[] = Array(N).fill(null);
  let current = 0;
  let advanceTimer = 0;

  el.dims.innerHTML = CATEGORIES.map((c, i) => `<li style="--c:${COLORS[i]}" title="${c}"><span></span><em>${c}</em></li>`).join('');

  const saved = load();
  if (saved?.answers?.length === N && saved.answers.some((a: number | null) => a !== null) && !saved.done) {
    const n = saved.answers.filter((a: number | null) => a !== null).length;
    el.resume.hidden = false;
    el.resume.textContent = `Resume where you left off (${n}/${N})`;
  }

  function show(step: keyof typeof steps) {
    for (const [k, node] of Object.entries(steps)) node.hidden = k !== step;
    root.dataset.state = step;
  }

  function catScores() {
    return score(questions, answers).categories.map((c) => (c.score < 0 ? -1 : c.score / 100));
  }

  function render(dir = 1) {
    const q = questions[current];
    const ci = CATEGORIES.indexOf(q.category);
    el.current.textContent = String(current + 1);
    el.cat.textContent = q.category;
    el.cat.style.setProperty('--c', COLORS[ci]);
    el.hook.textContent = q.hook;
    el.q.textContent = q.text;
    el.options.innerHTML = q.options
      .map(
        (o, i) => `<button type="button" role="radio" class="quiz__option" aria-checked="${answers[current] === i}" data-i="${i}" tabindex="${(answers[current] ?? 0) === i ? 0 : -1}">
          <kbd aria-hidden="true">${i + 1}</kbd><span>${esc(o)}</span><i aria-hidden="true"></i></button>`,
      )
      .join('');
    const answered = answers.filter((a) => a !== null).length;
    el.ring.style.setProperty('--p', String(answered / N));
    el.prev.disabled = current === 0;
    el.next.disabled = answers[current] === null;
    el.next.textContent = current === N - 1 ? 'Get Results' : 'Next';
    root.querySelectorAll<HTMLElement>('[data-dims] li').forEach((li, i) => {
      const qs = questions.map((x, j) => ({ x, j })).filter(({ x }) => x.category === CATEGORIES[i]);
      const done = qs.filter(({ j }) => answers[j] !== null).length;
      li.style.setProperty('--fill', String(done / qs.length));
      li.classList.toggle('is-current', i === ci);
    });
    // Keep keyboard users in the quiz when the options are re-rendered.
    const active = document.activeElement;
    if (active === document.body || (active && root.contains(active) && active.classList.contains('quiz__option'))) {
      el.options.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true });
    }
    el.card.classList.remove('is-in', 'is-in-back');
    void el.card.offsetWidth;
    el.card.classList.add(dir >= 0 ? 'is-in' : 'is-in-back');
  }

  function persist(done = false) {
    save({ answers, current, done });
  }

  function select(i: number) {
    answers[current] = i;
    persist();
    el.options.querySelectorAll<HTMLElement>('.quiz__option').forEach((b, j) => {
      b.setAttribute('aria-checked', String(j === i));
      b.tabIndex = j === i ? 0 : -1;
    });
    el.next.disabled = false;
    const ci = CATEGORIES.indexOf(questions[current].category);
    const answered = answers.filter((a) => a !== null).length;
    el.ring.style.setProperty('--p', String(answered / N));
    hooks.onAnswer?.(ci, catScores(), answered / N);
    navigator.vibrate?.(8);
    track('quiz_question_answered', { question: current + 1 });
    clearTimeout(advanceTimer);
    advanceTimer = window.setTimeout(next, 420);
  }

  function next() {
    clearTimeout(advanceTimer);
    if (answers[current] === null) return;
    if (current < N - 1) {
      current++;
      persist();
      render(1);
    } else finish();
  }
  function prev() {
    clearTimeout(advanceTimer);
    if (current > 0) {
      current--;
      render(-1);
    }
  }

  function start(resume = false) {
    if (resume && saved) {
      answers = saved.answers;
      current = Math.min(saved.current ?? 0, N - 1);
    } else {
      answers = Array(N).fill(null);
      current = 0;
    }
    show('run');
    render(1);
    hooks.onStart?.();
    hooks.onAnswer?.(-1, catScores(), answers.filter((a) => a !== null).length / N);
    track('quiz_start', { resume });
    requestAnimationFrame(() => scrollToEl(root));
    setTimeout(() => el.options.querySelector<HTMLElement>('.quiz__option')?.focus({ preventScroll: true }), 500);
  }

  function radar(cats: { name: string; score: number }[]) {
    const cx = 160;
    const cy = 160;
    const R = 118;
    const pt = (i: number, r: number) => {
      const a = -Math.PI / 2 + (i / cats.length) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${cats.map((_, i) => pt(i, R * f).join(',')).join(' ')}" class="radar__ring"/>`).join('');
    const spokes = cats.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="radar__spoke"/>`).join('');
    const shape = cats.map((c, i) => pt(i, (R * Math.max(c.score, 4)) / 100).join(',')).join(' ');
    const dots = cats.map((c, i) => `<circle cx="${pt(i, (R * c.score) / 100)[0]}" cy="${pt(i, (R * c.score) / 100)[1]}" r="4" fill="${COLORS[i]}"/>`).join('');
    const labels = cats
      .map((c, i) => {
        const [x, y] = pt(i, R + 22);
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
        return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle">${c.name.replace('Emotional Intelligence', 'Emotional IQ')}</text>`;
      })
      .join('');
    el.radar.innerHTML = `<svg viewBox="-70 -10 460 340" role="img" aria-label="Radar chart of your nine category scores">
      <defs><linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b84ff" stop-opacity=".55"/><stop offset="1" stop-color="#e879f9" stop-opacity=".35"/></linearGradient></defs>
      ${rings}${spokes}<polygon points="${shape}" class="radar__shape" fill="url(#radarFill)"/>${dots}${labels}</svg>`;
  }

  function showResult(fromShare = false) {
    const { overall, categories } = score(questions, answers);
    const band = overallBand(overall);
    show('result');
    root.dataset.shared = String(fromShare);
    el.label.textContent = band.label;
    el.feedback.innerHTML = `<h3>Your Likability Test Overall Assessment</h3><p>${band.feedback}</p>`;
    el.grid.innerHTML = categories
      .map((c, i) => {
        const b = categoryBand(c.score);
        return `<div class="lpt-category-card" style="--c:${COLORS[i]}">
          <div class="lpt-category-header"><div class="lpt-category-name">${c.name}</div><div class="lpt-category-score">${c.score}%</div></div>
          <div class="lpt-category-bar"><div class="lpt-category-bar-fill ${b.cls}" style="--w:${c.score / 100}"></div></div>
          <div class="lpt-category-feedback">${b.feedback}</div></div>`;
      })
      .join('');
    radar(categories);
    const sorted = [...categories].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const low = sorted[sorted.length - 1];
    el.strength.innerHTML = `<b>${top.name}</b> <span>${top.score}%</span>`;
    el.focus.innerHTML = `<b>${low.name}</b> <span>${low.score}%</span>${LEARN_MORE[low.name] ? ` <a href="${BASE}${LEARN_MORE[low.name].slice(1)}">How to improve →</a>` : ''}`;
    countUp(overall);
    requestAnimationFrame(() => root.classList.add('has-result'));
    hooks.onResult?.(categories.map((c) => c.score / 100));
    if (!fromShare) {
      persist(true);
      track('quiz_complete', { score: overall });
    }
    setTimeout(() => scrollToEl(root), 60);
  }

  function countUp(target: number) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const dur = reduce ? 0 : 1800;
    const tick = (now: number) => {
      const p = dur ? Math.min(1, (now - t0) / dur) : 1;
      const v = Math.round(target * (1 - Math.pow(1 - p, 4)));
      el.overall.textContent = `${v}%`;
      el.scoreRing.style.setProperty('--p', String(v / 100));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function finish() {
    showResult(false);
  }

  function reset() {
    answers = Array(N).fill(null);
    current = 0;
    persist(false);
    root.classList.remove('has-result');
    hooks.onReset?.();
    track('quiz_retake');
    history.replaceState(null, '', location.pathname + '#take-test');
    start(false);
  }

  const shareUrl = () => `${location.origin}${BASE}?r=${answers.map((a) => a ?? 0).join('')}#take-test`;

  async function share() {
    const { overall } = score(questions, answers);
    const data = { title: 'My Likeable Person Test result', text: `I scored ${overall}% on the free Likeable Person Test. How likeable are you?`, url: shareUrl() };
    track('share_click', { method: 'navigator' in window && 'share' in navigator ? 'native' : 'copy' });
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      return;
    }
    copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      el.shareMsg.textContent = 'Link copied — send it to a friend!';
    } catch {
      el.shareMsg.textContent = shareUrl();
    }
    track('share_click', { method: 'copy' });
  }

  function downloadReport() {
    const { overall, categories } = score(questions, answers);
    const band = overallBand(overall);
    const date = new Date().toLocaleDateString();
    const line = '═══════════════════════════════════════════════════════';
    const thin = '─────────────────────────────────────────────────────';
    let report = `\n${line}\n        ✨ LIKEABLE PERSON TEST RESULTS ✨\n${line}\n\nDate: ${date}\nOverall Likability Score: ${overall}%\nRating: ${band.label}\n\nOVERALL ASSESSMENT\n${thin}\n${band.feedback}\n\n${line}\n        📊 DETAILED CATEGORY BREAKDOWN\n${line}\n\n`;
    categories.forEach((c) => {
      report += `\n${c.name.toUpperCase()}\nScore: ${c.score}%\n${categoryBand(c.score).feedback}\n${thin}\n`;
    });
    report += `\n${line}\n        💡 RECOMMENDATIONS\n${line}\n\n`;
    [...categories]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .forEach((c, i) => {
        report += `${i + 1}. ${c.name}: Work on improving this area to boost your overall likability score.\n`;
      });
    report += `\n${line}\nThank you for taking the free Likeable Person Test!\nVisit us again to track your progress!\n${line}\n`;
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Likeable_Person_Test_Report_${date.replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    track('result_download');
  }

  // --- Events ----------------------------------------------------------------
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const opt = t.closest<HTMLElement>('.quiz__option');
    if (opt) return select(Number(opt.dataset.i));
    const action = t.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'start') start(false);
    if (action === 'resume') start(true);
    if (action === 'next') next();
    if (action === 'prev') prev();
    if (action === 'share') share();
    if (action === 'copy') copy();
    if (action === 'download') downloadReport();
    if (action === 'retry') reset();
  });
  document.addEventListener('keydown', (e) => {
    if (root.dataset.state !== 'run' || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    if (target !== document.body && !root.contains(target)) return;
    if (target.matches('input, textarea, select, [contenteditable]')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= questions[current].options.length) {
      e.preventDefault();
      select(n - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if ((e.target as HTMLElement).closest('.quiz__option') && e.key === 'Enter') return;
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const opts = [...el.options.querySelectorAll<HTMLElement>('.quiz__option')];
      const i = opts.indexOf(document.activeElement as HTMLElement);
      if (i < 0) return;
      e.preventDefault();
      opts[(i + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length].focus();
    }
  });
  // Swipe left/right between questions on touch screens.
  let sx = 0;
  let sy = 0;
  el.card.addEventListener('touchstart', (e) => ((sx = e.touches[0].clientX), (sy = e.touches[0].clientY)), { passive: true });
  el.card.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : prev();
  });

  // Shared result link: /?r=0123...
  const r = new URLSearchParams(location.search).get('r');
  if (r && r.length === N && /^[0-3]+$/.test(r)) {
    answers = [...r].map(Number);
    showResult(true);
  } else show('start');
}
