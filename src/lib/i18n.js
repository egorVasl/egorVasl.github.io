/**
 * The dictionary is key-major on disk — one key, seven languages side by side —
 * because that is the only shape in which a missing translation is obvious.
 * The runtime wants the opposite, so the build flips it.
 *
 * Two sources merge: legacy.json (everything the previous site already said,
 * in all seven languages) and site.json (this site's copy). site.json wins.
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['en', 'ru', 'es', 'de', 'fr', 'pt-BR', 'zh'];
const BASE = 'en';

const dir = path.join(__dirname, '..', 'i18n');
const load = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

// legacy.json is what the previous site already said in all seven languages;
// every other file in src/i18n/ is this site's copy and wins on a clash.
const parts = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== 'legacy.json' && f !== 'aliases.map.json')
  .sort();
const dict = Object.assign({}, load('legacy.json'), ...parts.map(load));

// A new key that says exactly what an existing one says points at it rather
// than copying it, so correcting the original corrects both.
for (const [alias, source] of Object.entries(load('aliases.map.json'))) {
  if (!dict[source]) throw new Error('i18n: alias ' + alias + ' points at missing ' + source);
  dict[alias] = dict[source];
}
const used = new Set();
const missing = new Set();

/** Parity check: every key carries every locale, and nothing is blank. */
function validate() {
  const problems = [];
  for (const [key, row] of Object.entries(dict)) {
    for (const loc of LOCALES) {
      if (typeof row[loc] !== 'string' || !row[loc].trim()) {
        problems.push(`${key}: missing or empty "${loc}"`);
      }
    }
    const extra = Object.keys(row).filter((l) => !LOCALES.includes(l));
    if (extra.length) problems.push(`${key}: unknown locale(s) ${extra.join(', ')}`);
  }
  return problems;
}

/** The English string for a key, and a note that the key is in use. */
function t(key) {
  const row = dict[key];
  if (!row) { missing.add(key); return '⟨' + key + '⟩'; }
  used.add(key);
  return row[BASE];
}

/** Strings lifted out of a game's own resources join the same dictionary. */
function add(key, row) {
  if (dict[key]) throw new Error('i18n: duplicate key ' + key);
  dict[key] = row;
}

const has = (key) => Object.prototype.hasOwnProperty.call(dict, key);
const unused = () => Object.keys(dict).filter((k) => !used.has(k));

/** Locale-major, the shape the browser wants. */
function runtimeDict() {
  const out = {};
  for (const loc of LOCALES) {
    out[loc] = {};
    for (const key of Object.keys(dict).sort()) out[loc][key] = dict[key][loc];
  }
  return out;
}

module.exports = { LOCALES, BASE, dict, t, add, has, used, missing, unused, validate, runtimeDict };
