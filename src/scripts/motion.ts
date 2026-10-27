import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

// Scroll an element to just below the fixed header, through Lenis when it is running.
export function scrollToEl(el: HTMLElement) {
  const offset = -((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76) + 12);
  const l = (window as any).__lenis as Lenis | undefined;
  if (l) l.scrollTo(el, { offset, duration: 1.1 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

const TILT_SELECTOR = '[data-tilt], .post-card, .lpt-feature-card, .lpt-pillar-card, .lpt-tip-card, .lpt-signal-card, .lpt-dim-card, .lptr-score-card, .lpt-stat-box';
const REVEAL_SELECTOR = '[data-reveal], .lpt-animate-on-scroll, .prose > h2, .prose > figure, .prose > .cta-box, .prose > blockquote, .lpt-dim-card, .lptr-score-card, .lptr-cat-item';

export function initMotion() {
  (window as any).__motionReady = true;
  initScrollProgress();
  initTocSpy();
  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('js-motion');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.95 });
  (window as any).__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a || a.origin !== location.origin || a.pathname !== location.pathname || !a.hash) return;
    const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    lenis?.scrollTo(target, { offset: -90, duration: 1.4 });
    history.pushState(null, '', a.hash);
  });

  initReveals();
  initParallax();
  if (finePointer()) {
    initTilt();
    initMagnetic();
  }
  gsap.to(document.documentElement, {
    '--grid-shift': '-240px',
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: true },
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}

// Elements drop in from depth: pushed back on the Z axis, tilted, blurred.
function initReveals() {
  // Grids on the home page run their own drop-in timeline.
  const els = gsap.utils
    .toArray<HTMLElement>(REVEAL_SELECTOR)
    .filter((el) => !el.closest('[data-no-reveal]') && !el.matches('.lpt-pillars-grid > *, .lpt-tips-grid > *, .lpt-unlikable-cards > *, .lpt-features-grid > *'));
  gsap.set(els, { opacity: 0 });
  ScrollTrigger.batch(els, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { opacity: 0, y: 90, z: -380, rotateX: 16, filter: 'blur(10px)', transformPerspective: 1200, transformOrigin: '50% 100%' },
        { opacity: 1, y: 0, z: 0, rotateX: 0, filter: 'blur(0px)', duration: 1.25, ease: 'expo.out', stagger: 0.09, clearProps: 'filter' },
      ),
  });
}

function initParallax() {
  gsap.utils.toArray<HTMLElement>('.lpt-img-wrap img, [data-parallax] img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, {
      yPercent: 7, scale: 1.04, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  // Featured images tip forward out of the page as you scroll onto them.
  gsap.utils.toArray<HTMLElement>('[data-drop-3d]').forEach((el) => {
    gsap.fromTo(el, { rotateX: 28, scale: 0.86, y: 40, transformPerspective: 1400, opacity: 0.4 }, {
      rotateX: 0, scale: 1, y: 0, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 35%', scrub: 0.6 },
    });
  });
}

function initTilt() {
  document.querySelectorAll<HTMLElement>(TILT_SELECTOR).forEach((card) => {
    if (!card.querySelector(':scope > .glare')) {
      const glare = document.createElement('span');
      glare.className = 'glare';
      card.appendChild(glare);
    }
    card.setAttribute('data-tilt', '');
    const max = Number(card.dataset.tiltMax || 8);
    // Created on first hover so they never collide with entrance tweens.
    let rx: gsap.QuickToFunc | null = null;
    let ry: gsap.QuickToFunc | null = null;
    card.addEventListener('pointermove', (e) => {
      if (!rx || !ry) {
        gsap.set(card, { transformPerspective: 900 });
        rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
        ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
      }
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      rx((0.5 - py) * max);
      ry((px - 0.5) * max);
      card.style.setProperty('--gx', `${px * 100}%`);
      card.style.setProperty('--gy', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      rx?.(0);
      ry?.(0);
    });
  });
}

function initMagnetic() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.25);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

function initScrollProgress() {
  const bar = document.querySelector<HTMLElement>('.scroll-progress span');
  if (!bar) return;
  let raf = 0;
  const update = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--progress', String(max > 0 ? scrollY / max : 0));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  update();
}

function initTocSpy() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]')];
  if (!links.length) return;
  const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const headings = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  const visible = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id);
      const current = headings.find((h) => visible.has(h.id)) ?? headings.filter((h) => h.getBoundingClientRect().top < 120).pop();
      links.forEach((a) => a.classList.toggle('is-active', !!current && byId.get(current.id) === a));
    },
    { rootMargin: '-90px 0px -65% 0px' },
  );
  headings.forEach((h) => io.observe(h));
}
