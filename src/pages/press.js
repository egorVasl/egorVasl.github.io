/** Everything a writer needs in one place: the blurb, the numbers, the files. */
const { el, tx, esc, t, i18nAttr } = require('../lib/html');
const { sectionHead, button } = require('../lib/layout');
const { live, games, studioNumbers, storeUrl, data } = require('../data/games');

function heroSection() {
  return `
  <section class="page-hero" aria-labelledby="press-title">
    <canvas class="hero-art" data-motif="brand" aria-hidden="true"></canvas>
    <div class="wrap">
      ${el('p', 'press.eyebrow', { class: 'kicker' })}
      <h1 class="page-h1" id="press-title" data-i18n="press.title">${tx('press.title')}</h1>
      ${el('p', 'press.lede', { class: 'page-lede' })}
    </div>
  </section>`;
}

function blurb() {
  return `
  <section class="sec" id="blurb" aria-labelledby="blurb-title">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'press.aboutEyebrow', title: 'press.aboutTitle' })
        .replace('class="sec-title"', 'class="sec-title" id="blurb-title"')}
      <div class="blurb-card reveal">
        ${el('p', 'press.aboutBody', { class: 'blurb-text', id: 'press-blurb' })}
        <button class="btn copy-btn" type="button" data-copy="#press-blurb">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="copy-ico"><rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M5 15V5.6A1.6 1.6 0 0 1 6.6 4H15"/></svg>
          <span data-i18n="press.copyBtn">${tx('press.copyBtn')}</span>
        </button>
      </div>
    </div>
  </section>`;
}

/** The numbers a reviewer would otherwise have to count themselves. */
function factSheet() {
  const rows = [
    ['press.fact.studio', 'Vaslix Games'],
    ['press.fact.founded', String(studioNumbers.since)],
    ['press.fact.people', String(studioNumbers.people)],
    ['press.fact.platform', 'Android 8.0+'],
    ['press.fact.titles', live.map((g) => g.name).join(' · ')],
    ['press.fact.langs', `Blocklix — ${data.blocklix.languages} · Gridlix:2048 — ${data.gridlix.languages}`],
    ['press.fact.money', ''],
    ['press.fact.contact', 'vaslixofficial@protonmail.com'],
  ];
  return `
  <section class="sec" id="facts" aria-labelledby="facts-title">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'press.factsEyebrow', title: 'press.factsTitle' })
        .replace('class="sec-title"', 'class="sec-title" id="facts-title"')}
      <dl class="fact-sheet reveal">
        ${rows.map(([k, v]) => `<div class="fs-row">${el('dt', k)}<dd>${
          v ? esc(v) : `<span data-i18n="${k}.v">${tx(k + '.v')}</span>`}</dd></div>`).join('')}
      </dl>
    </div>
  </section>`;
}

function assets() {
  const items = [
    ['press.assetMark', 'assets/logo.svg', 'SVG', ''],
    ['press.assetMark', 'assets/logo-512.png', 'PNG · 512', ''],
    ['press.assetMark', 'assets/logo-1024.png', 'PNG · 1024', ''],
    ['press.assetLockup', 'assets/logo-lockup.svg', 'SVG', ' asset-wide'],
    // The dark lockup is white ink; its tile carries the background it is for.
    ['press.assetLockupDark', 'assets/logo-lockup-dark.svg', 'SVG', ' asset-wide asset-onDark'],
    // Icons go out as PNG: a press kit is opened by people, not by browsers.
    ['press.assetBlocklix', 'blocklix-icon.png', 'PNG · 512', ''],
    ['press.assetGridlix', 'gridlix-icon.png', 'PNG · 512', ''],
  ].map(([k, href, meta, mod]) => `
        <a class="asset reveal${mod}" href="${href}" download>
          <span class="asset-prev" style="background-image:url('${href}')" aria-hidden="true"></span>
          <span class="asset-name" data-i18n="${k}">${tx(k)}</span>
          <span class="asset-meta">${esc(meta)}</span>
        </a>`).join('');
  const links = live.map((g) => `
        <a class="asset asset-link reveal" href="${storeUrl(g)}" target="_blank" rel="noopener">
          <span class="asset-prev" style="background-image:url('${g.icon}')" aria-hidden="true"></span>
          <span class="asset-name">${esc(g.name)}</span>
          <span class="asset-meta">Google Play</span>
        </a>`).join('');
  return `
  <section class="sec" id="assets" aria-labelledby="assets-title">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'press.assetsEyebrow', title: 'press.assetsTitle', intro: 'press.assetsIntro' })
        .replace('class="sec-title"', 'class="sec-title" id="assets-title"')}
      <div class="assets">${items}${links}</div>
    </div>
  </section>`;
}

function contact() {
  return `
  <section class="sec" aria-labelledby="press-contact-title">
    <div class="wrap">
      <div class="cta-card reveal">
        <div>
          ${el('p', 'press.contactEyebrow', { class: 'eyebrow' })}
          ${el('h2', 'press.contactTitle', { class: 'cta-title', id: 'press-contact-title' })}
          ${el('p', 'press.sla', { class: 'cta-text' })}
        </div>
        ${button('contact.btn', 'mailto:vaslixofficial@protonmail.com')}
      </div>
    </div>
  </section>`;
}

module.exports = function press() {
  return {
    id: 'press',
    titleKey: 'meta.press.title',
    descKey: 'meta.press.desc',
    body: [heroSection(), blurb(), factSheet(), assets(), contact()].join('\n'),
  };
};
