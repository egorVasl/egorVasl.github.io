#!/usr/bin/env node
/**
 * Renders the brand assets that have to be raster: the social cards and the
 * PNG copies of the logo. Run it by hand, commit what it writes.
 *
 *   node src/tools/render-assets.js [--chrome /path/to/Chrome]
 *
 * It is deliberately not part of `npm run build`. These files change when the
 * logo or a game icon changes — perhaps once a year — and the build runs on
 * every edit; keeping a browser out of the build is what lets the site be
 * rebuilt on a machine with no network and nothing installed but node.
 *
 * The card text comes from the dictionary, so a card cannot quietly disagree
 * with the page it represents. Social cards do not switch language: English
 * is what everyone gets.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const i18n = require('../lib/i18n');
const { live } = require('../data/games');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'og');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'vaslix-render-'));

const CHROME = (() => {
  const flag = process.argv.indexOf('--chrome');
  if (flag > -1 && process.argv[flag + 1]) return process.argv[flag + 1];
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    console.error('No Chrome found. Pass one with --chrome /path/to/Chrome.');
    process.exit(1);
  }
  return found;
})();

/** A file: URL for an asset, so the card can inline the real logo and icons. */
const asset = (rel) => 'file://' + path.join(ROOT, rel);

// ── the cards ───────────────────────────────────────────────────────────────

const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Manrope:wght@600;700&display=swap';

const shell = (body, css) => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    display: flex; font-family: "Manrope", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  h1 { font-family: "Bricolage Grotesque", system-ui, sans-serif; margin: 0; }
  ${css}
</style></head><body>${body}</body></html>`;

/** The studio card: every page that is not a game page shares it. */
function studioCard() {
  return shell(`
  <div class="card">
    <img class="lockup" src="${asset('assets/logo-lockup-dark.svg')}" alt="">
    <h1><span>${i18n.t('hero.t1')}</span><span>${i18n.t('hero.t2')}</span></h1>
    <p>${i18n.t('hero.kick')}</p>
  </div>`, `
  .card {
    flex: 1; position: relative; padding: 84px 90px;
    display: flex; flex-direction: column; justify-content: center; gap: 34px;
    background: #0F1426; color: #EEF1FB;
  }
  /* The site's own gradient, laid over the dark ground rather than beside it —
     at thumbnail size a card has to read as a colour, not as a dark rectangle. */
  .card::before {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(118deg, #4AC8EA 0%, #4F83F5 46%, #6C5DD3 100%);
    opacity: .30;
  }
  .card::after {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(900px 620px at 4% -24%, rgba(74,200,234,.34), transparent 58%),
      radial-gradient(980px 680px at 100% 124%, rgba(108,93,211,.52), transparent 60%);
  }
  /* Both tint layers are absolute; the content has to outrank them. */
  .card > * { position: relative; z-index: 1; }
  .lockup { width: 452px; height: auto; }
  h1 {
    font-size: 96px; line-height: .96; font-weight: 800;
    font-variation-settings: "opsz" 96; letter-spacing: -.045em;
  }
  h1 span { display: block; }
  p {
    margin: 0; font-size: 22px; font-weight: 700; letter-spacing: .17em;
    text-transform: uppercase; color: #7BA5FF;
  }`);
}

/** A game card: the icon does the talking, the way it does on the store. */
function gameCard(g) {
  return shell(`
  <div class="card">
    <img class="icon" src="${asset(g.icon)}" alt="">
    <div class="text">
      <h1>${g.name}</h1>
      <p class="tag">${i18n.t(`g.${g.id}.tagline`)}</p>
      <p class="pill">${i18n.t('status.live')}</p>
    </div>
    <img class="mark" src="${asset('assets/logo.svg')}" alt="">
  </div>`, `
  .card {
    flex: 1; position: relative; padding: 0 92px;
    display: flex; align-items: center; gap: 62px;
    background: #0F1426; color: #EEF1FB;
  }
  /* The game's own accent does here what the brand gradient does on the studio
     card: carries the colour, so the thumbnail is recognisably this title. */
  .card::before {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(118deg, ${hexA(g.accent, 1)} 0%, ${hexA(g.accentDark, 1)} 100%);
    opacity: .34;
  }
  .card::after {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(820px 580px at 10% -18%, ${hexA(g.accent, 0.52)}, transparent 60%),
      radial-gradient(900px 620px at 96% 120%, rgba(15,20,38,.60), transparent 62%);
  }
  /* Both tint layers are absolute; the content has to outrank them. */
  .card > * { position: relative; z-index: 1; }
  .icon { width: 300px; height: 300px; border-radius: 68px; flex: none;
          box-shadow: 0 34px 80px rgba(0,0,0,.55); }
  .text { min-width: 0; }
  h1 { font-size: 84px; line-height: 1; font-weight: 800;
       font-variation-settings: "opsz" 96; letter-spacing: -.045em; }
  .tag { margin: 22px 0 0; font-size: 27px; line-height: 1.35; color: #C8CFE6; max-width: 20ch; }
  .pill {
    display: inline-block; margin: 30px 0 0; padding: 12px 22px; border-radius: 999px;
    background: ${'rgba(255,255,255,.10)'}; color: #EEF1FB;
    font-size: 18px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  }
  .mark { position: absolute; right: 62px; bottom: 52px; width: 62px; height: 62px; opacity: .92; }`);
}

/** #RRGGBB → rgba(), so a game's accent can tint its own card. */
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** The logo, as PNG, for the places that cannot take an SVG. */
const logoCard = (px) => shell(
  `<img src="${asset('assets/logo.svg')}" alt="">`,
  `html, body { width: ${px}px; height: ${px}px; background: transparent; }
   img { width: ${px}px; height: ${px}px; }`);

// ── the browser ─────────────────────────────────────────────────────────────

/**
 * Chrome writes the screenshot and then, on some machines, declines to exit.
 * So: wait for the file rather than for the process, then end it ourselves.
 */
function shoot(html, out, w, h, transparent) {
  const page = path.join(WORK, path.basename(out) + '.html');
  fs.writeFileSync(page, html);
  if (fs.existsSync(out)) fs.unlinkSync(out);

  const args = [
    '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${w},${h}`,
    `--user-data-dir=${path.join(WORK, 'profile')}`,
    `--screenshot=${out}`,
  ];
  if (transparent) args.push('--default-background-color=00000000');
  args.push('file://' + page);

  const child = spawn(CHROME, args, { stdio: 'ignore' });
  const deadline = Date.now() + 90_000;
  return new Promise((resolve, reject) => {
    const tick = setInterval(() => {
      let size = 0;
      try { size = fs.statSync(out).size; } catch (e) { /* not written yet */ }
      // A non-empty file that stopped growing is a finished screenshot.
      if (size > 0) {
        clearInterval(tick);
        setTimeout(() => { child.kill('SIGKILL'); resolve(size); }, 400);
      } else if (Date.now() > deadline) {
        clearInterval(tick);
        child.kill('SIGKILL');
        reject(new Error(`timed out rendering ${path.basename(out)}`));
      }
    }, 250);
  });
}

// ── run ─────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const jobs = [
    ['assets/og/site.png', studioCard(), 1200, 630, false],
    ...live.map((g) => [`assets/og/${g.id}.png`, gameCard(g), 1200, 630, false]),
    ['assets/logo-180.png', logoCard(180), 180, 180, true],
    ['assets/logo-512.png', logoCard(512), 512, 512, true],
    ['assets/logo-1024.png', logoCard(1024), 1024, 1024, true],
  ];
  for (const [rel, html, w, h, transparent] of jobs) {
    const size = await shoot(html, path.join(ROOT, rel), w, h, transparent);
    console.log(`  ${rel.padEnd(26)} ${w}×${h}  ${(size / 1024).toFixed(1)} KB`);
  }
  fs.rmSync(WORK, { recursive: true, force: true });
  console.log(`rendered ${jobs.length} assets`);
}

main().catch((err) => {
  console.error(err.message);
  fs.rmSync(WORK, { recursive: true, force: true });
  process.exit(1);
});
