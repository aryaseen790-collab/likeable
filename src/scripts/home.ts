import { initQuiz, type Question } from './quiz';
import { prefersReducedMotion } from './motion';
import questions from '../data/questions.json';
import type { Orbit, Theme } from './orbit';

type Slot = 'hero' | 'quiz' | 'result';

export function initHome() {
  const reduced = prefersReducedMotion();
  const canvas = document.querySelector<HTMLCanvasElement>('[data-orbit]')!;
  const slots = Object.fromEntries(
    [...document.querySelectorAll<HTMLElement>('[data-orbit-slot]')].map((el) => [el.dataset.orbitSlot, el]),
  ) as Record<Slot, HTMLElement>;
  const quizRoot = document.querySelector<HTMLElement>('[data-quiz]')!;
  const theme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  // ---- 3D orbit: one WebGL canvas, loaded after first paint, moved between panels.
  let orbit: Orbit | null = null;
  let pendingScores: number[] | null = null;
  let mode: 'idle' | 'quiz' | 'result' = 'idle';
  const moveTo = (slot: Slot) => {
    const target = slots[slot];
    if (!target || canvas.parentElement === target) return;
    canvas.parentElement?.classList.remove('has-canvas');
    target.appendChild(canvas);
    if (orbit) target.classList.add('has-canvas');
  };
  let booted = false;
  const onFirstInteraction = (fn: () => void) => {
    const events = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'scroll', 'keydown'];
    const go = () => {
      events.forEach((e) => removeEventListener(e, go));
      if (!booted) {
        booted = true;
        fn();
      }
    };
    events.forEach((e) => addEventListener(e, go, { passive: true, once: true }));
  };
  const webgl = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  })();
  if (webgl) {
    const boot = () =>
      import('./orbit').then(({ createOrbit }) => {
        orbit = createOrbit(canvas, { reduced, theme: theme() });
        orbit.setMode(mode);
        if (pendingScores) orbit.setScores(pendingScores);
        canvas.parentElement?.classList.add('has-canvas');
      });
    // Three.js is ~130 KB gz: wait for the visitor's first interaction so it never
    // competes with the first paint. Until then the static CSS emoji orbit shows.
    onFirstInteraction(boot);
  }
  addEventListener('themechange', () => orbit?.setTheme(theme()));

  const setMode = (m: typeof mode) => {
    mode = m;
    orbit?.setMode(m);
  };

  initQuiz(quizRoot, questions as Question[], {
    onStart() {
      moveTo('quiz');
      setMode('quiz');
    },
    onAnswer(ci, scores) {
      pendingScores = scores;
      orbit?.setScores(scores);
      if (ci >= 0) orbit?.pulse(ci);
    },
    onResult(scores) {
      pendingScores = scores;
      moveTo('result');
      orbit?.setScores(scores);
      setMode('result');
    },
    onReset() {
      pendingScores = Array(9).fill(-1);
      orbit?.setScores(pendingScores);
    },
  });

  // ---- "Take the test" links land on the quiz card; put focus on its Start
  // button too, so keyboard and screen-reader users are on the real control.
  const focusStart = () => {
    if (quizRoot.dataset.state !== 'start') return;
    setTimeout(() => quizRoot.querySelector<HTMLButtonElement>('[data-action="start"]')?.focus({ preventScroll: true }), 450);
  };
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href$="#take-test"]');
    if (a && a.pathname === location.pathname) focusStart();
  });
  if (location.hash === '#take-test') focusStart();

  // ---- Hero stat counters (markup already shows final values without JS)
  if (!reduced) {
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count);
      const t0 = performance.now() + 300;
      const tick = (now: number) => {
        const p = Math.max(0, Math.min(1, (now - t0) / 1200));
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
}
