/**
 * The dictionary is key-major on disk — one key, seven languages side by side —
 * because that is the only shape in which a missing translation is obvious.
 * The runtime wants the opposite, so the build flips it.
 *
 * One file per page, plus shared.json for what every page says. A key belongs
 * to exactly one of them; defining it twice is an error rather than a silent
 * override, because a key in two files is a key that will be edited in one.
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['en', 'ru', 'es', 'de', 'fr', 'pt-BR', 'zh'];
const BASE = 'en';

const dir = path.join(__dirname, '..', 'i18n');
const load = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const parts = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== 'aliases.map.json')
  .sort();
const dict = {};
const home = {};
for (const part of parts) {
  for (const [key, row] of Object.entries(load(part))) {
    if (home[key]) throw new Error(`i18n: "${key}" is in both ${home[key]} and ${part}`);
    home[key] = part;
    dict[key] = row;
  }
}

// A new key that says exactly what an existing one says points at it rather
// than copying it, so correcting the original corrects both.
const aliasOf = {};
for (const [alias, source] of Object.entries(load('aliases.map.json'))) {
  if (!dict[source]) throw new Error('i18n: alias ' + alias + ' points at missing ' + source);
  dict[alias] = dict[source];
  (aliasOf[source] ||= []).push(alias);
}

/**
 * Keys no page asks for at build time but the site still needs: site.js looks
 * these up in the runtime dictionary while it is running. Delete one and the
 * build stays green while the button loses its label.
 */
const RUNTIME = ['nav.theme.light', 'nav.theme.dark', 'nav.theme.auto', 'press.copied'];
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
/**
 * A key nothing asked for. A key an alias points at counts as used when the
 * alias was used — it is the same row — and so do the runtime-only keys above.
 */
const unused = () => Object.keys(dict).filter((k) =>
  !used.has(k) && !RUNTIME.includes(k) && !(aliasOf[k] || []).some((a) => used.has(a)));

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
