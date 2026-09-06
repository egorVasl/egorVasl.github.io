/**
 * The catalogue. One record per thing the studio ships or intends to ship.
 *
 * Adding a title is a record here plus its strings in src/i18n/site.json —
 * the shelf, the hero buttons, the roadmap, the cross-links and (for a live
 * one) its own page all come from this list. Nothing about the layout is
 * per-game; if a record needs new markup, the record is wrong.
 *
 * Every `*Key` resolves through the dictionary, so `g.<id>.tagline` and the
 * rest must exist in all seven locales or the build fails.
 */
const data = require('./game-data.json');

/** Status decides everything visible: a page, a badge, a muted panel. */
const LIVE = 'live';   // on Google Play, has its own page
const DEV = 'dev';     // announced, being built, no store link yet
const IDEA = 'idea';   // on the roadmap, honestly nothing more

const games = [
  {
    id: 'blocklix',
    name: 'Blocklix',
    status: LIVE,
    storeId: 'com.vaslix.games.blocklix',
    icon: 'blocklix-icon.png',
    accent: '#FF6FA8',
    accentDark: '#FF8FBC',
    /** Which abstract motif the shelf canvas draws for this title. */
    motif: 'blocks',
    /** The literal demo its own page is allowed to show. */
    demo: 'drop',
    /** Which page modules this title fills, in order. Modules are shared. */
    sections: ['how', 'palettes', 'difficulty', 'progress', 'boosters', 'premium'],
    languages: data.blocklix.languages,
    facts: [
      { n: String(data.blocklix.palettes.length), key: 'f.themes' },
      { n: String(data.blocklix.ranks.length * 4), key: 'f.ranks' },
      { n: String(data.blocklix.difficulties.length), key: 'f.difficulties' },
    ],
    chips: 3,
  },
  {
    id: 'gridlix',
    name: 'Gridlix:2048',
    status: LIVE,
    storeId: 'com.vaslix.games.gridlix',
    icon: 'gridlix-icon.webp',
    accent: '#6C5DD3',
    accentDark: '#9689E5',
    motif: 'tiles',
    demo: 'merge',
    sections: ['how', 'daily', 'month', 'boosters', 'themes', 'premium'],
    languages: data.gridlix.languages,
    facts: [
      { n: '★★★', key: 'f.daily' },
      { n: String(data.gridlix.boosters.length), key: 'f.boosters' },
      { n: String(data.gridlix.themes.length), key: 'f.themes' },
    ],
    chips: 3,
  },
  {
    id: 'audio',
    name: 'Vaslix Audio',
    status: DEV,
    accent: '#0FB4C8',
    accentDark: '#3ED8E8',
    motif: 'waves',
    facts: [],
    chips: 2,
  },
  {
    id: 'words',
    name: 'Wordlix',
    status: IDEA,
    accent: '#5EBC5A',
    accentDark: '#7FD97B',
    motif: 'letters',
    facts: [],
    chips: 2,
  },
];

/** Store URL for a title that has one; null otherwise. */
const storeUrl = (g) =>
  g.storeId ? `https://play.google.com/store/apps/details?id=${g.storeId}` : null;

/** A live title owns a page; nothing else does. */
const pageUrl = (g) => (g.status === LIVE ? `${g.id}.html` : null);

const live = games.filter((g) => g.status === LIVE);

/** Studio-level numbers, counted rather than claimed. */
const studioNumbers = {
  games: live.length,
  languages: Math.max(...live.map((g) => g.languages)),
  accounts: 0,
  servers: 0,
  people: 1,
  since: 2025,
};

module.exports = { games, live, LIVE, DEV, IDEA, storeUrl, pageUrl, studioNumbers, data };
