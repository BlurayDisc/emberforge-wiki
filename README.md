# Emberforge Wiki

A medieval-themed wiki for the game [Emberforge](https://github.com/BlurayDisc/emberforge). Every page is generated from the game data JSON files. Nothing about monsters, heroes or items is written by hand.

## Update the wiki after a game data change

```sh
npm run update      # copies ../emberforge/data into game-data/, then builds dist/
git add -A && git commit -m "Update game data" && git push
```

The push starts the GitHub Action, which checks the build and publishes to GitHub Pages.

| Command | What it does |
|---|---|
| `npm run sync` | Copies `../emberforge/data` to `game-data/` and records the game commit. Set `EMBERFORGE_REPO` if the game is somewhere else. |
| `npm run build` | Builds the site from `game-data/` into `dist/`. |
| `npm run check` | Type check, build and internal link check. |
| `npm run preview` | Serves `dist/` locally. |

## How it works

- `src/data/` loads the JSON and answers questions (which dungeons hold a monster, which recipes use a material).
- `src/pages/` has one module per wiki section. Each returns a list of pages.
- `src/render/` has the HTML helper (escapes text by default), shared components and the page layout.
- `src/static/` has the stylesheet and the small browser script (search, table sort and filter, level slider).

New monsters, items, dungeons and so on show up by themselves: pages are made by looping over the data. A data change that breaks an assumption (for example a renamed balance key) fails the build with a clear message.

## Add a new wiki section

1. Add a module in `src/pages/` that returns `Page[]`.
2. List it in `src/pages/pageBuilders.ts`.
3. Add an entry to `SECTIONS` in `src/render/page.ts` (this adds it to the menu and the home page).

## Known gaps

The game data has no ability or promotion data yet. The Abilities page shows combat roles and battle rules from the data. When the game adds skills to its data, extend `src/pages/abilities.ts`.
