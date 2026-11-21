# App screenshots in every language

`public/app/<lang>/screen-{1..4}.webp` (and `-390` copies) are the app's real screens
in each language: 1 home, 2 a question, 3 the result, 4 the per-dimension scores.
The homepage demo, the app section and the app page use them for that language
(`appScreen()` in `src/lib/app-release.ts`), falling back to the English set in
`public/app/`.

To regenerate after the app changes:

1. Export the app for the web and serve it on port 4400 with a single-page fallback:

   ```bash
   cd mobile && npx expo export --platform web --output-dir /tmp/app-web
   ```

2. Install fonts for every script, or the screens show empty boxes. The Noto fonts are
   on npm (`@fontsource/noto-sans-devanagari`, `-bengali`, `-tamil`, `-telugu`, `-arabic`);
   convert their `.woff2` files to `.ttf` with Python fontTools, put them in
   `~/.local/share/fonts`, and run `fc-cache -f`. Chinese, Japanese and Korean need
   any CJK font (for example WenQuanYi Zen Hei and IPAGothic).

3. Capture (Playwright), 390×844 at 2× like the English set:

   ```bash
   node tools/app-screenshots/capture.cjs /tmp/app-shots mobile/src/content/bundles
   ```

4. Convert each PNG to WebP at full size (780×1688) and at 390×844, into
   `public/app/<lang>/screen-N.webp` and `screen-N-390.webp`.
