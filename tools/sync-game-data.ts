import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gameRepository = resolve(process.env.EMBERFORGE_REPO ?? '../emberforge');
const sourceDataFolder = resolve(gameRepository, 'data');
const snapshotFolder = resolve('game-data');

if (!existsSync(sourceDataFolder)) {
  throw new Error(`No game data at ${sourceDataFolder}. Set EMBERFORGE_REPO to the game folder.`);
}

function readGameGit(...gitArguments: string[]): string {
  return execFileSync('git', ['-C', gameRepository, ...gitArguments], { encoding: 'utf8' }).trim();
}

rmSync(snapshotFolder, { recursive: true, force: true });
cpSync(sourceDataFolder, snapshotFolder, { recursive: true });

const hasUncommittedDataChanges = readGameGit('status', '--porcelain', '--', 'data') !== '';
const snapshotSource = {
  commit: readGameGit('rev-parse', '--short', 'HEAD'),
  commitDate: readGameGit('log', '-1', '--format=%cs'),
  hasUncommittedDataChanges,
};
writeFileSync(resolve(snapshotFolder, 'source.json'), JSON.stringify(snapshotSource, null, 2) + '\n');
console.log(`Synced game data from ${sourceDataFolder}`, snapshotSource);
