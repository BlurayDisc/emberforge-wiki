import { html, Html, raw } from './html';

// "@/" is replaced with the path back to the site root when a page is written.
export const siteLink = (path: string, label: string | Html): Html => html`<a href="@/${path}">${label}</a>`;

export const badge = (label: string, tone: string): Html => html`<span class="badge badge-${tone}">${label}</span>`;

export function pageHeading(title: string, subtitle?: string): Html {
  return html`<header class="page-heading"><h1>${title}</h1>${subtitle && html`<p class="subtitle">${subtitle}</p>`}</header>`;
}

export function panel(title: string | null, content: Html): Html {
  return html`<section class="panel">${title && html`<h2>${title}</h2>`}${content}</section>`;
}

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

export function card(href: string, title: string, lines: Array<string | Html>, tag?: Html): Html {
  return html`<a class="card" href="@/${href}">
    <span class="card-title">${title}</span>${tag}
    ${lines.map((line) => html`<span class="card-line">${line}</span>`)}
  </a>`;
}

export const cardGrid = (cards: Html[]): Html => html`<div class="card-grid">${cards}</div>`;

export const filterBox = (placeholder: string): Html =>
  html`<input class="filter-box" type="search" placeholder="${placeholder}" data-filter-target aria-label="${placeholder}">`;

export const loreText = (text: string | undefined): Html | null => (text ? html`<p class="lore">${text}</p>` : null);

export const commaList = (items: Html[]): Html =>
  items.length === 0 ? html`<span class="muted">none</span>` : html`${items.flatMap((item, index) => (index === 0 ? [item] : [', ', item]))}`;
