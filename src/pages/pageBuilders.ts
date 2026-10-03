import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import type { Page } from '../render/page';
import { buildAbilityPages } from './abilities';
import { buildAffixPages } from './affixes';
import { buildCastlePages } from './castle';
import { buildCrafterPages } from './crafters';
import { buildDungeonPages } from './dungeons';
import { buildEquipmentPages } from './equipment';
import { buildHeroPages } from './heroes';
import { buildHomePage } from './home';
import { buildMaterialPages } from './materials';
import { buildMechanicsPages } from './mechanics';
import { buildMonsterPages } from './monsters';
import { buildTownPages } from './towns';

// To add a wiki section: write a module that returns Page[], then list it here.
export const PAGE_BUILDERS: Array<(game: GameIndex, text: GameText) => Page[]> = [
  buildHomePage,
  buildHeroPages,
  buildAbilityPages,
  buildMonsterPages,
  buildDungeonPages,
  buildTownPages,
  buildCastlePages,
  buildEquipmentPages,
  buildMaterialPages,
  buildCrafterPages,
  buildAffixPages,
  buildMechanicsPages,
];
