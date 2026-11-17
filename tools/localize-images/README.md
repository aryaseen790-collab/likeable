# Localized article images

Translated copies of the five "Warmth vs Competence" images, which have English
text painted into the artwork. The output lives in
`public/wp-content/uploads/2026/11/<lang>/`; translated pages pick those copies up
automatically (see `localizeUploads` in `src/lib/i18n.ts`) and fall back to the
English file when no copy exists.

- `imgtext.json` — the on-image text for each language (edit wording here).
- `img_specs.py` — where each text area sits in the English artwork, with the
  background colour detected from the image. Re-run it if the source images change.
- `render_imgs.cjs` — paints over each text area and draws the translation with
  Chromium (via Playwright), shrinking text to fit.

To regenerate, in a work folder `W`:

1. Put the English images as PNGs in `W/crops/` (same base names as the WebP files).
2. Download the fonts into `W/fonts/`: run `npm pack @fontsource/<name>` for
   nunito, noto-sans-devanagari, noto-sans-bengali, noto-sans-telugu,
   noto-sans-tamil, noto-sans-arabic, noto-sans-kr, noto-sans-jp, noto-sans-sc,
   then extract each `.tgz` into a folder named like the tarball.
3. Copy `imgtext.json` into `W`, then run
   `python3 img_specs.py W` and `node render_imgs.cjs W W/rendered [lang ...]`.
4. Convert `W/rendered/<lang>/*.png` to WebP (full size plus a 300px-wide copy)
   in `public/wp-content/uploads/2026/11/<lang>/`.
