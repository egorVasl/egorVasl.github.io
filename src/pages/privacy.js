/**
 * The privacy policy. It used to be the one page kept by hand, with its own
 * stylesheet, its own dictionary and its own header — which is exactly why it
 * was the one page that stopped looking like the site.
 *
 * The document itself is data: SECTIONS below says what each numbered section
 * is made of, and the words come from the dictionary like everywhere else. A
 * legal document is long, so the shape has to be boring and repeatable; the
 * only thing worth arranging by hand is the order.
 */
const { el, tx, esc, t, i18nAttr } = require('../lib/html');
const { externalAttrs } = require('../lib/layout');

/** Bump this when the text changes. It is the only date the reader can check. */
const UPDATED = '2026-09-06';

const N = (n) => String(n).padStart(2, '0');

/**
 * One entry per block, in reading order.
 *   ['p', key]         a paragraph
 *   ['h3', key]        a sub-heading
 *   ['ul'|'ol', key, n]  a list of n items, keyed <key>.1 … <key>.n
 *   ['callout', key]   the boxed aside a reader should not miss
 *   ['link', url]      a bare link on its own line, where the text points off-site
 */
const SECTIONS = [
  { n: 1, blocks: [
    ['p', 'intro'],
    ['h3', 'h3a'], ['p', 'body1a'], ['ul', 'list1a', 5], ['callout', 'callout'],
    ['h3', 'h3b'], ['p', 'body1b'], ['ul', 'list1b', 6], ['callout', 'deviceIdCallout'],
    ['h3', 'h3c'], ['p', 'firebase'],
    ['h3', 'h3d'], ['p', 'backup'],
  ] },
  { n: 2, blocks: [
    ['p', 'intro'],
    ['h3', 'h3a'], ['p', 'appodeal1'], ['p', 'appodeal2'],
    ['link', 'https://www.appodeal.com/partners/'], ['p', 'appodeal3'],
    ['h3', 'h3b'], ['p', 'admob'],
    ['callout', 'callout'],
  ] },
  { n: 3, blocks: [['p', 'intro'], ['ol', 'list', 4]] },
  { n: 4, blocks: [['p', 'body']] },
  { n: 5, blocks: [['p', 'body']] },
  { n: 6, blocks: [['p', 'body']] },
  { n: 7, blocks: [['p', 'body']] },
  { n: 8, blocks: [['p', 'body'], ['callout', 'callout']] },
  { n: 9, blocks: [['p', 'body']] },
  { n: 10, blocks: [['p', 'body']] },
];

// ── blocks ──────────────────────────────────────────────────────────────────

function block(sec, [kind, key, count]) {
  const k = (suffix) => `p.sec${sec}.${suffix}`;
  switch (kind) {
    case 'p':
      return el('p', k(key));
    case 'h3':
      return el('h3', k(key), { class: 'doc-h3' });
    case 'ul':
    case 'ol':
      return `<${kind} class="doc-list">` +
        Array.from({ length: count }, (_, i) => el('li', k(`${key}.${i + 1}`))).join('') +
        `</${kind}>`;
    case 'callout':
      return `<aside class="callout">${el('p', k(key))}</aside>`;
    case 'link': {
      const label = key.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      return `<p class="doc-link"><a href="${esc(key)}"${externalAttrs()}>${esc(label)} ↗</a></p>`;
    }
    default:
      throw new Error('privacy: unknown block ' + kind);
  }
}

const section = ({ n, blocks }) => `
      <section class="doc-sec" id="sec-${n}" aria-labelledby="sec-${n}-title">
        <p class="doc-num" aria-hidden="true">${N(n)}</p>
        ${el('h2', `p.sec${n}.title`, { class: 'doc-title', id: `sec-${n}-title` })}
        ${blocks.map((b) => block(n, b)).join('\n        ')}
      </section>`;

// ── the page ────────────────────────────────────────────────────────────────

function hero() {
  const chip = (key, path) => `
        <span class="doc-chip">
          <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>
          <span data-i18n="${key}">${tx(key)}</span>
        </span>`;
  return `
  <section class="page-hero" aria-labelledby="privacy-title">
    <canvas class="hero-art" data-motif="brand" aria-hidden="true"></canvas>
    <div class="wrap">
      ${el('p', 'p.hero.eyebrow', { class: 'kicker' })}
      <h1 class="page-h1" id="privacy-title" data-i18n="p.hero.title">${tx('p.hero.title')}</h1>
      ${el('p', 'p.hero.lede', { class: 'page-lede' })}
      <div class="doc-chips">
        <span class="doc-chip">
          <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/></svg>
          <span><span data-i18n="p.hero.chip.updated">${tx('p.hero.chip.updated')}</span>: <time datetime="${UPDATED}">${UPDATED}</time></span>
        </span>
        ${chip('p.hero.chip.gdpr', '<path d="M12 3 5 6v5.6c0 4.4 3 8.3 7 9.4 4-1.1 7-5 7-9.4V6l-7-3Z"/>')}
        ${chip('p.hero.chip.billing', '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/>')}
      </div>
    </div>
  </section>`;
}

function summary() {
  const items = [1, 2, 3, 4].map((i) => `
          <li class="sum-item">
            <span class="sum-mark" aria-hidden="true"></span>
            <div>
              ${el('h3', `p.summary.${i}.title`)}
              ${el('p', `p.summary.${i}.desc`)}
            </div>
          </li>`).join('');
  return `
  <section class="sec sum-sec" aria-labelledby="sum-title">
    <div class="wrap">
      ${el('h2', 'p.summary.heading', { class: 'sec-title', id: 'sum-title' })}
      <ul class="sum-grid reveal">${items}</ul>
    </div>
  </section>`;
}

/**
 * The document proper: the contents on the left, sticky, and the sections on
 * the right. Ten collapsed panels would have been prettier and would have
 * broken both Ctrl+F and printing, which is most of what a policy is for.
 */
function document_() {
  const toc = SECTIONS.map(({ n }) =>
    `<li><a href="#sec-${n}" data-i18n="p.toc.${n}">${tx(`p.toc.${n}`)}</a></li>`).join('');
  return `
  <section class="sec doc-sec-wrap" id="policy">
    <div class="wrap doc">
      <aside class="doc-aside" aria-label="${esc(t('p.toc.aria'))}" data-i18n-attr="aria-label:p.toc.aria">
        <nav class="doc-toc">
          ${el('p', 'p.toc.title', { class: 'doc-toc-title' })}
          <ol class="doc-toc-list">${toc}</ol>
        </nav>
      </aside>
      <div class="doc-body">${SECTIONS.map(section).join('\n')}
      </div>
    </div>
  </section>`;
}

module.exports = function privacy() {
  return {
    id: 'privacy-policy',
    titleKey: 'meta.privacy.title',
    descKey: 'meta.privacy.desc',
    bodyClass: 'doc-page',
    body: [hero(), summary(), document_()].join('\n'),
  };
};
