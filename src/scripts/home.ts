import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initQuiz, type Question } from './quiz';
import { prefersReducedMotion } from './motion';
import questions from '../data/questions.json';
import type { Orbit } from './orbit';

type Mode = 'hero' | 'content' | 'quiz' | 'result';

export function initHome() {
  const reduced = prefersReducedMotion();
  const canvas = document.querySelector<HTMLCanvasElement>('[data-orbit]')!;
  const quizSection = document.querySelector<HTMLElement>('[data-quiz-section]')!;
  const quizRoot = quizSection.querySelector<HTMLElement>('[data-quiz]')!;

  // ---- 3D orbit: loaded after first paint so the headline stays the LCP element.
  let orbit: Orbit | null = null;
  const pending: { scores: number[] | null; mode: Mode; scroll: number; progress: number } = { scores: null, mode: 'hero', scroll: 0, progress: 0 };
  const call = (fn: (o: Orbit) => void) => orbit && fn(orbit);
  const setMode = (m: Mode) => {
    pending.mode = m;
    document.body.dataset.orbitMode = m;
    call((o) => o.setMode(m));
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
        orbit = createOrbit(canvas, { reduced });
        orbit.setScroll(pending.scroll);
        orbit.setMode(pending.mode);
        orbit.setProgress(pending.progress);
        if (pending.scores) orbit.setScores(pending.scores);
        requestAnimationFrame(() => document.body.classList.add('orbit-ready'));
      });
    if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 1200 });
    else setTimeout(boot, 300);
  }

  // ---- Quiz ↔ orbit
  let quizState: 'start' | 'run' | 'result' = 'start';
  initQuiz(quizRoot, questions as Question[], {
    onStart() {
      quizState = 'run';
      setMode('quiz');
    },
    onAnswer(ci, scores, progress) {
      pending.scores = scores;
      pending.progress = progress;
      call((o) => {
        o.setScores(scores);
        o.setProgress(progress);
        if (ci >= 0) o.pulse(ci);
      });
    },
    onResult(scores) {
      quizState = 'result';
      pending.scores = scores;
      call((o) => o.setScores(scores));
      setMode('result');
    },
    onReset() {
      pending.scores = Array(9).fill(-1);
      call((o) => o.setScores(pending.scores!));
    },
  });

  // ---- Hero stat counters (no-JS markup already shows final values)
  if (!reduced) {
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count);
      const obj = { v: 0 };
      gsap.to(obj, { v: to, duration: 1.6, delay: 0.6, ease: 'power3.out', onUpdate: () => (el.textContent = String(Math.round(obj.v))) });
    });
  }

  if (reduced) {
    // Mode switching still follows the reader, just without scroll-linked motion.
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setMode(quizState === 'result' ? 'result' : 'quiz');
    }, { threshold: 0.35 });
    io.observe(quizSection);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance: lines rise out of depth.
  gsap.from('[data-hero-in]', { y: 60, z: -200, rotateX: 25, opacity: 0, filter: 'blur(12px)', transformPerspective: 1000, duration: 1.4, stagger: 0.12, ease: 'expo.out', delay: 0.1, clearProps: 'filter,transform' });

  // Hero scroll: the core drops back into space, the copy lifts away.
  ScrollTrigger.create({
    trigger: '[data-hero]',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (st) => {
      pending.scroll = st.progress;
      call((o) => o.setScroll(st.progress));
    },
  });
  gsap.to('.hero__content', { yPercent: -18, opacity: 0.1, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });

  // Orbit mode follows the section in view.
  ScrollTrigger.create({
    trigger: '[data-hero]',
    start: 'top top',
    end: 'bottom 40%',
    onLeave: () => quizState === 'start' && setMode('content'),
    onEnterBack: () => setMode('hero'),
  });
  ScrollTrigger.create({
    trigger: quizSection,
    start: 'top 55%',
    end: 'bottom 45%',
    onToggle: (st) => setMode(st.isActive ? (quizState === 'result' ? 'result' : 'quiz') : st.direction < 0 && st.start > scrollY ? 'hero' : 'content'),
  });

  const mm = gsap.matchMedia();

  // How-it-works: pinned stage, cards fall in from deep Z one after another.
  mm.add('(min-width: 900px)', () => {
    const cards = gsap.utils.toArray<HTMLElement>('[data-drop-card]');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '[data-drop]', start: 'top top', end: '+=180%', pin: '.drop-section__pin', scrub: 0.8, anticipatePin: 1 },
    });
    tl.from('.drop-section__head', { opacity: 0, y: 60, duration: 0.5 });
    cards.forEach((card, i) => {
      tl.fromTo(
        card,
        { z: -1600, y: -260, rotateX: 70, rotateZ: (i - 1) * 12, opacity: 0, transformPerspective: 1400 },
        { z: 0, y: 0, rotateX: 0, rotateZ: 0, opacity: 1, duration: 1, ease: 'power3.out' },
        i * 0.7 + 0.3,
      );
    });
    tl.to(cards, { y: (i) => (i - 1) * -14, duration: 0.6 }, '+=0.2');
  });
  mm.add('(max-width: 899px)', () => {
    gsap.utils.toArray<HTMLElement>('[data-drop-card]').forEach((card) =>
      gsap.from(card, { z: -500, rotateX: 45, opacity: 0, y: 80, transformPerspective: 1000, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 88%' } }),
    );
  });

  // Nine dimensions: vertical scroll drives a horizontal track (desktop).
  mm.add('(min-width: 900px)', () => {
    const section = document.querySelector<HTMLElement>('[data-dims-section]')!;
    section.classList.add('dims-pinned');
    const track = document.querySelector<HTMLElement>('[data-dims-track]')!;
    const distance = () => track.scrollWidth - innerWidth + 80;
    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: { trigger: '[data-dims-section]', start: 'top top', end: () => `+=${distance()}`, pin: '.dims-section__pin', scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    gsap.fromTo('.dim-card', { rotateY: -40, z: -400, opacity: 0, transformPerspective: 1200 }, {
      rotateY: 0, z: 0, opacity: 1, stagger: 0.07, duration: 1.2, ease: 'expo.out', clearProps: 'transform',
      scrollTrigger: { trigger: '[data-dims-section]', start: 'top 70%' },
    });
    return () => section.classList.remove('dims-pinned');
  });

  // Dynamic two-column layouts: columns drift at different speeds.
  mm.add('(min-width: 900px)', () => {
    gsap.utils.toArray<HTMLElement>('.home-content .lpt-two-col').forEach((row) => {
      const [a, b] = row.children as unknown as HTMLElement[];
      if (a) gsap.fromTo(a, { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } });
      if (b) gsap.fromTo(b, { y: 140 }, { y: -80, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  // Pillar and tip grids drop in like falling cards.
  gsap.utils.toArray<HTMLElement>('.lpt-pillars-grid, .lpt-tips-grid, .lpt-unlikable-cards, .lpt-features-grid').forEach((grid) => {
    const items = grid.children;
    gsap.fromTo(items, { z: -900, y: -120, rotateX: 55, opacity: 0, transformPerspective: 1300 }, {
      z: 0, y: 0, rotateX: 0, opacity: 1, stagger: 0.12, duration: 1.3, ease: 'expo.out', clearProps: 'transform',
      scrollTrigger: { trigger: grid, start: 'top 85%' },
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
}
