#!/usr/bin/env node
/**
 * Builds every page of the site. Nothing in the repository root is edited by
 * hand: run this and it rewrites the HTML, the runtime dictionary and the
 * version stamps.
 *
 *   node src/build-site.js
 *
 * The build refuses to write anything if a key is missing from any of the
 * seven locales, if a data-i18n in the produced markup does not resolve, or if
 * a page module named by a game record does not exist. A site that lies in one
 * language is worse than a site that failed to build.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const i18n = require('./lib/i18n');
const layout = require('./lib/layout');
const { games, live, data } = require('./data/games');

const ROOT = path.join(__dirname, '..');
const out = (...p) => path.join(ROOT, ...p);

// ── strings that come from the games themselves ─────────────────────────────
/**
 * Difficulty names, rank families and booster labels are already translated
 * inside the apps. Lifting them keeps the site and the game saying the same
 * words in the same language, and costs no new translation.
 */
function injectGameStrings() {
  for (const d of data.blocklix.difficulties) {
    i18n.add(`gd.blocklix.diff.${d.id}.name`, d.name);
    i18n.add(`gd.blocklix.diff.${d.id}.desc`, d.desc);
  }
  for (const r of data.blocklix.ranks) i18n.add(`gd.blocklix.rank.${r.id}`, r.name);
  for (const b of data.blocklix.boosters) {
    i18n.add(`gd.blocklix.booster.${b.id}.name`, b.name);
    i18n.add(`gd.blocklix.booster.${b.id}.desc`, b.desc);
  }
  for (const b of data.gridlix.boosters) i18n.add(`gd.gridlix.booster.${b.id}.name`, b.name);
  for (const m of data.gridlix.medals) i18n.add(`gd.gridlix.medal.${m.id}`, m.name);
}

// ── checks on the produced markup ───────────────────────────────────────────
/** Every key the HTML asks the runtime for must exist in the dictionary. */
function auditMarkup(file, html, problems, known) {
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) {
    if (!i18n.has(m[1])) problems.push(`${file}: data-i18n="${m[1]}" has no dictionary entry`);
  }
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(';')) {
      const key = pair.split(':')[1];
      if (!key || !i18n.has(key)) problems.push(`${file}: data-i18n-attr "${pair}" has no dictionary entry`);
    }
  }
  const leaked = html.match(/⟨[^⟩]+⟩/g);
  if (leaked) problems.push(`${file}: unresolved ${[...new Set(leaked)].join(', ')}`);
  for (const m of html.matchAll(/(?:href|src)="(?!https?:|mailto:|data:|#)([^"]+)"/g)) {
    const target = m[1].split(/[#?]/)[0];
    if (!target) continue;
    if (!known.has(target) && !fs.existsSync(out(target))) problems.push(`${file}: broken link ${m[1]}`);
  }
}

// ── build ───────────────────────────────────────────────────────────────────
function build() {
  injectGameStrings();

  const pages = [
    require('./pages/home')(),
    ...live.map((g) => require('./pages/gamePage')(g)),
    require('./pages/studio')(),
    require('./pages/privacy')(),
    require('./pages/press')(),
    require('./pages/notFound')(),
  ];

  // The dictionary is written first: the version stamp covers it too.
  const dictJs = 'window.VASLIX_I18N = ' + JSON.stringify(i18n.runtimeDict()) + ';\n';
  // Only what the pages actually paint with: the palette colours and names.
  const paletteJs = 'window.VASLIX_PALETTES = ' + JSON.stringify(
    data.blocklix.palettes.map((p) => ({ id: p.id, name: p.name, sky: p.sky, blocks: p.blocks }))) + ';\n';
  const version = crypto.createHash('sha1')
    .update(dictJs)
    .update(paletteJs)
    .update(fs.readFileSync(out('assets/site.css')))
    .update(fs.readFileSync(out('assets/site.js')))
    .digest('hex').slice(0, 8);

  const problems = i18n.validate();
  const rendered = pages.map((p) => {
    const file = p.id === 'home' ? 'index.html' : `${p.id}.html`;
    const html = layout.page(p).replace(/__V__/g, version);
    return { file, html };
  });

  if (i18n.missing.size) {
    for (const key of [...i18n.missing].sort()) problems.push(`dictionary: no entry for "${key}"`);
  }
  const known = new Set(rendered.map((r) => r.file));
  for (const { file, html } of rendered) auditMarkup(file, html, problems, known);

  if (problems.length) {
    console.error(`\nBuild failed — ${problems.length} problem(s):\n`);
    for (const p of problems.slice(0, 1000)) console.error('  • ' + p);
    if (problems.length > 1000) console.error(`  … and ${problems.length - 1000} more`);
    process.exit(1);
  }

  fs.writeFileSync(out('assets/i18n.js'), dictJs);
  fs.writeFileSync(out('assets/game-data.js'), paletteJs);
  for (const { file, html } of rendered) fs.writeFileSync(out(file), html);

  // Search engines get a map of exactly what was built, nothing hand-kept.
  const urls = rendered.map((r) => r.file)
    .filter((f) => f !== '404.html')
    .map((f) => `  <url><loc>${layout.SITE}/${f === 'index.html' ? '' : f}</loc></url>`);
  fs.writeFileSync(out('sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') + '\n</urlset>\n');
  fs.writeFileSync(out('robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${layout.SITE}/sitemap.xml\n`);

  const unused = i18n.unused();
  console.log(`built ${rendered.length} pages at v${version}`);
  for (const { file, html } of rendered) {
    console.log(`  ${file.padEnd(16)} ${(html.length / 1024).toFixed(1)} KB`);
  }
  console.log(`  ${i18n.LOCALES.length} locales × ${Object.keys(i18n.dict).length} keys`);
  if (unused.length) console.log(`  ${unused.length} unused key(s): ${unused.slice(0, 12).join(', ')}${unused.length > 12 ? ' …' : ''}`);
}

build();
