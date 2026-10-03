import { html, Html, raw } from './html';

// "@/" is replaced with the path back to the site root when a page is written.
export const siteLink = (path: string, label: string | Html): Html => html`<a href="@/${path}">${label}</a>`;

export const badge = (label: string, tone: string): Html => html`<span class="badge badge-${tone}">${label}</span>`;

export function pageHeading(title: string, subtitle?: string): Html {
  return html`<header class="page-heading"><h1>${title}</h1>${subtitle && html`<p class="subtitle">${subtitle}</p>`}</header>`;
}

export interface PanelOptions {
  // Lets the jump links of an index page scroll to this panel.
  anchor?: string;
  // The filter box hides the panel when every card or row inside it is hidden.
  isFilterGroup?: boolean;
}

export function panel(title: string | Html | null, content: Html, options: PanelOptions = {}): Html {
  const idAttribute = options.anchor ? raw(` id="${options.anchor}"`) : raw('');
  const filterAttribute = options.isFilterGroup ? raw(' data-filter-group') : raw('');
  return html`<section class="panel"${idAttribute}${filterAttribute}>${title && html`<h2>${title}</h2>`}${content}</section>`;
}

export const subheading = (title: string | Html): Html => html`<h3 class="group-heading">${title}</h3>`;

export const jumpLinks = (entries: Array<{ anchor: string; label: string }>): Html =>
  html`<nav class="jump-links" aria-label="On this page">${entries.map((entry) => html`<a href="#${entry.anchor}">${entry.label}</a>`)}</nav>`;

export const iconLink = (path: string, label: string, icon: Html | null): Html =>
  html`<a class="icon-link" href="@/${path}">${icon}<span>${label}</span></a>`;

export function dataTable(headers: Array<string | Html>, rows: Array<Array<string | number | Html>>, options: { sortable?: boolean } = {}): Html {
  const sortableAttribute = options.sortable ? raw(' data-sortable') : raw('');
  return html`<div class="table-scroll"><table class="data-table"${sortableAttribute}>
    <thead><tr>${headers.map((header) => html`<th>${header}</th>`)}</tr></thead>
    <tbody>${rows.map((row) => html`<tr>${row.map((cell) => html`<td>${cell}</td>`)}</tr>`)}</tbody>
  </table></div>`;
}

export function definitionList(entries: Array<[string, string | number | Html]>): Html {
  return html`<dl class="facts">${entries.map(([term, value]) => html`<div><dt>${term}</dt><dd>${value}</dd></div>`)}</dl>`;
}

export function card(href: string, title: string, lines: Array<string | Html>, tag?: Html, picture?: Html): Html {
  const textBlock = html`<span class="card-text">
    <span class="card-title">${title}</span>${tag}
    ${lines.map((line) => html`<span class="card-line">${line}</span>`)}
  </span>`;
  return html`<a class="card${picture ? ' card-with-picture' : ''}" href="@/${href}">${picture && html`<span class="card-picture">${picture}</span>`}${textBlock}</a>`;
}

export const cardGrid = (cards: Html[]): Html => html`<div class="card-grid">${cards}</div>`;

export const filterBox = (placeholder: string): Html =>
  html`<input class="filter-box" type="search" placeholder="${placeholder}" data-filter-target aria-label="${placeholder}">`;

export const loreText = (text: string | undefined): Html | null => (text ? html`<p class="lore">${text}</p>` : null);

export const commaList = (items: Html[]): Html =>
  items.length === 0 ? html`<span class="muted">none</span>` : html`${items.flatMap((item, index) => (index === 0 ? [item] : [', ', item]))}`;
