// Lightweight motion: native scrolling, IntersectionObserver reveals (CSS
// transitions on transform/opacity only), rAF-throttled hover tilt, TOC
// scroll-spy and a reading-progress bar. Nothing runs per scroll frame except
// one transform on the progress bar.

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

// Elements that fade/rise in when scrolled into view.
const REVEAL_AUTO = '.prose > h2, .prose > figure, .prose > .cta-box, .prose > blockquote, .post-card, .lpt-dim-card, .lptr-score-card, .lptr-cat-item';
const TILT_SELECTOR = '[data-tilt]';

// Scroll an element to just below the sticky header.
export function scrollToEl(el: HTMLElement) {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - header - 12, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function initMotion() {
  initScrollProgress();
  initTocSpy();
  if (prefersReducedMotion()) return;
  initReveals();
  if (finePointer()) initTilt();
}

export function initReveals(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(REVEAL_AUTO).forEach((el) => el.hasAttribute('data-reveal') || el.setAttribute('data-reveal', ''));
  if (!('IntersectionObserver' in window)) return;
  // Leave anything already on screen alone; only hide what starts below the fold.
  const fold = innerHeight;
  const els = [...root.querySelectorAll<HTMLElement>('[data-reveal]:not(.reveal-pending)')].filter((el) => el.getBoundingClientRect().top > fold);
  els.forEach((el) => el.classList.add('reveal-pending'));
  requestAnimationFrame(() => els.forEach((el) => el.classList.add('reveal-ready')));
  const io = new IntersectionObserver(
    (entries) => {
      let i = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(i++, 5) * 70}ms`);
        el.classList.remove('reveal-pending');
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

function initTilt() {
  document.querySelectorAll<HTMLElement>(TILT_SELECTOR).forEach((card) => {
    const max = Number(card.dataset.tiltMax || 6);
    let raf = 0;
    let px = 0.5;
    let py = 0.5;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        card.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`);
      });
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
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
  const byId = new Map<string, HTMLAnchorElement[]>();
  for (const a of links) {
    const id = decodeURIComponent(a.hash.slice(1));
    byId.set(id, [...(byId.get(id) ?? []), a]);
  }
  const headings = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  const visible = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id);
      const current = headings.find((h) => visible.has(h.id)) ?? headings.filter((h) => h.getBoundingClientRect().top < 120).pop();
      links.forEach((a) => a.classList.remove('is-active'));
      if (current) byId.get(current.id)?.forEach((a) => a.classList.add('is-active'));
    },
    { rootMargin: '-90px 0px -65% 0px' },
  );
  headings.forEach((h) => io.observe(h));
}
