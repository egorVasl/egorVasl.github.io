# How this site is built

Every `.html` in the repository root is **generated**. Editing one by hand loses
the change on the next build and breaks the six other languages with it.

```sh
npm run extract   # re-read the game repos → src/data/game-data.json
npm run build     # → index, blocklix, gridlix, studio, press, 404, sitemap, robots
```

`privacy-policy.html` is the one exception: it is maintained by hand and the
build never touches it.

## Where things live

| Path | What it is |
|---|---|
| `src/data/games.js` | The catalogue. One record per title — this is the only place a new game is added. |
| `src/data/game-data.json` | Facts pulled out of the game repos: palettes, difficulties, ranks, boosters, medals. Generated. |
| `src/i18n/*.json` | The dictionary, key-major: one key, seven languages side by side. |
| `src/i18n/aliases.map.json` | New keys that point at an older key instead of copying its text. |
| `src/pages/*.js` | One module per page; a game page assembles shared modules named by its record. |
| `src/lib/` | The document shell, the markup helpers, the dictionary loader. |
| `assets/site.css`, `assets/site.js` | Hand-written, not generated. Everything visual and everything that moves. |
| `assets/i18n.js`, `assets/game-data.js` | Generated runtime data. |

## What the build refuses to do

It exits non-zero, having written nothing, when

* a key is missing from any of the seven locales, or is blank;
* markup asks for a `data-i18n` key the dictionary does not have;
* a link points at a file that will not exist;
* a game record names a page module that does not exist.

A site that is right in English and wrong in Portuguese is the failure this
guards against, so please do not weaken it.

## Adding a game

1. Add the record to `src/data/games.js` — id, name, status, accent, motif, facts.
2. Add its strings (`g.<id>.tagline`, `g.<id>.chip.N`, …) to `src/i18n/catalogue.json`
   in all seven languages. The build will list exactly which keys it wants.
3. If it is live, give it `sections: [...]` naming the page modules it uses.

The shelf, the hero buttons, the cross-links, the counters and the sitemap all
follow. The empty slot at the end of the shelf moves along by itself.

## Adding a language

`LOCALES` in `src/lib/i18n.js`, a badge asset in `badges/`, an entry in
`LANGUAGES` in `src/lib/layout.js`, and then every key in `src/i18n/` needs the
new locale — the build will not let you forget one.
