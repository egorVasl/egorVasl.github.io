#!/usr/bin/env node
/**
 * Pulls honest, shippable facts out of the two game repos so the website never
 * invents a number. Run it by hand whenever a game changes; it rewrites
 * src/data/game-data.json, which the site build reads.
 *
 *   node src/extract-game-data.js [--blocklix DIR] [--gridlix DIR]
 *
 * Everything here is a read: the game repos are never written to.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
// The game repos sit next to this one in StudioProjects/.
const SIBLING = path.resolve(__dirname, '..', '..');
const BLOCKLIX = argOf('blocklix', path.join(SIBLING, 'Blocklix'));
const GRIDLIX = argOf('gridlix', path.join(SIBLING, 'Gridlix'));

/** Site locale -> Android resource directory. */
const LOCALE_DIRS = {
  'en': 'values',
  'ru': 'values-ru',
  'es': 'values-es',
  'de': 'values-de',
  'fr': 'values-fr',
  'pt-BR': 'values-pt-rBR',
  'zh': 'values-zh-rCN',
};
const LOCALES = Object.keys(LOCALE_DIRS);

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

/** Android string escaping is not HTML escaping; undo the two that matter. */
const unescapeAndroid = (s) =>
  s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();

/** Every <string name=..> in one values dir, as a plain map. */
function stringsOf(resDir, localeDir) {
  const file = path.join(resDir, localeDir, 'strings.xml');
  if (!exists(file)) return {};
  const xml = read(file);
  const out = {};
  const re = /<string\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g;
  let m;
  while ((m = re.exec(xml))) out[m[1]] = unescapeAndroid(m[2]);
  return out;
}

/** The same key across all seven locales; throws when a locale is missing it. */
function localized(tables, key, where) {
  const out = {};
  for (const loc of LOCALES) {
    const v = tables[loc][key];
    if (!v) throw new Error(`${where}: "${key}" missing in ${loc}`);
    out[loc] = v;
  }
  return out;
}

// ── Blocklix ────────────────────────────────────────────────────────────────
function blocklix() {
  const res = path.join(BLOCKLIX, 'core/designsystem/src/main/res');
  const shopRes = path.join(BLOCKLIX, 'feature/shop/src/main/res');
  const tables = {}, shopTables = {};
  for (const [loc, dir] of Object.entries(LOCALE_DIRS)) {
    tables[loc] = stringsOf(res, dir);
    shopTables[loc] = stringsOf(shopRes, dir);
  }

  // Palettes: colours from ThemePalette.kt, order from AllThemePalettes,
  // display names from displayNameFor() (English only — the game does not
  // translate theme names, so neither do we).
  const paletteSrc = read(path.join(
    BLOCKLIX, 'core/designsystem/src/main/kotlin/com/vaslix/games/blocklix/designsystem/ThemePalette.kt'));
  const themesSrc = read(path.join(
    BLOCKLIX, 'feature/themes/src/main/kotlin/com/vaslix/games/blocklix/feature/themes/ThemesRoute.kt'));

  const names = {};
  const nameBlock = /internal fun displayNameFor[\s\S]*?\n\}/.exec(themesSrc)[0];
  for (const m of nameBlock.matchAll(/"([a-z0-9_]+)"\s*->\s*"([^"]+)"/g)) names[m[1]] = m[2];

  const byVal = {};
  for (const m of paletteSrc.matchAll(/val\s+(\w+ThemePalette)\s*=\s*ThemePalette\(([\s\S]*?)\n\)/g)) {
    const [, valName, body] = m;
    const hex = (k) => {
      const r = new RegExp(k + '\\s*=\\s*Color\\(0x([0-9A-Fa-f]{8})\\)').exec(body);
      return r ? '#' + r[1].slice(2) : null;
    };
    const id = /id\s*=\s*"([^"]+)"/.exec(body);
    if (!id) continue;
    const bgLine = /backgroundGradient\s*=\s*\w+\(listOf\(([\s\S]*?)\)\)/.exec(body);
    const sky = bgLine
      ? [...bgLine[1].matchAll(/0x([0-9A-Fa-f]{8})/g)].map((c) => '#' + c[1].slice(2))
      : [];
    byVal[valName] = {
      id: id[1],
      name: names[id[1]] || id[1],
      sky,
      blocks: ['blockPink','blockOrange','blockBlue','blockGreen',
               'blockPurple','blockYellow','blockTeal','blockRed'].map(hex),
    };
  }
  const order = /val AllThemePalettes[\s\S]*?listOf\(([\s\S]*?)\n\)/.exec(paletteSrc)[1]
    .split(',').map((s) => s.trim()).filter(Boolean);
  const palettes = order.map((v) => {
    if (!byVal[v]) throw new Error('Blocklix: no palette block for ' + v);
    return byVal[v];
  });

  // Four themes are seeded free in the database.
  const FREE = ['blockblast', 'quiet', 'classic', 'comet'];
  palettes.forEach((p) => { p.free = FREE.includes(p.id); });

  const diffIds = ['easy', 'normal', 'hard', 'expert', 'master', 'insane'];
  const difficulties = diffIds.map((id) => ({
    id,
    name: localized(tables, 'difficulty_' + id, 'Blocklix difficulty'),
    desc: localized(tables, 'difficulty_' + id + '_desc', 'Blocklix difficulty'),
  }));

  const rankIds = ['stone','bronze','silver','gold','platinum','emerald','ruby','diamond',
                   'master','grandmaster','legend','mythic','celestial','cosmic','eternal'];
  const ranks = rankIds.map((id) => ({ id, name: localized(tables, 'rank_family_' + id, 'Blocklix rank') }));

  const boosterIds = ['hammer', 'bomb', 'lightning', 'shuffle'];
  const boosters = boosterIds.map((id) => ({
    id,
    name: localized(shopTables, 'shop_booster_' + id, 'Blocklix booster'),
    desc: localized(shopTables, 'shop_booster_' + id + '_desc', 'Blocklix booster'),
  }));

  const gradle = read(path.join(BLOCKLIX, 'app/build.gradle.kts'));
  const langDirs = fs.readdirSync(path.join(BLOCKLIX, 'core/designsystem/src/main/res'))
    .filter((d) => /^values(-[a-zA-Z]{2}(-r[A-Z]{2})?)?$/.test(d));

  return {
    id: 'blocklix',
    applicationId: /applicationId\s*=\s*"([^"]+)"/.exec(gradle)[1],
    languages: langDirs.length,
    palettes, difficulties, ranks, boosters,
  };
}

// ── Gridlix ─────────────────────────────────────────────────────────────────
function gridlix() {
  const res = path.join(GRIDLIX, 'feature/game/src/main/res');
  const tables = {};
  for (const [loc, dir] of Object.entries(LOCALE_DIRS)) tables[loc] = stringsOf(res, dir);

  const settings = read(path.join(
    GRIDLIX, 'domain/src/main/kotlin/com/vaslix/games/gridlix/domain/model/Settings.kt'));
  const colorSrc = read(path.join(
    GRIDLIX, 'feature/game/src/main/kotlin/com/vaslix/games/gridlix/feature/game/ui/theme/Color.kt'));

  const themeBlock = /enum class ColorTheme[\s\S]*?\n\}/.exec(settings)[0];
  const themes = [...themeBlock.matchAll(/([A-Z_]+)\(isPremium\s*=\s*(true|false)\)/g)].map((m) => {
    const key = m[1];
    const pretty = key[0] + key.slice(1).toLowerCase();
    const accentName = (key === 'DEFAULT' ? 'Default' : pretty) + 'Accents';
    const accent = new RegExp(accentName + `[\\s\\S]*?light = Color\\(0x([0-9A-Fa-f]{8})\\)`).exec(colorSrc);
    const tilesName = (key === 'DEFAULT' ? 'Default' : pretty) + 'Tiles';
    const tilesBlock = new RegExp('val ' + tilesName + '[\\s\\S]*?\\n\\)').exec(colorSrc);
    const tiles = tilesBlock
      ? [...tilesBlock[0].matchAll(/TilePalette\(Color\(0x([0-9A-Fa-f]{8})\),\s*Color\(0x([0-9A-Fa-f]{8})\)\)/g)]
          .map((t) => ['#' + t[1].slice(2), '#' + t[2].slice(2)])
      : [];
    return { id: key.toLowerCase(), name: pretty, premium: m[2] === 'true',
             accent: accent ? '#' + accent[1].slice(2) : null, tiles };
  });

  const boosterIds = ['undo', 'delete', 'swap', 'value_clear', 'shuffle'];
  const boosters = boosterIds.map((id) => ({
    id, name: localized(tables, 'booster_' + id, 'Gridlix booster'),
  }));

  const boostersState = read(path.join(
    GRIDLIX, 'domain/src/main/kotlin/com/vaslix/games/gridlix/domain/model/BoostersState.kt'));
  const usesPerGame = +/MAX_USES_PER_GAME\s*=\s*(\d+)/.exec(boostersState)[1];

  const mission = read(path.join(
    GRIDLIX, 'domain/src/main/kotlin/com/vaslix/games/gridlix/domain/model/Mission.kt'));
  const missionTypes = [...mission.matchAll(/^\s{4}([A-Z_]+)\(pool/gm)].map((m) => m[1]);

  const grid = read(path.join(
    GRIDLIX, 'domain/src/main/kotlin/com/vaslix/games/gridlix/domain/model/Grid.kt'));
  const boardSize = +/const val SIZE = (\d+)/.exec(grid)[1];

  const locale = read(path.join(
    GRIDLIX, 'feature/game/src/main/kotlin/com/vaslix/games/gridlix/feature/game/locale/LocaleController.kt'));
  const supported = [...(/supportedTags[\s\S]*?listOf\(([\s\S]*?)\)/.exec(locale)[1])
    .matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  const gradle = read(path.join(GRIDLIX, 'app/build.gradle.kts'));

  return {
    id: 'gridlix',
    applicationId: /applicationId\s*=\s*"([^"]+)"/.exec(gradle)[1],
    languages: supported.length,
    boardSize,
    usesPerGame,
    missionTypes,
    themes, boosters,
    medals: ['bronze', 'silver', 'gold'].map((t) => ({
      id: t, name: localized(tables, 'medal_tier_' + t, 'Gridlix medal'),
    })),
  };
}

const out = { generated: new Date().toISOString().slice(0, 10), blocklix: blocklix(), gridlix: gridlix() };
const dest = path.join(__dirname, 'data', 'game-data.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log('wrote', path.relative(process.cwd(), dest));
console.log(`  Blocklix: ${out.blocklix.palettes.length} palettes, ${out.blocklix.difficulties.length} difficulties, ` +
            `${out.blocklix.ranks.length} rank families, ${out.blocklix.boosters.length} boosters, ${out.blocklix.languages} languages`);
console.log(`  Gridlix:  ${out.gridlix.themes.length} themes, ${out.gridlix.boosters.length} boosters, ` +
            `${out.gridlix.usesPerGame} uses each per game, ${out.gridlix.languages} languages`);
