/**
 * A page for one live title. The page is not written per game: the record
 * names which shared modules it wants and in which order, and every fact,
 * colour and localised label comes out of the data extracted from the app.
 */
const { el, tx, esc, t, i18nAttr } = require('../lib/html');
const { sectionHead, playBadge, factGrid, chips, button, arrowLeft } = require('../lib/layout');
const { games, live, storeUrl, pageUrl, data, LIVE } = require('../data/games');

/** Section wrapper with the standard header. */
const sec = (id, cls, headKeys, inner) => `
  <section class="sec ${cls}" id="${id}" aria-labelledby="${id}-title">
    <div class="wrap">
      ${sectionHead(headKeys).replace('class="sec-title"', `class="sec-title" id="${id}-title"`)}
      ${inner}
    </div>
  </section>`;

const k = (g, rest) => `g.${g.id}.${rest}`;

// ── modules ─────────────────────────────────────────────────────────────────

/** Three steps, the move the player actually makes. */
function how(g) {
  const steps = [1, 2, 3].map((i) => `
        <li class="step reveal">
          <span class="step-n" aria-hidden="true">${i}</span>
          <div class="step-demo" data-demo="${g.demo}-${i}" aria-hidden="true"></div>
          ${el('h3', k(g, `how.${i}.t`))}
          ${el('p', k(g, `how.${i}.d`))}
        </li>`).join('');
  return sec('how', 'how-sec',
    { eyebrow: k(g, 'how.eyebrow'), title: k(g, 'how.title'), intro: k(g, 'how.intro') },
    `<ol class="steps">${steps}</ol>`);
}

/** Blocklix: every palette, drawn in its own colours. */
function palettes(g) {
  const list = data.blocklix.palettes;
  const tiles = list.map((p, i) => `
          <button class="pal" type="button" data-pal="${i}"
            style="--sky:${p.sky[0] || '#101B3D'};--c1:${p.blocks[0]};--c2:${p.blocks[2]};--c3:${p.blocks[5]};--c4:${p.blocks[6]}"
            aria-pressed="${i === 0}">
            <span class="pal-art" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span class="pal-name">${esc(p.name)}</span>
            ${p.free ? `<span class="pal-free" ${i18nAttr({ title: k(g, 'palettes.free') })}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12.5 5 5L20 6.5"/></svg></span>` : ''}
          </button>`).join('');
  return sec('themes', 'pal-sec',
    { eyebrow: k(g, 'palettes.eyebrow'), title: k(g, 'palettes.title'), intro: k(g, 'palettes.intro') },
    `<div class="pal-stage">
        <div class="board board-dressed" data-board="drop" data-dress aria-hidden="true"></div>
        <div class="pal-meta">
          <span class="pal-current" data-pal-name>${esc(list[0].name)}</span>
          ${el('span', k(g, 'palettes.tap'), { class: 'pal-hint' })}
        </div>
      </div>
      <div class="pal-grid">${tiles}</div>`);
}

/** Blocklix: the six rungs, named and described by the game itself. */
function difficulty(g) {
  const rows = data.blocklix.difficulties.map((d, i) => `
          <li class="rung reveal" style="--i:${i}">
            <span class="rung-bar" aria-hidden="true"><i style="--w:${Math.round(((i + 1) / 6) * 100)}%"></i></span>
            ${el('h3', `gd.blocklix.diff.${d.id}.name`)}
            ${el('p', `gd.blocklix.diff.${d.id}.desc`)}
          </li>`).join('');
  return sec('difficulty', 'rung-sec',
    { eyebrow: k(g, 'difficulty.eyebrow'), title: k(g, 'difficulty.title'), intro: k(g, 'difficulty.intro') },
    `<ol class="rungs">${rows}</ol>${el('p', k(g, 'difficulty.note'), { class: 'sec-note' })}`);
}

/** Blocklix: ranks, chains, missions — everything earned rather than sold. */
function progress(g) {
  const families = data.blocklix.ranks.map((r, i) => `
            <li class="fam" style="--i:${i}">${el('span', `gd.blocklix.rank.${r.id}`)}</li>`).join('');
  const cards = [
    ['ranks', String(data.blocklix.ranks.length * 4)],
    ['quests', '21'],
    ['missions', '13'],
  ].map(([id, n]) => `
          <div class="prog-card reveal">
            <b class="prog-n" data-count="${n}">${n}</b>
            ${el('h3', k(g, `progress.${id}.t`))}
            ${el('p', k(g, `progress.${id}.d`))}
          </div>`).join('');
  return sec('progress', 'prog-sec',
    { eyebrow: k(g, 'progress.eyebrow'), title: k(g, 'progress.title'), intro: k(g, 'progress.intro') },
    `<div class="prog-grid">${cards}</div>
      ${el('p', k(g, 'progress.families'), { class: 'sec-note' })}
      <ol class="fams">${families}</ol>`);
}

/** Gridlix: one puzzle a day, identical for everyone. */
function daily(g) {
  const stars = [1, 2, 3].map((i) => `
          <li class="star-rule reveal">
            <span class="stars" aria-hidden="true">${'★'.repeat(i)}${'☆'.repeat(3 - i)}</span>
            ${el('p', k(g, `daily.star.${i}`))}
          </li>`).join('');
  return sec('daily', 'daily-sec',
    { eyebrow: k(g, 'daily.eyebrow'), title: k(g, 'daily.title'), intro: k(g, 'daily.intro') },
    `<div class="daily-grid">
        <div class="daily-card reveal">
          ${el('h3', k(g, 'daily.seed.t'))}
          ${el('p', k(g, 'daily.seed.d'))}
          <div class="seed-viz" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <ul class="star-rules">${stars}</ul>
      </div>`);
}

/** Gridlix: the month view — streak, shields, medals. */
function month(g) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const state = i === 5 || i === 19 ? 'miss' : (i === 9 || i === 24 ? 'shield' : 'done');
    return `<i class="day day-${state}" style="--i:${i}"></i>`;
  }).join('');
  const medals = data.gridlix.medals.map((m) => `
            <li class="medal medal-${m.id}">${el('span', `gd.gridlix.medal.${m.id}`)}</li>`).join('');
  return sec('month', 'month-sec',
    { eyebrow: k(g, 'month.eyebrow'), title: k(g, 'month.title'), intro: k(g, 'month.intro') },
    `<div class="month-grid">
        <div class="cal-card reveal">
          <div class="cal" aria-hidden="true">${days}</div>
          <div class="cal-legend">
            ${el('span', k(g, 'month.legend.done'), { class: 'lg lg-done' })}
            ${el('span', k(g, 'month.legend.shield'), { class: 'lg lg-shield' })}
            ${el('span', k(g, 'month.legend.miss'), { class: 'lg lg-miss' })}
          </div>
        </div>
        <div class="month-side">
          <div class="side-card reveal">
            ${el('h3', k(g, 'month.streak.t'))}
            ${el('p', k(g, 'month.streak.d'))}
          </div>
          <div class="side-card reveal">
            ${el('h3', k(g, 'month.medals.t'))}
            ${el('p', k(g, 'month.medals.d'))}
            <ul class="medals">${medals}</ul>
          </div>
        </div>
      </div>`);
}

/** Both games have boosters; the data says which and how they are paid for. */
function boosters(g) {
  const src = g.id === 'blocklix' ? data.blocklix.boosters : data.gridlix.boosters;
  const items = src.map((b, i) => `
          <li class="boost reveal" style="--i:${i}">
            <span class="boost-glyph boost-${b.id}" aria-hidden="true"></span>
            ${el('h3', `gd.${g.id}.booster.${b.id}.name`)}
            ${g.id === 'blocklix'
              ? el('p', `gd.blocklix.booster.${b.id}.desc`)
              : el('p', k(g, `boosters.${b.id}.d`))}
          </li>`).join('');
  return sec('boosters', 'boost-sec',
    { eyebrow: k(g, 'boosters.eyebrow'), title: k(g, 'boosters.title'), intro: k(g, 'boosters.intro') },
    `<ul class="boosts">${items}</ul>${el('p', k(g, 'boosters.note'), { class: 'sec-note' })}`);
}

/** Gridlix: five palettes, drawn with the game's real tile colours. */
function themes(g) {
  const items = data.gridlix.themes.map((th) => `
          <li class="gth reveal" style="--acc:${th.accent}">
            <span class="gth-tiles" aria-hidden="true">
              ${th.tiles.map(([bg, fg], n) => `<i style="background:${bg};color:${fg}">${2 ** (n + 1)}</i>`).join('')}
            </span>
            <b>${esc(th.name)}</b>
            ${th.premium ? el('span', k(g, 'themes.premium'), { class: 'gth-tag' })
                         : el('span', k(g, 'themes.free'), { class: 'gth-tag gth-free' })}
          </li>`).join('');
  return sec('themes', 'gth-sec',
    { eyebrow: k(g, 'themes.eyebrow'), title: k(g, 'themes.title'), intro: k(g, 'themes.intro') },
    `<ul class="gths">${items}</ul>`);
}

/** What money changes — and what it does not. */
function premium(g) {
  const items = [1, 2, 3, 4].map((i) => `
          <li class="perk reveal">
            <span class="perk-mark" aria-hidden="true"></span>
            ${el('span', k(g, `premium.${i}`))}
          </li>`).join('');
  return sec('premium', 'prem-sec',
    { eyebrow: k(g, 'premium.eyebrow'), title: k(g, 'premium.title'), intro: k(g, 'premium.intro') },
    `<div class="prem-card reveal">
        <ul class="perks">${items}</ul>
        ${el('p', k(g, 'premium.note'), { class: 'sec-note' })}
      </div>`);
}

const MODULES = { how, palettes, difficulty, progress, daily, month, boosters, themes, premium };

// ── the page ────────────────────────────────────────────────────────────────

function hero(g) {
  const facts = [...g.facts, { n: String(g.languages), key: 'f.languages' }];
  return `
  <section class="game-hero" aria-labelledby="game-title">
    <canvas class="hero-art" data-motif="${g.motif}" aria-hidden="true"></canvas>
    <div class="wrap">
      <a class="back" href="index.html#shelf">
        ${arrowLeft}${el('span', 'gp.back')}
      </a>
      <div class="game-hero-in">
        <div class="game-hero-text">
          <div class="game-top">
            <img class="game-icon" src="${g.icon}" alt="" width="128" height="128" decoding="async"
                 style="view-transition-name: vt-icon-${g.id}">
            <div>
              <h1 class="game-h1" id="game-title" style="view-transition-name: vt-name-${g.id}">${esc(g.name)}</h1>
              <div class="game-meta">
                ${el('span', 'status.live', { class: 'status status-live' })}
                ${el('span', k(g, 'genre'), { class: 'chip' })}
              </div>
            </div>
          </div>
          ${el('p', k(g, 'blurb'), { class: 'game-lede' })}
          ${factGrid(facts)}
          ${chips(Array.from({ length: g.chips }, (_, n) => k(g, `chip.${n + 1}`)))}
          <div class="game-ctas">
            <a class="gp-link" href="${storeUrl(g)}" target="_blank" rel="noopener"
              ${i18nAttr({ 'aria-label': k(g, 'playAria') })}>${playBadge(g)}</a>
          </div>
        </div>
        <div class="game-hero-art">
          <div class="board board-hero" data-board="${g.demo}" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  </section>`;
}

/** Every other title, so a page is never a dead end. */
function alsoBy(g) {
  const others = games.filter((x) => x.id !== g.id);
  const cards = others.map((x) => {
    const href = pageUrl(x);
    const inner = `
          <div class="also-in">
            ${x.icon ? `<img src="${x.icon}" alt="" width="64" height="64" loading="lazy" decoding="async">`
                     : '<span class="panel-icon-empty" aria-hidden="true"></span>'}
            <div>
              <b>${esc(x.name)}</b>
              ${el('p', `g.${x.id}.tagline`)}
            </div>
            ${el('span', `status.${x.status}`, { class: `status status-${x.status}` })}
          </div>`;
    return href
      ? `<a class="also reveal" href="${href}" style="--acc:${x.accent};--acc-d:${x.accentDark}">${inner}</a>`
      : `<div class="also also-soon reveal" style="--acc:${x.accent};--acc-d:${x.accentDark}">${inner}</div>`;
  }).join('');
  return `
  <section class="sec also-sec" id="also" aria-labelledby="also-title">
    <div class="wrap">
      ${sectionHead({ eyebrow: 'also.eyebrow', title: 'also.title' })
        .replace('class="sec-title"', 'class="sec-title" id="also-title"')}
      <div class="alsos">${cards}</div>
      <div class="sec-cta">${button('also.cta', 'index.html#shelf', { variant: 'ghost' })}</div>
    </div>
  </section>`;
}

module.exports = function gamePage(g) {
  const body = [
    hero(g),
    ...g.sections.map((name) => {
      if (!MODULES[name]) throw new Error(`${g.id}: unknown page module "${name}"`);
      return MODULES[name](g);
    }),
    alsoBy(g),
  ].join('\n');

  return {
    id: g.id,
    titleKey: `meta.${g.id}.title`,
    descKey: `meta.${g.id}.desc`,
    accent: g.accent,
    bodyClass: `game-page game-${g.id}`,
    scripts: g.sections.includes('palettes') ? ['assets/game-data.js'] : [],
    ogImage: `assets/og/${g.id}.png`,
    body,
  };
};
