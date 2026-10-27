# Likeable Person Test: Futuristic Redesign Plan

Target: https://likeable-person-test.com/
Analysis date: 2026-10-27

---

## 1. What the site is today (audit)

### 1.1 Stack
| Layer | Current |
|---|---|
| CMS / theme | WordPress 7.1.3, Kadence theme 1.5.2, Kadence Blocks + Kadence Blocks Pro 3.8 |
| SEO | All in One SEO 5.0.4 (Article, WebPage, Organization schema) |
| Consent | CookieAdmin 1.2.6 |
| Performance layer | A "bv" optimizer plugin. It inlines about 320 KB of CSS and **holds back scripts and non-critical styles until the user interacts**, or until 7 s on desktop / 12 s on mobile. |
| CDN | Cloudflare |
| Analytics | GA4 (`G-KZTXC78Q70`) |
| Fonts / palette | DM Serif Display + Work Sans; navy `#1A202C`, indigo `#1C0D5A`, blues `#295CFF` / `#0E94FF`, orange accent `#f76a0c` |

### 1.2 Measured (headless Chromium, 1440×900 and 390×844)
- 33 requests, about 190 KB transferred on first load. The weight is fine; the problems are structural.
- **Before any interaction the page renders 72,736 px tall.** The footer social icons and the arrow SVGs blow up to the full column width, and big empty gaps open up, because the delayed CSS has not loaded yet. After a mouse move and a scroll the page falls back to **16,023 px**. Any visitor who doesn't interact, or a crawler that doesn't wait, sees the broken version for the first 7–12 s.
- CLS after interaction: **0.081**. That is close to the 0.1 "needs improvement" line.
- Mobile (390×844): the **main "Take the test" CTA sits below the fold**, and the cookie banner covers about 45 % of the first screen.

### 1.3 Product and quiz
- The quiz is plain JS inline in the page, and **the code is there twice**: `questions` and `lptQuestions`, about 13 KB each. Only `lptStartTest()` is hooked up, so the other copy is dead code.
- The hero quiz card ("Question 7 of 25 … Empathy Score 82%") is a static preview. The real quiz is a separate section further down. Two quiz surfaces split attention.
- **Scoring flaws that make the result feel cheap:**
  - Every item uses the same 4-point scale, with the most desirable answer always first. Clicking option 1 25 times gives 100 %.
  - No item is reverse-keyed and there is no consistency check, so the copy's claim that the test "detects contradictions" is not true today.
  - The lowest possible score is 25 %, because the scale runs 4→1, not 4→0.
- Results are thrown away. There is no result URL, no saved state, no share image, no comparison, and no reason to come back. The only post-result actions are "Download Report" and "Take the Test Again".

### 1.4 Content and SEO
- About 3,700 words in about 22 H2 sections, many with keyword-stacked headings ("Am I a Good Person?", "Friendliness Test", "Popular Person Test", "Good Person Test"). It reads as an SEO page with a quiz attached, not a product.
- The FAQ section has no `FAQPage` schema. There is no `Quiz`/`WebApplication` schema either.
- A blog of 5+ posts lives on the same page with pagination.

### 1.5 Summary
The core idea is strong: it is free, takes 5 minutes, needs no login, and covers 9 dimensions. The weak points are:
- the experience before interaction is broken
- the quiz results don't feel believable
- nothing about a result is shareable or worth coming back to
- the page reads as an SEO document rather than a product

The redesign should put **the test and its result** at the centre and use 3D and motion to make the result feel personal and worth sharing.

---

## 2. Design concept: "Social Orbit"

One visual idea runs through the whole site, so the 3D work has a reason to exist:

> **You are a glowing core. Nine orbiting "dimension" spheres (First Impressions, Communication, Positivity, Empathy, Emotional Intelligence, Kindness, Reliability, Trustworthiness, Social Skills) circle you. Each answer pulls a sphere closer and changes its light. At the end, the shape is your result: a unique 3D "Likeability Aura" that only you have.**

- **Look:** a deep-space indigo base (keep `#1C0D5A` and `#1A202C`), electric blue (`#295CFF`), and a warm orange accent (`#f76a0c`) reserved for "human warmth" moments. Surfaces are glassmorphism panels with a subtle grain. The fonts stay: DM Serif Display for emotional headlines, Work Sans for UI, plus a mono face for numbers and stats.
- **Motion language:** physical and springy (`cubic-bezier(.2,.8,.2,1)`, spring damping around 0.7). Things drop in from depth on the Z axis instead of fading in on Y. Every motion means something: it shows progress, cause and effect, or a reward.

---

## 3. Page architecture and scroll storyboard

Each block below is a section, with its 3D or motion treatment. "Drop scroll" means the section is pinned while elements fall in from the Z axis (perspective 1200px, `translateZ(-800px) → 0` with blur and opacity) on a scroll-scrubbed timeline.

| # | Section | 3D / motion treatment | Purpose |
|---|---|---|---|
| 0 | **Preloader (≤600 ms, first visit only)** | The core sphere ignites and the 9 dots snap into orbit. It can be skipped and is never shown on return visits. | Brand moment |
| 1 | **Hero** | Full-viewport WebGL scene: an iridescent core with a fresnel and noise shader, 9 orbiting spheres, and a cursor/gyroscope parallax. The headline appears word by word, masked. One primary CTA above the fold on **every** viewport, plus the "25 questions · 9 dimensions · 5 min" stats as small counters. | Get the visitor into the test |
| 2 | **"How it works": drop scroll** | Pinned for 3 steps. Three glass cards drop from depth one after another (Answer → Your aura forms → Share & compare). The orbit scene stays in the background and reacts. | Reduce uncertainty |
| 3 | **The 9 Dimensions: horizontal pinned track** | Vertical scroll drives horizontal movement. The camera flies from sphere to sphere, and each dimension gets a 3D micro-object (ear for Communication, shield for Trust, …), a one-line definition, and "what we measure". | Show depth and the science |
| 4 | **The Test: immersive mode** | See §4. It opens as a full-screen layer with a shared-element transition: the hero sphere expands into the quiz. | Core product |
| 5 | **The Science** | Scrollytelling: sticky visual left, text steps right. Includes animated stats and citations (warmth/competence research, the "liking gap", and so on). | Trust and E-E-A-T |
| 6 | **Archetype gallery** | 3D tilt cards (pointer-tracked, with specular highlight) for the 6–8 result archetypes. A card flips on hover or tap. | Curiosity: "which one am I?" |
| 7 | **Improve your score** | Accordion or tabs holding the current "12 habits" and "Practice for 2 weeks" content, linked to the 14-day challenge (§5). | Retention bridge |
| 8 | **Knowledge base (existing SEO copy)** | The current long-form content, rewritten and grouped into 4–5 well-structured articles or tabs. **Server-rendered, fully crawlable**, light motion only. | Keep rankings |
| 9 | **Blog** | Magnetic hover cards with an image parallax inside the card. | Content discovery |
| 10 | **FAQ** | Smooth height animation, with `FAQPage` JSON-LD. | SEO and objections |
| 11 | **Final CTA** | The orbit scene returns with the camera pulled back. "Your aura is waiting." | Conversion |

**Dynamic layouts:**
- A bento-grid system that rearranges by breakpoint and by state. After a visitor has a result, the home page puts **their** aura and score in the hero and swaps the CTA to "Compare with a friend" or "Continue your 14-day challenge".
- Container queries for components.
- Fluid type with `clamp()`.

---

## 4. The test: immersive quiz

- **One question per screen**, full-screen, with the 3D aura behind it. Choosing an answer moves the matching dimension sphere (closer/brighter or farther/dimmer) with a spring. The visitor *sees* their answer have an effect.
- **Input:** tap/click, keys `1`–`5` and `←`/`→`, and swipe on mobile. Auto-advance after 350 ms, with an undo. Optional haptics (`navigator.vibrate(8)`).
- **Progress:** an orbit ring fills instead of a flat bar. Small rewards at question 9 and question 18 ("Two dimensions unlocked", with a particle burst). They mark progress only; no fake comparisons.
- **Psychometric fixes**, which make the result feel believable and therefore worth sharing:
  - A 5-point frequency/agreement scale shown in a **neutral order**.
  - About 30 % **reverse-keyed** items (for example "I tend to steer conversations back to myself").
  - 1–2 **consistency pairs** to actually catch contradictions, as the copy already promises.
  - Score 0–100 per dimension, with percentiles once enough anonymised data has been collected.
  - Keep it at 25 items and about 5 minutes. The promise stays the same.
- **State:** answers persist in `localStorage`, so a reload resumes the test.
- **Results:** a signed, compact result ID (dimension scores encoded) lives in the URL, for example `/r/9fK2x`. A shareable result page needs no account.

### Results experience
1. A reveal sequence of about 3 s:
   - the screen dims
   - the 9 spheres fly into their final positions
   - the aura "crystallises"
   - the score counts up
   - the archetype name appears
2. A **3D radar/aura** the visitor can rotate, alongside an accessible 2D radar chart and a table.
3. **Archetype**, chosen from 6–8 types (for example "The Warm Anchor", "The Spark", "The Quiet Confidant"). Each gets a strengths paragraph, a blind spot, and 3 concrete habits.
4. **Share kit:**
   - an auto-generated OG image and a 1080×1920 story card (aura and archetype rendered on the server)
   - a native `navigator.share`
   - copy link
5. **"Rate me" (360° compare):** sends friends a 10-question "How likeable is *[name]*?" version. When they answer, the visitor sees "self vs. others" per dimension. **This is the main viral loop**, because every share brings in new visitors who then take their own test.
6. **14-day challenge** opt-in (see §5) and a "Retake in 14 days" reminder.
7. The PDF report stays, redesigned to match.

---

## 5. Engagement and retention ("addiction rate", done responsibly)

The aim is a high **completion rate, share rate, and return rate** that comes from value, not dark patterns. That matters more than usual for a self-esteem-adjacent product.

| Loop | Mechanism | Why it brings people back |
|---|---|---|
| **Viral** | Share card plus the "Rate me" friend version | Every share pulls in new test-takers |
| **Curiosity** | Archetype gallery: "you're 1 of 8" | People explore and send it to friends |
| **Progress** | 14-day challenge: one small daily social habit, a check-in with a streak orb that grows, optional email/push reminder | A reason to return each day |
| **Re-measure** | Retake after 14 days, showing the aura before and after | Shows that change happened |
| **Content** | Each weak dimension links to the relevant blog post | Session depth |

**Guardrails:**
- No fake "others are taking this now" counters.
- No invented percentiles.
- No locking results behind email.
- Low scores are framed constructively.
- A reduced-motion mode that keeps every feature.

---

## 6. Technical architecture (recommended)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Astro 5** (static/SSR) with React islands | Content-heavy SEO page plus a few interactive islands. Ships no JS for content by default. |
| 3D | **Three.js via React Three Fiber + drei**, custom GLSL for the aura | Mature, tree-shakeable, good DX |
| Scroll / motion | **GSAP + ScrollTrigger** for pinned and scrubbed sections; **Lenis** for smooth scroll; **Motion** (Framer Motion) for UI micro-interactions | Industry standard; ScrollTrigger handles the pin/drop sequences |
| Styling | Tailwind CSS v4 + CSS custom-property design tokens | Fast iteration, small CSS |
| CMS | Option A: **keep WordPress as a headless CMS** (WP REST/WPGraphQL) for the blog. Option B: migrate posts to MDX in the repo. Recommended: **B** if content updates are rare, otherwise **A**. | Separates the content team from the front end |
| Share images | Satori / `@vercel/og` (or a Cloudflare Worker) rendering aura and archetype per result ID | Social previews per result |
| Data | Cloudflare D1 / Supabase for anonymous aggregates (percentiles) and "Rate me" sessions | Small, cheap, privacy-friendly |
| Hosting | Cloudflare Pages (domain already on Cloudflare) | Edge, simple DNS |
| Analytics | GA4 (keep) plus custom events; optionally PostHog for funnels and A/B tests | Measure the loops |

### Performance budget (hard requirements)
- **LCP < 2.0 s on mobile 4G, INP < 200 ms, CLS < 0.05.**
- The hero LCP element is the **HTML headline**, not the canvas. The canvas fades in over a static poster image (AVIF) **after** LCP.
- Initial JS ≤ 90 KB gz. The 3D chunk (≤ 250 KB gz) loads on `requestIdleCallback`, or when the visitor starts the test.
- Cap DPR at 1.5. Pause `requestAnimationFrame` when off-screen or when the tab is hidden. Use instanced meshes, a single draw call for particles, and baked environment maps.
- **Tiered quality:** detect GPU class (`detect-gpu`). Low tier or no WebGL gets a CSS/2D fallback. `prefers-reduced-motion` gets static scenes, no pinning, and instant transitions.
- No "delay all CSS until interaction" hacks. Critical CSS is inlined by the build, and everything renders correctly without interaction. This removes the 72k-px pre-interaction layout.

### Accessibility
- All quiz controls are real `<button>`/radio elements with labels, visible focus, and keyboard support.
- An ARIA live region announces progress and results.
- Every 3D visual has a text/table equivalent. Colour contrast is AA on glass surfaces.
- Pinned sections can be skipped with a keyboard skip link, and focus never gets trapped in scroll-jacked areas.

### SEO preservation
- **Keep every existing URL** (home, `/guide`, `/test-results`, blog slugs, privacy, terms). Add 301s for anything that changes.
- Keep titles, meta descriptions, canonical tags, and OG data. Rewrite the keyword-stacked H2s to natural headings that still cover the same queries.
- Add `FAQPage`, `Quiz` (or `WebApplication`), and `BreadcrumbList` JSON-LD.
- Result pages `/r/*` are `noindex`, but still have OG tags for sharing.
- Before launch: crawl old vs. new (Screaming Frog), diff indexable content, and check rankings for 4 weeks after.

---

## 7. Phased roadmap

| Phase | Duration | Deliverables |
|---|---|---|
| **0: Quick wins on the current WordPress site** | 3–5 days | See §8. Ships value right away and sets the analytics baseline. |
| **1: Design** | 1.5–2 weeks | Moodboard, design tokens, Figma for hero, quiz, results, and archetypes; motion spec (durations/easings per interaction); 3D look-dev in a sandbox. |
| **2: Prototype** | 1 week | Working hero orbit scene plus a 5-question quiz with live aura and result reveal. Measure on a mid-range Android (Moto G class) **before** building more. |
| **3: Core build** | 3–4 weeks | Astro site, all sections, full quiz with new scoring, results page, share images, content migration, SEO parity, accessibility pass. |
| **4: Loops** | 2 weeks | "Rate me" friend flow, 14-day challenge with reminders, retake comparison, anonymous percentiles. |
| **5: Launch and optimise** | 1 week, then ongoing | Staged rollout (for example 20 % traffic via Cloudflare), A/B tests (CTA copy, reveal length, share prompt timing), CWV monitoring. |

That is about 9–11 weeks total for one senior front-end/creative developer plus one designer. Add about 30 % if the blog stays on headless WordPress.

---

## 8. Phase 0 quick wins (current site, no rebuild)

1. **Fix the pre-interaction layout:**
   - Give footer/social and arrow SVGs explicit `width`/`height` attributes.
   - Exclude theme/Kadence layout CSS from the optimizer's delay list, so the page renders correctly before any input.
2. **Mobile above the fold:**
   - Shorten the hero paragraph on small screens so the CTA is visible at 390×844.
   - Switch the cookie banner to a compact bottom bar.
3. **One quiz surface:** make the hero card start the real quiz in place, or scroll to it with the first question already shown.
4. **Remove the dead duplicate quiz script** (`questions` / `startTest`); only `lptStartTest` is wired.
5. **Scoring:** shuffle or neutralise option order, add reverse-keyed items, and rescale so the range is 0–100.
6. **Add `FAQPage` schema** for the existing FAQ.
7. **Instrument the funnel in GA4:**
   - `quiz_start`
   - `quiz_question_answered` (with index)
   - `quiz_complete`
   - `result_download`
   - `result_retake`
   - `share_click`

   This gives the baseline every later phase is judged against.

---

## 9. KPIs

| Metric | Baseline (set in Phase 0) | Target after relaunch |
|---|---|---|
| Visit → quiz start | measure | +40 % relative |
| Start → completion | measure | ≥ 75 % |
| Completion → share | ~0 (no share feature) | ≥ 12 % |
| Viral coefficient (new test-takers per completion) | ~0 | ≥ 0.3 |
| 7-day return rate | measure | ≥ 15 % (challenge + retake) |
| Pages / session | measure | +25 % |
| Mobile LCP / INP / CLS (p75, CrUX) | CLS ≈ 0.08 lab | < 2.0 s / < 200 ms / < 0.05 |
| Organic clicks (GSC) | measure | no drop > 5 % in 4 weeks after launch |

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| 3D hurts performance on low-end phones and therefore SEO | Poster-first LCP, lazy 3D chunk, GPU tiering, Phase 2 device gate |
| Scroll-jacking annoys users or hurts accessibility | Pin only 2–3 sections, always allow native scroll speed, disable under reduced motion |
| Ranking loss during migration | URL parity, content diff, staged rollout, GSC monitoring |
| "Rate me" misuse (harassment) | Friends answer only fixed positive-framed items; no free-text; owner can delete the session |
| Scope creep in visuals | One concept (Social Orbit) reused everywhere; motion spec signed off in Phase 1 |

---

## 11. Proposed repo layout (for the rebuild in this repo)

```
likeable/
├─ docs/REDESIGN_PLAN.md
├─ src/
│  ├─ pages/            index.astro, guide.astro, test-results.astro, r/[id].astro, blog/[slug].astro
│  ├─ components/
│  │  ├─ three/         OrbitScene.tsx, AuraMaterial.ts (GLSL), DimensionSphere.tsx
│  │  ├─ quiz/          Quiz.tsx, QuestionCard.tsx, useQuizState.ts, scoring.ts
│  │  ├─ results/       Reveal.tsx, RadarChart.tsx, ShareKit.tsx
│  │  └─ sections/      Hero, HowItWorks (drop scroll), Dimensions, Science, Archetypes, FAQ
│  ├─ content/          questions.json, archetypes.json, blog/*.mdx
│  ├─ lib/              motion.ts (GSAP/Lenis setup), gpuTier.ts, analytics.ts
│  └─ styles/           tokens.css
├─ functions/           og/[id].ts (share image), rate-me API
└─ tests/               scoring.test.ts, e2e quiz flow (Playwright), Lighthouse CI budget
```
