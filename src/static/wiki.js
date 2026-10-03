(function () {
  const siteRoot = document.body.dataset.root || './';

  function setupSearch() {
    const box = document.getElementById('search-box');
    const results = document.getElementById('search-results');
    if (!box || !results) return;
    let entries = null;
    const loadEntries = () => entries
      ? Promise.resolve(entries)
      : fetch(siteRoot + 'assets/search-index.json').then((r) => r.json()).then((list) => (entries = list));

    box.addEventListener('focus', loadEntries);
    box.addEventListener('input', async () => {
      const query = box.value.trim().toLowerCase();
      results.replaceChildren();
      if (!query) { results.hidden = true; return; }
      const list = await loadEntries();
      const matches = list
        .filter((e) => (e.title + ' ' + e.kind + ' ' + e.keywords).toLowerCase().includes(query))
        .sort((a, b) => Number(!a.title.toLowerCase().startsWith(query)) - Number(!b.title.toLowerCase().startsWith(query)))
        .slice(0, 8);
      for (const match of matches) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = siteRoot + match.path;
        link.textContent = match.title;
        const kind = document.createElement('small');
        kind.textContent = match.kind;
        link.append(kind);
        item.append(link);
        results.append(item);
      }
      if (!matches.length) {
        const empty = document.createElement('li');
        empty.className = 'empty';
        empty.textContent = 'Nothing found';
        results.append(empty);
      }
      results.hidden = false;
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.search')) results.hidden = true;
    });
  }

  function setupFilterBoxes() {
    for (const filterBox of document.querySelectorAll('[data-filter-target]')) {
      filterBox.addEventListener('input', () => {
        const query = filterBox.value.trim().toLowerCase();
        const rows = document.querySelectorAll('[data-filter-list] .card, tbody tr');
        for (const row of rows) row.hidden = query !== '' && !row.textContent.toLowerCase().includes(query);
      });
    }
  }

  function setupSortableTables() {
    for (const table of document.querySelectorAll('table[data-sortable]')) {
      const body = table.tBodies[0];
      table.tHead.querySelectorAll('th').forEach((header, columnIndex) => {
        header.tabIndex = 0;
        header.addEventListener('click', () => {
          const direction = header.dataset.direction === 'asc' ? -1 : 1;
          table.tHead.querySelectorAll('th').forEach((other) => delete other.dataset.direction);
          header.dataset.direction = direction === 1 ? 'asc' : 'desc';
          const cellText = (row) => row.cells[columnIndex].textContent.trim();
          const rows = [...body.rows].sort((a, b) =>
            direction * cellText(a).localeCompare(cellText(b), undefined, { numeric: true }));
          body.append(...rows);
        });
      });
    }
  }

  function setupLevelCalculators() {
    for (const calculator of document.querySelectorAll('[data-calc]')) {
      const { base, growth } = JSON.parse(calculator.dataset.calc);
      const slider = calculator.querySelector('[data-calc-level]');
      const label = calculator.querySelector('[data-calc-level-label]');
      slider.addEventListener('input', () => {
        const level = Number(slider.value);
        label.textContent = level;
        for (const cell of calculator.querySelectorAll('[data-calc-stat]')) {
          const stat = cell.dataset.calcStat;
          cell.textContent = Math.round(base[stat] + growth[stat] * (level - 1));
        }
      });
    }
  }

  setupSearch();
  setupFilterBoxes();
  setupSortableTables();
  setupLevelCalculators();
})();
