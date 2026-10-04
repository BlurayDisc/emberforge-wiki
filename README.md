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
| `npm run sync` | Copies `../emberforge/data` to `game-data/`, records the game commit, and draws the game pixel art to PNG files in `game-art/`. Set `EMBERFORGE_REPO` if the game is somewhere else. |
| `npm run build` | Builds the site from `game-data/` into `dist/`. |
| `npm run check` | Type check, build and internal link check. |
| `npm run preview` | Serves `dist/` locally. |

## Changelog

The Changelog page (`/changelog/`, the link the game opens) shows one block for each version, newest first. The notes are written by hand in `changelog/v<number>.json`, because they group changes by kind (gameplay, classes, items, UI, fixes). To release a version, add a new file, for example `changelog/v0.4.json`, then push. Use `git log <old>..<new>` in the game repository as the source. Copy `changelog/v0.3.json` as a template.

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

## Known gaps

The Abilities page shows combat roles, battle rules, class resources and how spells work. Each hero page lists the spells of its class (`src/pages/spellTable.ts`). Promotions are shown on the Heroes pages, but the game has no promotion command yet.
