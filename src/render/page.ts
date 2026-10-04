import type { Html } from './html';

export type SectionId =
  | 'home' | 'heroes' | 'spells' | 'monsters' | 'dungeons' | 'towns' | 'buildings'
  | 'equipment' | 'materials' | 'crafters' | 'affixes' | 'mechanics' | 'changelog';

export interface Page {
  // Output file, relative to the site root, for example "monsters/wolf.html".
  path: string;
  title: string;
  section: SectionId;
  body: Html;
  // Set on pages that should show up in the search box.
  searchKind?: string;
  searchKeywords?: string;
}

export interface SectionDefinition {
  id: SectionId;
  label: string;
  indexPath: string;
  tagline: string;
}

export const SECTIONS: SectionDefinition[] = [
  { id: 'heroes', label: 'Heroes', indexPath: 'heroes/index.html', tagline: 'Classes, stats and the gear each one can wear.' },
  { id: 'spells', label: 'Spells', indexPath: 'spells/index.html', tagline: 'Every spell of every class, with cost, cooldown and effect.' },
  { id: 'monsters', label: 'Monsters', indexPath: 'monsters/index.html', tagline: 'Beasts, rare foes and bosses, with their loot.' },
  { id: 'dungeons', label: 'Dungeons', indexPath: 'dungeons/index.html', tagline: 'Where to fight, and what to bring.' },
  { id: 'towns', label: 'Towns', indexPath: 'towns/index.html', tagline: 'Ten towns, ten brackets of levels.' },
  { id: 'buildings', label: 'Buildings', indexPath: 'buildings/index.html', tagline: 'The Tavern, Merchant, Bank, Mill and Academy, and what each one costs.' },
  { id: 'equipment', label: 'Equipment', indexPath: 'equipment/index.html', tagline: 'Weapons and armour, sizes and recipes.' },
  { id: 'materials', label: 'Materials', indexPath: 'materials/index.html', tagline: 'What drops, what it is worth, what it makes.' },
  { id: 'crafters', label: 'Crafters', indexPath: 'crafters/index.html', tagline: 'Professions, recipes and crafting levels.' },
  { id: 'affixes', label: 'Affixes', indexPath: 'affixes/index.html', tagline: 'Prefixes and suffixes found on magic and rare gear.' },
  { id: 'mechanics', label: 'Mechanics', indexPath: 'mechanics/index.html', tagline: 'Experience, money, quality odds and other game numbers.' },
  { id: 'changelog', label: 'Changelog', indexPath: 'changelog/index.html', tagline: 'What changed in each version of the game.' },
];
