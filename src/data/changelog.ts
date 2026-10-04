import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHANGELOG_FOLDER } from '../config';
import type { ArtFolder } from '../render/art';

export interface ChangelogArt {
  folder: ArtFolder;
  file: string;
}

export type ChangelogItem = string | { label: string; text: string };

export interface ChangelogGroup {
  heading: string;
  tag?: string;
  art?: ChangelogArt;
  items: ChangelogItem[];
}

export interface ChangelogSection {
  id: string;
  title: string;
  // Picks the accent colour of the section.
  kind: string;
  intro?: string;
  groups: ChangelogGroup[];
}

export interface ChangelogVersion {
  version: string;
  date: string;
  // Game commits that the version covers, for the GitHub compare link.
  compare: { from: string; to: string };
  summary: string;
  highlights: Array<{ title: string; text: string; art: ChangelogArt }>;
  sections: ChangelogSection[];
}

function versionNumbers(version: string): number[] {
  return version.replace(/^v/, '').split('.').map(Number);
}

function compareVersionsNewestFirst(left: ChangelogVersion, right: ChangelogVersion): number {
  const leftNumbers = versionNumbers(left.version);
  const rightNumbers = versionNumbers(right.version);
  for (let position = 0; position < Math.max(leftNumbers.length, rightNumbers.length); position++) {
    const difference = (rightNumbers[position] ?? 0) - (leftNumbers[position] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

// To add a version, add changelog/v<number>.json. The newest version shows first.
export function loadChangelog(): ChangelogVersion[] {
  return readdirSync(CHANGELOG_FOLDER)
    .filter((fileName) => /^v\d+(\.\d+)*\.json$/.test(fileName))
    .map((fileName) => JSON.parse(readFileSync(join(CHANGELOG_FOLDER, fileName), 'utf8')) as ChangelogVersion)
    .sort(compareVersionsNewestFirst);
}
