# Emberforge Wiki

A medieval-themed wiki for the game [Emberforge](https://github.com/BlurayDisc/emberforge). Every page is generated from the game data JSON files. Nothing about monsters, heroes or items is written by hand.

## Update the wiki after a game data change

```sh
npm run update      # copies ../emberforge/data into game-data/, draws the game art into game-art/, then builds dist/
git add -A && git commit -m "Update game data" && git push
```

The push starts the GitHub Action, which checks the build and publishes to GitHub Pages.

| Command | What it does |
|---|---|
| `npm run sync` | Copies `../emberforge/data` to `game-data/`, records the game commit, and draws the game pixel art to PNG files in `game-art/`: heroes, monsters, items, spell icons and the animated spell effects (APNG). Set `EMBERFORGE_REPO` if the game is somewhere else. |
| `npm run build` | Builds the site from `game-data/` into `dist/`. |
| `npm run check` | Type check, build and internal link check. |
| `npm run preview` | Serves `dist/` locally. |

## Changelog

The Changelog page (`/changelog/`, the link the game opens) shows one block for each version, newest first. The notes are written by hand in `changelog/v<number>.json`, because they group changes by kind (gameplay, classes, items, UI, fixes). To release a version, add a new file, for example `changelog/v0.4.json`, then push. Use `git log <old>..<new>` in the game repository as the source. Copy `changelog/v0.3.json` as a template.

## Languages

The wiki has two languages: English at the site root and Chinese in `zh/` (for example `/changelog/` and `/zh/changelog/`). The switch is in the top right corner and it remembers the choice.

- Names and game text (monsters, items, spells, lore) come from the game files: `game-data/i18n/en.json` and `zh.json`.
- Text that the wiki writes itself goes through `t('English text')` or `tHtml(...)` (`src/i18n/ui.ts`). The English text is the key. Add the Chinese text in `src/i18n/zh.ts`. A missing translation fails the build.
- A new language needs a game text file, a dictionary in `src/i18n/` and an entry in `src/i18n/language.ts`.

## Changelog

The Changelog page (`/changelog/`, the link the game opens) shows one block for each version, newest first. The notes are written by hand, because they group changes by kind (gameplay, classes, items, UI, fixes). To release a version, add `changelog/v0.4.json` (English) and `changelog/v0.4.zh.json` (Chinese) with the same shape, then push. Copy the v0.3 files as a template. Use `git log <old>..<new>` in the game repository as the source. A version without its Chinese file fails the build.

## How it works

- `src/data/` loads the JSON and answers questions (which dungeons hold a monster, which recipes use a material).
- `src/pages/` has one module per wiki section. Each returns a list of pages.
- `src/render/` has the HTML helper (escapes text by default), shared components and the page layout.
- `game-art/` has the pictures. `tools/render-game-art.ts` runs the game drawing code with a small canvas shim and saves PNG files. The build copies them to the site. A missing picture fails the build.
- `src/static/` has the stylesheet and the small browser script (search, table sort and filter, level slider).

New monsters, items, dungeons and so on show up by themselves: pages are made by looping over the data. A data change that breaks an assumption (for example a renamed balance key) fails the build with a clear message.

## Add a new wiki section

1. Add a module in `src/pages/` that returns `Page[]`.
2. List it in `src/pages/pageBuilders.ts`.
3. Add an entry to `SECTIONS` in `src/render/page.ts` (this adds it to the menu and the home page).

## Spell animations and sounds

The Spells page shows the icon of every spell. A spell with a look in `game-data/spell-visuals.json` also shows its cast, projectile, impact and status animations, and a Play sound button. The animations are drawn by `tools/render-game-art.ts` from the game code. The sounds are made in the browser from `game-data/audio/sound-effects.json` (copied to `assets/sound-effects.json`). The game's internal spell gallery is not part of the wiki.

## Known gaps

The Abilities page shows combat roles, battle rules, class resources and how spells work. Each hero page lists the spells of its class (`src/pages/spellTable.ts`). Promotions are shown on the Heroes pages, but the game has no promotion command yet.
