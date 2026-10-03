import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const siteFolder = resolve('dist');

function listHtmlFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? listHtmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
}

const brokenLinks: string[] = [];
for (const pagePath of listHtmlFiles(siteFolder)) {
  const markup = readFileSync(pagePath, 'utf8');
  for (const [, target] of markup.matchAll(/(?:href|src)="([^"#:]+)"/g)) {
    if (!target || !existsSync(resolve(dirname(pagePath), target))) brokenLinks.push(`${pagePath.replace(siteFolder, '')} -> ${target}`);
  }
}

if (brokenLinks.length > 0) {
  console.error(`Broken links:\n${brokenLinks.join('\n')}`);
  process.exit(1);
}
console.log('All internal links work.');
