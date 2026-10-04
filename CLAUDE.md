# CLAUDE.md - Emberforge Wiki

Static wiki generated from the Emberforge game data. TypeScript run with `tsx`. No framework.

- The wiki never holds game facts by hand. Read them from `game-data/` (a copy of the game `data/` folder, made by `npm run sync`). Do not edit `game-data/` by hand.
- Where the wiki repeats a game formula (monster stats, recipes, hero stats), copy it from the game source and say so in a short comment.
- Read balance numbers with `balanceValue` or `balanceNumber`, so a missing key fails the build.
- Put text in pages through the `html` template tag. It escapes strings.
- The wiki has English and Chinese. Write every text of the wiki itself with `t('English text')` or `tHtml`, and add the Chinese in `src/i18n/zh.ts`. Names and game text come from the game files, not from the dictionary. A new changelog version needs a `.json` and a `.zh.json` file.
- Do not write unit tests. `npm run check` is the check: types, build, link check. Run it before you finish.
- Never use em dashes in code, text or docs. Use a normal hyphen.
- Do not commit unless the user asks.
