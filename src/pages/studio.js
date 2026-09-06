/** Who is behind the catalogue, what the rules are, and what comes next. */
const { el, tx, esc, t, i18nAttr } = require('../lib/html');
const { sectionHead, button } = require('../lib/layout');
const { studioNumbers, games, live, pageUrl } = require('../data/games');

function about() {
  const n = studioNumbers;
  const stats = [
    [n.games, 'about.stats.apps'], [n.languages, 'about.stats.langs'],
    [n.people, 'about.stats.people'], [n.since, 'about.stats.since'],
  ];
  return `
  <section class="page-hero" aria-labelledby="studio-title">
    <canvas class="hero-art" data-motif="brand" aria-hidden="true"></canvas>
    <div class="wrap">
      ${el('p', 'about.eyebrow', { class: 'kicker' })}
      <h1 class="page-h1" id="studio-title" data-i18n="about.title">${tx('about.title')}</h1>
      ${el('p', 'about.lede', { class: 'page-lede' })}
      <div class="about-stats">
        ${stats.map(([v, k]) => `<div class="num"><b data-count="${v}">${v}</b>${el('span', k)}</div>`).join('')}
      </div>
    </div>
  </section>`;
}

function story() {
  return `
  <section class="sec" id="story" aria-labelledby="story-title">
    <div class="wrap narrow">
      ${sectionHead({ eyebrow: 'story.eyebrow', title: 'story.title' })
        .replace('class="sec-title"', 'class="sec-title" id="story-title"')}
      <div class="prose reveal">
        ${el('p', 'story.p1')}
        ${el('p', 'story.p2')}
        ${el('p', 'story.p3')}
      </div>
    </div>
  </section>`;
}

function principles() {
  const items = [1, 2, 3, 4].map((i) => `
        <li class="trust-item reveal">
          <span class="trust-mark" aria-hidden="true"></span>
          ${el('h3', `trust.${i}.title`)}
          ${el('p', `trust.${i}.desc`)}
        </li>`).join('');
  return `
  <section class="sec" id="principles" aria-labelledby="pr-title">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'principles.eyebrow', title: 'principles.title', intro: 'principles.intro' })
        .replace('class="sec-title"', 'class="sec-title" id="pr-title"')}
      <ul class="trust-grid">${items}</ul>
    </div>
  </section>`;
}

function roadmap() {
  const rows = [1, 2, 3].map((i) => `
        <li class="road-row reveal">
          ${el('span', `roadmap.r${i}.meta`, { class: 'road-meta' })}
          <div>
            ${el('h3', `roadmap.r${i}.title`)}
            ${el('p', `roadmap.r${i}.desc`)}
          </div>
        </li>`).join('');
  return `
  <section class="sec" id="roadmap" aria-labelledby="rm-title">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'roadmap.eyebrow', title: 'roadmap.title', intro: 'roadmap.intro' })
        .replace('class="sec-title"', 'class="sec-title" id="rm-title"')}
      <ol class="road-list">${rows}</ol>
      ${el('p', 'roadmap.note', { class: 'sec-note' })}
    </div>
  </section>`;
}

function faq() {
  const items = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `
        <details class="faq-item reveal">
          <summary><span data-i18n="faq.q${i}">${tx(`faq.q${i}`)}</span>
            <span class="faq-mark" aria-hidden="true"></span></summary>
          ${el('div', `faq.a${i}`, { class: 'faq-a' })}
        </details>`).join('');
  return `
  <section class="sec" id="faq" aria-labelledby="faq-title">
    <div class="wrap narrow">
      ${sectionHead({ eyebrow: 'faq.eyebrow', title: 'faq.title' })
        .replace('class="sec-title"', 'class="sec-title" id="faq-title"')}
      <div class="faq">${items}</div>
    </div>
  </section>`;
}

function contact() {
  return `
  <section class="sec" aria-labelledby="contact-title">
    <div class="wrap">
      <div class="cta-card reveal">
        <div>
          ${el('p', 'contact.eyebrow', { class: 'eyebrow' })}
          ${el('h2', 'contact.title', { class: 'cta-title', id: 'contact-title' })}
          ${el('p', 'contact.text', { class: 'cta-text' })}
        </div>
        ${button('contact.btn', 'mailto:vaslixofficial@protonmail.com')}
      </div>
    </div>
  </section>`;
}

module.exports = function studio() {
  return {
    id: 'studio',
    titleKey: 'meta.studio.title',
    descKey: 'meta.studio.desc',
    body: [about(), story(), principles(), roadmap(), faq(), contact()].join('\n'),
  };
};
