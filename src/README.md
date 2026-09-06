# How this site is built

Every `.html` in the repository root is **generated**. Editing one by hand loses
the change on the next build and breaks the six other languages with it.

```sh
npm run extract   # re-read the game repos → src/data/game-data.json
npm run build     # → index, blocklix, gridlix, studio, privacy, press, 404, sitemap, robots
```


## Where things live

| Path | What it is |
|---|---|
| `src/data/games.js` | The catalogue. One record per title — this is the only place a new game is added. |
| `src/data/game-data.json` | Facts pulled out of the game repos: palettes, difficulties, ranks, boosters, medals. Generated. |
| `src/i18n/*.json` | The dictionary, key-major: one key, seven languages side by side. One file per page, plus `shared.json` for what every page says. A key lives in exactly one of them. |
| `src/i18n/aliases.map.json` | New keys that point at an older key instead of copying its text. |
| `src/pages/*.js` | One module per page; a game page assembles shared modules named by its record. |
| `src/pages/privacy.js` | The policy. Its sections are data — the order is the only thing arranged by hand. |
| `src/lib/` | The document shell, the markup helpers, the dictionary loader. |
| `assets/site.css`, `assets/site.js` | Hand-written, not generated. Everything visual and everything that moves. |
| `assets/logo.svg` | The studio mark. Nav, footer, favicon, press kit and every PNG below come from this one file. |
| `assets/logo-lockup*.svg` | The mark with the name beside it, light and dark. Press kit and social cards. |
| `assets/og/`, `assets/logo-*.png` | Raster copies. Generated — see below. |
| `src/tools/render-assets.js` | Renders those raster copies with a headless Chrome. Run by hand. |
| `assets/i18n.js`, `assets/game-data.js` | Generated runtime data. |

## What the build refuses to do

It exits non-zero, having written nothing, when

* a key is missing from any of the seven locales, or is blank;
* markup asks for a `data-i18n` key the dictionary does not have;
* a link points at a file that will not exist;
* a game record names a page module that does not exist;
* the same key is defined in two dictionary files.

A site that is right in English and wrong in Portuguese is the failure this
guards against, so please do not weaken it.

It reports unused keys but does not fail on them. Two are unused on purpose:
`status.dev` and `shelf.count.soon` are the vocabulary for a title that is in
development, and there is not one at the moment. A handful of keys the build
cannot see are listed as `RUNTIME` in `src/lib/i18n.js` — `assets/site.js`
looks those up while the page is running, so deleting one leaves the build
green and the button unlabelled.

## Adding a game

1. Add the record to `src/data/games.js` — id, name, status, accent, motif, facts.
2. Add its strings (`g.<id>.tagline`, `g.<id>.chip.N`, …) to `src/i18n/games.json`
   in all seven languages. The build will list exactly which keys it wants.
3. If it is live, give it `sections: [...]` naming the page modules it uses.

The shelf, the hero buttons, the cross-links, the counters and the sitemap all
follow. The empty slot at the end of the shelf moves along by itself.

## The brand assets

`assets/logo.svg` is the only drawn file. Everything else is derived:

```sh
node src/tools/render-assets.js   # → assets/og/*.png, assets/logo-{180,512,1024}.png
```

That step needs a browser and the network (for the fonts), which is why it is
not part of `npm run build` — the build has to keep working on a machine with
neither. Run it when the logo changes, when a game icon changes, or when the
headline the studio card quotes is rewritten; commit what it writes.

The two lockups were drawn once, from Bricolage Grotesque at `opsz=48,
wght=800, wdth=100`, with the name converted to outlines so it needs no font
to render. Recreating them means shaping the text with HarfBuzz and lifting
the glyph outlines — worth doing only if the name or the typeface changes.

## Adding a language

`LOCALES` in `src/lib/i18n.js`, a badge asset in `badges/`, an entry in
`LANGUAGES` in `src/lib/layout.js`, and then every key in `src/i18n/` needs the
new locale — the build will not let you forget one.
