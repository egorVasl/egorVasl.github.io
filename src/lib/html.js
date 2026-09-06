/**
 * Markup helpers. Every visible string goes through one of these so that the
 * built HTML carries English text (for search engines and for a reader with
 * JavaScript off) alongside the key the runtime swaps it by.
 */
const { t } = require('./i18n');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Strings that carry their own markup (<strong>, <a>) are inserted raw. */
const rich = (s) => (/[<&]/.test(s) ? s : esc(s));

/**
 * An element whose text comes from the dictionary.
 *   el('h2', 'shelf.title', { class: 'sec-title' })
 */
function el(tag, key, attrs = {}) {
  const a = { ...attrs, 'data-i18n': key };
  return `<${tag}${attrsOf(a)}>${rich(t(key))}</${tag}>`;
}

/** Attribute string from an object; false/null/undefined values drop out. */
function attrsOf(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');
}

/**
 * Localised attributes: data-i18n-attr="aria-label:key;title:key".
 * Returns the attribute pairs already filled with English.
 */
function i18nAttr(map) {
  const parts = [], spec = [];
  for (const [attr, key] of Object.entries(map)) {
    parts.push(` ${attr}="${esc(t(key))}"`);
    spec.push(`${attr}:${key}`);
  }
  return parts.join('') + ` data-i18n-attr="${spec.join(';')}"`;
}

/** Raw dictionary text, no element around it. */
const tx = (key) => rich(t(key));

module.exports = { esc, rich, el, attrsOf, i18nAttr, tx, t };
