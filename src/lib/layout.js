/**
 * The shell every page is poured into: head, navigation, footer, and the few
 * components that repeat across pages. Pages assemble sections; nothing here
 * knows about a specific game.
 */
const { el, tx, esc, attrsOf, i18nAttr, t } = require('./html');
const { LOCALES } = require('./i18n');
const { games, live, storeUrl, pageUrl, LIVE } = require('../data/games');

const SITE = 'https://vaslixgames.com';

/** The language menu names each language in that language, so it is not translated. */
const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', native: 'English' },
  { code: 'ru', flag: '🇷🇺', native: 'Русский' },
  { code: 'es', flag: '🇪🇸', native: 'Español' },
  { code: 'de', flag: '🇩🇪', native: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', native: 'Français' },
  { code: 'pt-BR', flag: '🇧🇷', native: 'Português' },
  { code: 'zh', flag: '🇨🇳', native: '简体中文' },
];

/** Google Play badges are official assets and exist per locale. */
const badgeSrc = (loc) => `badges/google-play-${loc}.png`;

// ── pieces ──────────────────────────────────────────────────────────────────

/** Eyebrow + title + optional intro, the header every section starts with. */
function sectionHead({ eyebrow, title, intro, level = 'h2' }) {
  return [
    eyebrow ? el('p', eyebrow, { class: 'eyebrow' }) : '',
    el(level, title, { class: 'sec-title' }),
    intro ? el('p', intro, { class: 'sec-intro' }) : '',
  ].join('\n      ');
}

/**
 * The official Google Play badge, localised. Never wrapped in its own link:
 * the card around it is the link, and a second one would nest.
 */
function playBadge(game, { standalone = false } = {}) {
  const img = `<img class="gp-badge" src="${badgeSrc('en')}" width="646" height="250"` +
    ` alt="${esc(t('cta.play'))}" data-i18n-attr="alt:cta.play" data-badge loading="lazy" decoding="async">`;
  if (!standalone) return img;
  return `<a class="gp-link" href="${storeUrl(game)}"${externalAttrs()}` +
    i18nAttr({ 'aria-label': `g.${game.id}.playAria` }) + `>${img}</a>`;
}

const externalAttrs = () => ' target="_blank" rel="noopener"';

/** A row of number + label tiles. Values are counted upstream, never typed here. */
function factGrid(facts, { size = 'm' } = {}) {
  if (!facts.length) return '';
  return `<div class="facts facts-${size}">` + facts.map((f) =>
    `<div class="fact"><b>${esc(f.n)}</b>${el('span', f.key)}</div>`).join('') + '</div>';
}

const chips = (keys) => keys.length
  ? `<div class="chips">${keys.map((k) => el('span', k, { class: 'chip' })).join('')}</div>`
  : '';

/** A button in the game's vocabulary: a face with an edge under it. */
function button(key, href, { variant = 'cta', icon = '', attrs = {} } = {}) {
  const cls = 'btn' + (variant === 'ghost' ? ' ghost' : '');
  return `<a class="${cls}" href="${esc(href)}"${attrsOf(attrs)}>${icon}${el('span', key)}</a>`;
}

const playGlyph = `<svg class="play-glyph" viewBox="0 0 20 22" aria-hidden="true">` +
  `<path d="M1 1.4v19.2a1 1 0 0 0 1.5.87l16.2-9.6a1 1 0 0 0 0-1.74L2.5.53A1 1 0 0 0 1 1.4Z" fill="url(#pg)"/>` +
  `<defs><linearGradient id="pg" x1="0" y1="0" x2="20" y2="22" gradientUnits="userSpaceOnUse">` +
  `<stop stop-color="#00D2FF"/><stop offset=".5" stop-color="#4F83F5"/><stop offset="1" stop-color="#FFCE00"/>` +
  `</linearGradient></defs></svg>`;

// ── navigation ──────────────────────────────────────────────────────────────

function nav(active) {
  const link = (key, href, id) =>
    `<a href="${href}"${id === active ? ' aria-current="page"' : ''} data-i18n="${key}">${tx(key)}</a>`;

  const langMenu = LANGUAGES.map((l) => `<li role="option" tabindex="0" data-lang="${l.code}"` +
    ` aria-selected="${l.code === 'en'}"><span class="lang-flag">${l.flag}</span>` +
    `<span class="lang-code">${l.code.toUpperCase()}</span><span class="lang-native">${l.native}</span>` +
    `<svg class="lang-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12.5 5 5L20 6.5"/></svg></li>`).join('');

  return `
  <a class="skip" href="#main" data-i18n="nav.skip">${tx('nav.skip')}</a>
  <div class="scroll-progress" aria-hidden="true"></div>
  <header class="nav">
    <div class="nav-in">
      <a class="brand" href="index.html">
        <span class="brand-mark" aria-hidden="true"></span>
        <span data-i18n="nav.brand">${tx('nav.brand')}</span>
      </a>
      <nav class="nav-links" aria-label="${esc(t('nav.aria'))}" data-i18n-attr="aria-label:nav.aria">
        ${link('nav.games', 'index.html#shelf', 'games')}
        ${link('nav.studio', 'studio.html', 'studio')}
        ${link('nav.press', 'press.html', 'press')}
        ${link('nav.privacy', 'privacy-policy.html', 'privacy')}
      </nav>
      <div class="nav-right">
        <div class="lang-wrap">
          <button class="lang-switcher" type="button" aria-haspopup="listbox" aria-expanded="false"
            ${i18nAttr({ 'aria-label': 'nav.langLabel' })}>
            <span class="lang-flag" data-lang-flag>🇬🇧</span>
            <span data-lang-code>EN</span>
            <svg class="caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <ul class="lang-menu" role="listbox" ${i18nAttr({ 'aria-label': 'nav.langLabel' })}>${langMenu}</ul>
        </div>
        <button class="theme-toggle" type="button" data-theme-state="auto"
          ${i18nAttr({ 'aria-label': 'nav.theme.auto' })}>
          <svg class="ti ti-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.2M12 19.4v2.2M4.2 12H2M22 12h-2.2M5.6 5.6 4 4M20 20l-1.6-1.6M18.4 5.6 20 4M4 20l1.6-1.6"/></svg>
          <svg class="ti ti-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"/></svg>
          <svg class="ti ti-auto" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><path d="M12 3.6v16.8a8.4 8.4 0 0 0 0-16.8Z" fill="currentColor" stroke="none"/></svg>
        </button>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu"
          ${i18nAttr({ 'aria-label': 'nav.menu' })}>
          <span class="mt-bar"></span><span class="mt-bar"></span>
        </button>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu" hidden>
      ${link('nav.games', 'index.html#shelf', 'games')}
      ${link('nav.studio', 'studio.html', 'studio')}
      ${link('nav.press', 'press.html', 'press')}
      ${link('nav.privacy', 'privacy-policy.html', 'privacy')}
    </div>
  </header>`;
}

// ── footer ──────────────────────────────────────────────────────────────────

function footer() {
  const gameLinks = live.map((g) =>
    `<a href="${pageUrl(g)}">${esc(g.name)}</a>`).join('');
  return `
  <footer class="foot">
    <div class="wrap foot-in">
      <div class="foot-brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <b data-i18n="nav.brand">${tx('nav.brand')}</b>
          ${el('p', 'footer.made')}
        </div>
      </div>
      <nav class="foot-col" aria-label="${esc(t('footer.gamesAria'))}" data-i18n-attr="aria-label:footer.gamesAria">
        ${el('h2', 'footer.games')}
        ${gameLinks}
      </nav>
      <nav class="foot-col" aria-label="${esc(t('footer.studioAria'))}" data-i18n-attr="aria-label:footer.studioAria">
        ${el('h2', 'footer.studio')}
        <a href="studio.html" data-i18n="nav.studio">${tx('nav.studio')}</a>
        <a href="press.html" data-i18n="nav.press">${tx('nav.press')}</a>
        <a href="privacy-policy.html" data-i18n="footer.privacyLink">${tx('footer.privacyLink')}</a>
      </nav>
      <div class="foot-col">
        ${el('h2', 'footer.contactTitle')}
        <a href="mailto:vaslixofficial@protonmail.com">vaslixofficial@protonmail.com</a>
        ${el('p', 'footer.replyTime', { class: 'foot-note' })}
      </div>
    </div>
    <div class="wrap foot-bottom">
      ${el('span', 'footer.copyright')}
      ${el('span', 'footer.builtWith', { class: 'foot-note' })}
    </div>
  </footer>`;
}

// ── document ────────────────────────────────────────────────────────────────

/**
 * A whole page. `body` is the markup between nav and footer; `accent` tints
 * the page for a single game.
 */
function page({ id, titleKey, descKey, body, canonical, accent, bodyClass = '', scripts = [] }) {
  const title = t(titleKey), desc = t(descKey);
  const url = `${SITE}/${canonical || (id === 'home' ? '' : id + '.html')}`;
  return `<!doctype html>
<html lang="en" data-page="${id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title data-i18n="${titleKey}">${esc(title)}</title>
<meta name="description" content="${esc(desc)}" data-i18n-attr="content:${descKey}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}" data-i18n-attr="content:${titleKey}">
<meta property="og:description" content="${esc(desc)}" data-i18n-attr="content:${descKey}">
<meta property="og:image" content="${SITE}/blocklix-icon.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F3F5FC" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1426" media="(prefers-color-scheme: dark)">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="blocklix-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="assets/site.css?v=__V__">
<script>/* theme and language before first paint, so nothing flashes */
document.documentElement.classList.add('js');
(function(){try{var t=localStorage.getItem('vaslix.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;
var l=localStorage.getItem('vaslix.lang');if(l)document.documentElement.lang=l;}catch(e){}})();</script>
</head>
<body class="${bodyClass}"${accent ? ` style="--acc:${accent}"` : ''}>
${nav(id)}
<main id="main">
${body}
</main>
${footer()}
<script src="assets/i18n.js?v=__V__"></script>
${scripts.map((s) => `<script src="${s}?v=__V__"></script>`).join("\n")}
<script src="assets/site.js?v=__V__" defer></script>
</body>
</html>
`;
}

module.exports = {
  page, nav, footer, sectionHead, playBadge, factGrid, chips, button, playGlyph,
  LANGUAGES, SITE, badgeSrc, externalAttrs,
};
