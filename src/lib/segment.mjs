// Splits an HTML fragment into translatable text segments and puts translations
// back. Used by scripts/i18n-extract.mjs (to write the English source) and by
// the build (to render translated pages), so both walk the HTML identically.
//
// A segment is the inner HTML of a "leaf block" (a block element with only
// inline content), with inline tags swapped for numbered placeholders:
//   'See <a href="/x/">the guide</a> <em>now</em>' -> 'See <1>the guide</1> <2>now</2>'
// Void inline elements become self-closing placeholders: <3/>. Translators keep
// the placeholders; validate() rejects a translation whose placeholders differ.
// Image alt text is extracted as separate segments.
import * as cheerio from 'cheerio';
import crypto from 'node:crypto';

const BLOCK = new Set('address article aside blockquote details dialog dd div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section summary table tbody td tfoot th thead tr ul'.split(' '));
const VOID = new Set(['br', 'img', 'wbr']);
const SKIP = new Set(['script', 'style', 'svg', 'noscript', 'template', 'canvas']);

const hasBlockDescendant = ($, el) => $(el).find([...BLOCK].join(',')).length > 0;
const hasText = ($, el) => $(el).text().replace(/\s+/g, '').length > 0;

// Leaf blocks (and loose text in mixed containers) in document order.
function collect($, root) {
  const units = [];
  const walk = (el) => {
    for (const child of $(el).contents().toArray()) {
      if (child.type === 'text') {
        // Text sitting directly in a container that also has blocks.
        if (child.data.trim() && el !== root && BLOCK.has(el.tagName) && hasBlockDescendant($, el)) units.push({ kind: 'text', node: child });
        else if (child.data.trim() && el === root) units.push({ kind: 'text', node: child });
        continue;
      }
      if (child.type !== 'tag' || SKIP.has(child.tagName)) continue;
      if (child.tagName === 'img' && $(child).attr('alt')?.trim()) units.push({ kind: 'alt', node: child });
      if (BLOCK.has(child.tagName)) {
        if (!hasBlockDescendant($, child)) {
          $(child).find('img[alt]').each((_, img) => { if ($(img).attr('alt').trim()) units.push({ kind: 'alt', node: img }); });
          if (hasText($, child)) units.push({ kind: 'block', node: child });
        } else walk(child);
      } else if (el === root || (BLOCK.has(el.tagName) && hasBlockDescendant($, el))) {
        // Inline element loose inside a mixed container: translate it whole.
        $(child).find('img[alt]').each((_, img) => { if ($(img).attr('alt').trim()) units.push({ kind: 'alt', node: img }); });
        if (hasText($, child)) units.push({ kind: 'block', node: child, outer: true });
      }
    }
  };
  walk(root);
  return units;
}

// Encode a list of sibling nodes; inline tags become numbered placeholders.
function encode($, nodes) {
  const tags = [];
  const enc = (list) =>
    list
      .map((c) => {
        if (c.type === 'text') return escapeText(c.data);
        if (c.type !== 'tag') return '';
        const i = tags.push(c);
        if (VOID.has(c.tagName)) return `<${i}/>`;
        return `<${i}>${enc($(c).contents().toArray())}</${i}>`;
      })
      .join('');
  return { text: enc(nodes).replace(/\s+/g, ' ').trim(), tags };
}
const unitNodes = ($, u) => (u.outer ? [u.node] : $(u.node).contents().toArray());
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function decode(str, tags) {
  // Rebuild HTML: <n>..</n> and <n/> placeholders -> original tags (attributes kept).
  return str.replace(/<(\/?)(\d+)(\/?)>/g, (m, close, num, self) => {
    const el = tags[Number(num) - 1];
    if (!el) return '';
    if (close) return `</${el.tagName}>`;
    const attrs = Object.entries(el.attribs || {}).map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`).join('');
    return self || VOID.has(el.tagName) ? `<${el.tagName}${attrs}>` : `<${el.tagName}${attrs}>`;
  });
}

const placeholderSig = (s) => (s.match(/<\/?\d+\/?>/g) || []).sort().join('');

/** English segments of an HTML fragment. */
export function extract(html) {
  const $ = cheerio.load(`<main>${html}</main>`, null, false);
  const root = $('main')[0];
  return collect($, root).map((u) => {
    if (u.kind === 'alt') return $(u.node).attr('alt').trim();
    if (u.kind === 'text') return escapeText(u.node.data.replace(/\s+/g, ' ').trim());
    return encode($, unitNodes($, u)).text;
  });
}

/** True if a translated segment keeps exactly the source's placeholders. */
export const validSegment = (source, translated) => typeof translated === 'string' && translated.trim() !== '' && placeholderSig(source) === placeholderSig(translated);

/** Rebuild an HTML fragment with translated segments (invalid ones stay English). */
export function apply(html, translated) {
  const $ = cheerio.load(`<main>${html}</main>`, null, false);
  const root = $('main')[0];
  const units = collect($, root);
  let bad = 0;
  units.forEach((u, i) => {
    const t = translated[i];
    if (u.kind === 'alt') {
      if (typeof t === 'string' && t.trim()) $(u.node).attr('alt', t);
      return;
    }
    if (u.kind === 'text') {
      if (typeof t === 'string' && t.trim() && !/<\d/.test(t)) u.node.data = ` ${t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')} `;
      return;
    }
    const { text: src, tags } = encode($, unitNodes($, u));
    if (!validSegment(src, t)) {
      bad++;
      return;
    }
    if (u.outer) $(u.node).replaceWith(decode(t, tags));
    else $(u.node).html(decode(t, tags));
  });
  return { html: $('main').html(), bad };
}

export const hashSegments = (segments) => crypto.createHash('sha1').update(JSON.stringify(segments)).digest('hex').slice(0, 12);
