import { GAME_REPOSITORY_URL } from '../config';
import { loadChangelog, type ChangelogGroup, type ChangelogItem, type ChangelogSection, type ChangelogVersion } from '../data/changelog';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { jumpLinks } from '../render/components';
import { pixelArt } from '../render/art';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';

const sectionAnchor = (version: ChangelogVersion, section: ChangelogSection) => `${version.version}-${section.id}`;

const renderItem = (item: ChangelogItem): Html =>
  typeof item === 'string' ? html`<li>${item}</li>` : html`<li><strong class="change-label">${item.label}</strong> ${item.text}</li>`;

function renderGroup(group: ChangelogGroup): Html {
  const tag = group.tag && html`<span class="change-tag change-tag-${group.tag.toLowerCase()}">${group.tag}</span>`;
  const picture = group.art && html`<span class="change-art">${pixelArt(group.art.folder, group.art.file, group.heading, 3)}</span>`;
  return html`<div class="change-group">
    <div class="change-group-head">${picture}<h3>${group.heading}</h3>${tag}</div>
    <ul class="change-list">${group.items.map(renderItem)}</ul>
  </div>`;
}

function renderSection(version: ChangelogVersion, section: ChangelogSection): Html {
  const intro = section.intro && html`<p class="change-intro">${section.intro}</p>`;
  return html`<section class="change-section" data-kind="${section.kind}" id="${sectionAnchor(version, section)}">
    <h2>${section.title}</h2>${intro}${section.groups.map(renderGroup)}
  </section>`;
}

function renderVersion(version: ChangelogVersion): Html {
  const compareUrl = `${GAME_REPOSITORY_URL}/compare/${version.compare.from}...${version.compare.to}`;
  const highlights = version.highlights.map((highlight) => html`<li class="highlight">
    <span class="highlight-art">${pixelArt(highlight.art.folder, highlight.art.file, highlight.title, 4)}</span>
    <strong>${highlight.title}</strong><span>${highlight.text}</span>
  </li>`);
  return html`<article class="release" id="${version.version}">
    <header class="release-banner">
      <p class="release-kicker">Version notes</p>
      <h1>Version ${version.version.replace(/^v/, '')}</h1>
      <p class="release-date">${version.date}</p>
      <p class="release-summary">${version.summary}</p>
      <p><a href="${compareUrl}">See every commit on GitHub</a></p>
    </header>
    <ul class="highlight-grid">${highlights}</ul>
    ${jumpLinks(version.sections.map((section) => ({ anchor: sectionAnchor(version, section), label: section.title })))}
    ${version.sections.map((section) => renderSection(version, section))}
  </article>`;
}

export function buildChangelogPages(_game: GameIndex, _text: GameText): Page[] {
  const versions = loadChangelog();
  const versionLinks = versions.length > 1 && html`<nav class="jump-links" aria-label="Versions">${versions.map((version) => html`<a href="#${version.version}">${version.version}</a>`)}</nav>`;
  const body = html`${versionLinks}${versions.map(renderVersion)}`;
  return [{ path: 'changelog/index.html', title: 'Changelog', section: 'changelog', body }];
}
