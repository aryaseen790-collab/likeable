// Turns the imported home-page sections (long two-column WordPress markup) into
// "topics" rendered as bento grids. Every paragraph, list, image and heading from
// the original is kept, in the original order; only the layout changes.
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

export type Tile =
  | { kind: 'text'; eyebrow?: string; title?: string; id?: string; html: string; wide: boolean }
  | { kind: 'image'; html: string }
  | { kind: 'cards'; variant: string; html: string }
  | { kind: 'quote'; html: string };
export type Topic = { id: string; headingId?: string; label: string; titleHtml: string; intro: string[]; tiles: Tile[] };

const CARD_GRIDS = ['lpt-features-grid', 'lpt-pillars-grid', 'lpt-tips-grid', 'lpt-unlikable-cards'];
const textLength = (html: string) => html.replace(/<[^>]+>/g, '').length;

export function sectionToTopics(html: string): Topic[] {
  const $ = cheerio.load(html, null, false);
  const section = $('section').first();
  const sectionId = section.attr('id');
  const topics: Topic[] = [];
  let topic: Topic | null = null;
  let tile: Extract<Tile, { kind: 'text' }> | null = null;
  let pendingLabel = '';
  let parts: string[] = [];

  const ensureTopic = () => {
    if (!topic) {
      topic = { id: sectionId || `topic-${topics.length}`, label: pendingLabel, titleHtml: '', intro: [], tiles: [] };
      topics.push(topic);
    }
    return topic;
  };
  const closeTile = () => {
    if (tile) {
      tile.html = parts.join('\n');
      tile.wide = textLength(tile.html) > 760;
      if (tile.html || tile.title) ensureTopic().tiles.push(tile);
    }
    tile = null;
    parts = [];
  };
  const openTile = (title?: string, id?: string) => {
    closeTile();
    tile = { kind: 'text', title, id, html: '', wide: false };
    if (pendingLabel && topic && topic.titleHtml) {
      tile.eyebrow = pendingLabel;
      pendingLabel = '';
    }
  };

  const visit = (node: AnyNode) => {
    if (node.type !== 'tag') return;
    const el = node as Element;
    const $el = $(el);
    const cls = $el.attr('class') || '';
    const tag = el.tagName;

    if (cls.includes('lpt-section-label')) {
      pendingLabel = $el.text().trim();
      return;
    }
    if (tag === 'h2') {
      closeTile();
      const first = topics.length === 0;
      // The first topic keeps the section's id (e.g. #what-makes); the heading keeps its own.
      topic = { id: first && sectionId ? sectionId : $el.attr('id') || `topic-${topics.length}`, headingId: first && sectionId ? $el.attr('id') : undefined, label: pendingLabel, titleHtml: $el.html() || '', intro: [], tiles: [] };
      topics.push(topic);
      pendingLabel = '';
      return;
    }
    if (tag === 'h3' || tag === 'h4') {
      openTile($el.html() || '', $el.attr('id'));
      return;
    }
    if (cls.includes('lpt-img-wrap')) {
      closeTile();
      ensureTopic().tiles.push({ kind: 'image', html: $el.html() || '' });
      return;
    }
    const grid = CARD_GRIDS.find((g) => cls.includes(g));
    if (grid) {
      closeTile();
      ensureTopic().tiles.push({ kind: 'cards', variant: grid, html: $.html(el) });
      return;
    }
    if (cls.includes('lpt-pull-quote')) {
      // A quote right under a heading belongs to that heading's tile.
      if (tile && parts.length === 0 && tile.title) {
        parts.push(`<blockquote class="tile-quote">${$el.html() || ''}</blockquote>`);
        return;
      }
      closeTile();
      ensureTopic().tiles.push({ kind: 'quote', html: $el.html() || '' });
      return;
    }
    if (tag === 'p') {
      // Text after a tile continues in a new tile so the original order is kept.
      if (!tile && topic && topic.tiles.length) openTile();
      if (tile) parts.push($.html(el));
      else ensureTopic().intro.push($el.html() || '');
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      if (!tile) openTile();
      parts.push($.html(el));
      return;
    }
    if (tag === 'div' || tag === 'section') {
      $el.contents().each((_, c) => visit(c));
      return;
    }
    if (tile) parts.push($.html(el));
    else ensureTopic().intro.push($.html(el));
  };

  section.contents().each((_, c) => visit(c));
  closeTile();
  return topics;
}

// FAQ + CTA sections: pull out their pieces for a custom layout.
export function parseFaq(html: string) {
  const $ = cheerio.load(html, null, false);
  return {
    label: $('.lpt-section-label').first().text().trim(),
    titleHtml: $('h2').first().html() || '',
    titleId: $('h2').first().attr('id') || '',
    intro: $('.lpt-faq-inner > div').first().find('p').map((_, p) => $(p).html()).get(),
    image: $('.lpt-img-wrap').first().html() || '',
    items: $('details').map((_, d) => $.html(d)).get(),
  };
}
export function parseCta(html: string) {
  const $ = cheerio.load(html, null, false);
  return {
    titleHtml: $('h2').first().html() || '',
    titleId: $('h2').first().attr('id') || '',
    text: $('p').first().html() || '',
    cta: { href: $('a').first().attr('href') || '/#take-test', label: $('a').first().text().trim() },
  };
}
