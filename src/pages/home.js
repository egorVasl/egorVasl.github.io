/**
 * The home page. Its centre is the shelf: one panel per title, in order, and
 * then an empty slot that says the shelf is not finished. Everything on it is
 * generated from the catalogue, including the panel that has no game in it.
 */
const { el, tx, esc, t, i18nAttr } = require('../lib/html');
const { sectionHead, playBadge, factGrid, chips, button, playGlyph } = require('../lib/layout');
const { games, live, storeUrl, pageUrl, studioNumbers, LIVE, DEV } = require('../data/games');

const idx = (n) => String(n + 1).padStart(2, '0');

/** One title on the shelf. Live ones link to their page; the rest just wait. */
function panel(game, i) {
  const isLive = game.status === LIVE;
  const statusKey = `status.${game.status}`;
  const icon = game.icon
    ? `<img class="panel-icon" src="${game.icon}" alt="" width="96" height="96" loading="lazy" decoding="async">`
    : `<span class="panel-icon panel-icon-empty" aria-hidden="true"></span>`;

  return `
        <article class="panel${isLive ? '' : ' panel-soon'}" data-motif="${game.motif}"
                 style="--acc:${game.accent};--acc-d:${game.accentDark}">
          <canvas class="panel-art" aria-hidden="true"></canvas>
          <div class="panel-in">
            <div class="panel-top">
              <span class="panel-idx">${idx(i)}</span>
              ${el('span', statusKey, { class: `status status-${game.status}` })}
            </div>
            ${icon}
            <h3 class="panel-name">${esc(game.name)}</h3>
            ${el('p', `g.${game.id}.tagline`, { class: 'panel-tag' })}
            ${factGrid(game.facts, { size: 's' })}
            ${chips(Array.from({ length: game.chips }, (_, n) => `g.${game.id}.chip.${n + 1}`))}
            <div class="panel-foot">
              ${isLive
                ? `<a class="gp-link" href="${storeUrl(game)}" target="_blank" rel="noopener"
                     ${i18nAttr({ 'aria-label': `g.${game.id}.playAria` })}>${playBadge(game)}</a>
                   <span class="panel-more">${el('span', 'shelf.more')}<span class="arrow" aria-hidden="true">→</span></span>`
                : el('span', `g.${game.id}.when`, { class: 'panel-when' })}
            </div>
          </div>
          ${isLive
            ? `<a class="panel-hit" href="${pageUrl(game)}"
                 ${i18nAttr({ 'aria-label': `g.${game.id}.openAria` })}></a>`
            : ''}
        </article>`;
}

/** The slot with nothing in it. The point of the whole section. */
function openSlot(i) {
  return `
        <article class="panel panel-open" data-motif="open">
          <canvas class="panel-art" aria-hidden="true"></canvas>
          <div class="panel-in">
            <div class="panel-top">
              <span class="panel-idx">${idx(i)}</span>
              ${el('span', 'status.open', { class: 'status status-open' })}
            </div>
            <span class="open-plus" aria-hidden="true">+</span>
            ${el('h3', 'shelf.open.title', { class: 'panel-name' })}
            ${el('p', 'shelf.open.body', { class: 'panel-tag' })}
            ${el('span', 'shelf.open.meta', { class: 'panel-when' })}
          </div>
        </article>`;
}

function shelf() {
  const all = games.map(panel).join('') + openSlot(games.length);
  const dots = games.map((g, i) =>
    `<button class="dot" type="button" data-go="${i}" aria-label="${esc(g.name)}"></button>`).join('') +
    `<button class="dot" type="button" data-go="${games.length}" ${i18nAttr({ 'aria-label': 'shelf.open.title' })}></button>`;

  return `
  <section class="sec shelf-sec" id="shelf" aria-labelledby="shelf-title">
    <div class="wrap shelf-head">
      <div>
        ${el('p', 'shelf.eyebrow', { class: 'eyebrow' })}
        ${el('h2', 'shelf.title', { class: 'sec-title', id: 'shelf-title' })}
        ${el('p', 'shelf.intro', { class: 'sec-intro' })}
      </div>
      <div class="shelf-count">
        <span class="count-n" data-count="${studioNumbers.games}">${studioNumbers.games}</span>
        ${el('span', 'shelf.count.live')}
        <span class="count-sep" aria-hidden="true">·</span>
        <span class="count-n" data-count="${games.length - studioNumbers.games}">${games.length - studioNumbers.games}</span>
        ${el('span', 'shelf.count.soon')}
        <span class="count-sep" aria-hidden="true">·</span>
        <span class="count-inf" aria-hidden="true">∞</span>
        ${el('span', 'shelf.count.open')}
      </div>
    </div>
    <div class="rail-wrap">
      <div class="rail" tabindex="0" role="region"
        ${i18nAttr({ 'aria-label': 'shelf.railAria' })}>${all}
      </div>
    </div>
    <div class="wrap rail-controls">
      <div class="dots">${dots}</div>
      <div class="rail-btns">
        <button class="rail-btn" type="button" data-rail="prev" ${i18nAttr({ 'aria-label': 'shelf.prev' })}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
        <button class="rail-btn" type="button" data-rail="next" ${i18nAttr({ 'aria-label': 'shelf.next' })}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
      </div>
    </div>
  </section>`;
}

function hero() {
  const buttons = live.map((g) =>
    `<a class="btn ghost game-btn" href="${pageUrl(g)}" style="--acc:${g.accent};--acc-d:${g.accentDark}">
       <img src="${g.icon}" alt="" width="32" height="32" loading="eager" decoding="async">
       <span>${esc(g.name)}</span></a>`).join('');

  return `
  <section class="hero" aria-labelledby="hero-title">
    <canvas class="hero-art" data-motif="brand" aria-hidden="true"></canvas>
    <div class="wrap hero-in">
      <div class="hero-text">
        ${el('p', 'hero.kick', { class: 'kicker' })}
        <h1 class="hero-h1" id="hero-title">
          <span class="line" data-i18n="hero.t1">${tx('hero.t1')}</span>
          <span class="line grad" data-i18n="hero.t2">${tx('hero.t2')}</span>
        </h1>
        ${el('p', 'hero.lede', { class: 'hero-lede' })}
        <div class="hero-ctas">
          ${button('hero.cta.shelf', '#shelf', { icon: playGlyph })}
          ${button('hero.cta.studio', 'studio.html', { variant: 'ghost' })}
        </div>
        <div class="hero-games">${buttons}</div>
      </div>
    </div>
    <a class="scroll-cue" href="#shelf" ${i18nAttr({ 'aria-label': 'hero.scroll' })}>
      <span class="cue-block" aria-hidden="true"></span>
    </a>
  </section>`;
}

function numbers() {
  const n = studioNumbers;
  const row = [
    [n.games, 'nums.games'], [n.languages, 'nums.langs'], [n.accounts, 'nums.accounts'],
    [n.servers, 'nums.servers'], [n.people, 'nums.person'], [n.since, 'nums.since'],
  ];
  return `
  <section class="sec nums-sec" aria-labelledby="nums-title">
    <div class="wrap">
      <h2 class="sr" id="nums-title" data-i18n="nums.title">${tx('nums.title')}</h2>
      <div class="nums reveal">
        ${row.map(([v, k]) => `<div class="num"><b data-count="${v}">${v}</b>${el('span', k)}</div>`).join('')}
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
  <section class="sec" id="principles" aria-labelledby="principles-title">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'principles.eyebrow', title: 'principles.title', intro: 'principles.intro' })
        .replace('class="sec-title"', 'class="sec-title" id="principles-title"')}
      <ul class="trust-grid">${items}</ul>
    </div>
  </section>`;
}

function roadmapTeaser() {
  const rows = [1, 2, 3, 4].map((i) => `
        <li class="road-row reveal">
          ${el('span', `roadmap.r${i}.meta`, { class: 'road-meta' })}
          <div>
            ${el('h3', `roadmap.r${i}.title`)}
            ${el('p', `roadmap.r${i}.desc`)}
          </div>
        </li>`).join('');
  return `
  <section class="sec" id="roadmap" aria-labelledby="roadmap-title">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'roadmap.eyebrow', title: 'roadmap.title', intro: 'roadmap.intro' })
        .replace('class="sec-title"', 'class="sec-title" id="roadmap-title"')}
      <ol class="road-list">${rows}</ol>
      <div class="sec-cta">${button('roadmap.cta', 'studio.html', { variant: 'ghost' })}</div>
    </div>
  </section>`;
}

function privacyCta() {
  return `
  <section class="sec" aria-labelledby="privacy-cta-title">
    <div class="wrap">
      <div class="cta-card reveal">
        <div>
          ${el('p', 'privacy.eyebrow', { class: 'eyebrow' })}
          ${el('h2', 'privacyCta.title', { class: 'cta-title', id: 'privacy-cta-title' })}
          ${el('p', 'privacyCta.text', { class: 'cta-text' })}
        </div>
        ${button('privacyCta.btn', 'privacy-policy.html')}
      </div>
    </div>
  </section>`;
}

module.exports = function home() {
  return {
    id: 'home',
    titleKey: 'meta.home.title',
    descKey: 'meta.home.desc',
    canonical: '',
    body: [hero(), shelf(), numbers(), principles(), roadmapTeaser(), privacyCta()].join('\n'),
  };
};
