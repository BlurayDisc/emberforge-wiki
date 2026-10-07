(function () {
  const siteRoot = document.body.dataset.root || './';
  const searchIndexUrl = document.body.dataset.searchIndex || siteRoot + 'assets/search-index.json';
  const languageStorageKey = 'emberforgeWikiLanguage';

  function rememberLanguageChoice() {
    for (const choice of document.querySelectorAll('[data-language-choice]')) {
      choice.addEventListener('click', () => {
        try { localStorage.setItem(languageStorageKey, choice.dataset.languageChoice); } catch (error) { /* storage can be blocked */ }
      });
    }
  }

  function setupSearch() {
    const box = document.getElementById('search-box');
    const results = document.getElementById('search-results');
    if (!box || !results) return;
    let entries = null;
    const loadEntries = () => entries
      ? Promise.resolve(entries)
      : fetch(searchIndexUrl).then((r) => r.json()).then((list) => (entries = list));

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
        empty.textContent = box.dataset.emptyText || 'Nothing found';
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
        for (const group of document.querySelectorAll('[data-filter-group]')) {
          const items = group.querySelectorAll('.card, tbody tr');
          group.hidden = query !== '' && items.length > 0 && [...items].every((item) => item.hidden);
        }
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
      const statsOfLevel = JSON.parse(calculator.dataset.calc);
      const slider = calculator.querySelector('[data-calc-level]');
      const label = calculator.querySelector('[data-calc-level-label]');
      slider.addEventListener('input', () => {
        const level = Number(slider.value);
        label.textContent = level;
        for (const cell of calculator.querySelectorAll('[data-calc-stat]')) {
          const stat = cell.dataset.calcStat;
          cell.textContent = statsOfLevel[level][stat];
        }
      });
    }
  }

  // The game makes its sounds with Web Audio from the recipes in data/audio/sound-effects.json.
  // This is a copy of playLayer in src/audio/synth.ts and of the timing in src/app/spellSounds.ts of the game.
  const hitSpacingSeconds = 0.16;
  const projectileFlightSeconds = 0.3;
  const attackSeconds = 0.004;

  function setupSpellSounds() {
    const buttons = document.querySelectorAll('[data-spell-sound]');
    if (!buttons.length) return;
    let soundData = null;
    let context = null;
    let noiseBuffer = null;
    const loadSoundData = () => soundData
      ? Promise.resolve(soundData)
      : fetch(siteRoot + 'assets/sound-effects.json').then((r) => r.json()).then((data) => (soundData = data));

    function noiseBufferOf() {
      if (noiseBuffer) return noiseBuffer;
      noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
      return noiseBuffer;
    }

    function playLayer(layer, startTime) {
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(layer.volume, startTime + attackSeconds);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + layer.durationSeconds);
      let lastNode = gain;
      if (layer.filter) {
        const filter = context.createBiquadFilter();
        filter.type = layer.filter.type;
        filter.frequency.value = layer.filter.frequency;
        gain.connect(filter);
        lastNode = filter;
      }
      lastNode.connect(context.destination);
      if (layer.wave === 'noise') {
        const source = context.createBufferSource();
        source.buffer = noiseBufferOf();
        source.connect(gain);
        source.start(startTime);
        source.stop(startTime + layer.durationSeconds);
        return;
      }
      const oscillator = context.createOscillator();
      oscillator.type = layer.wave;
      oscillator.frequency.setValueAtTime(layer.startFrequency ?? 440, startTime);
      if (layer.endFrequency !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, layer.endFrequency), startTime + layer.durationSeconds);
      }
      oscillator.connect(gain);
      oscillator.start(startTime);
      oscillator.stop(startTime + layer.durationSeconds + 0.02);
    }

    function playSound(effectId, delaySeconds) {
      const layers = soundData.effects[effectId];
      if (!layers) return;
      for (const layer of layers) playLayer(layer, context.currentTime + delaySeconds + (layer.delaySeconds ?? 0));
    }

    function playSpell(button) {
      const sounds = soundData.spellSounds[button.dataset.spellSound];
      if (!sounds) return;
      const role = button.dataset.spellRole;
      const hasProjectile = button.dataset.spellProjectile !== undefined;
      if (sounds.cast) playSound(sounds.cast, 0);
      if (role === 'damage') {
        const hits = Number(button.dataset.spellHits);
        for (let hit = 0; hit < hits; hit++) {
          const hitDelay = hit * hitSpacingSeconds;
          if (sounds.projectile) playSound(sounds.projectile, hitDelay);
          if (sounds.impact) playSound(sounds.impact, hitDelay + (hasProjectile ? projectileFlightSeconds : 0));
        }
        if (sounds.debuff && button.dataset.spellStatus !== undefined) playSound(sounds.debuff, projectileFlightSeconds);
      } else if (role === 'heal') {
        if (sounds.impact) playSound(sounds.impact, 0.1);
      } else {
        const statusSound = role === 'buff' ? sounds.buff : sounds.debuff;
        if (statusSound) playSound(statusSound, 0.1 + (role === 'debuff' && hasProjectile ? projectileFlightSeconds : 0));
      }
    }

    for (const button of buttons) {
      button.addEventListener('click', async () => {
        // The browser keeps audio locked until a click, so the context starts here.
        context ??= new (window.AudioContext || window.webkitAudioContext)();
        await context.resume();
        await loadSoundData();
        playSpell(button);
      });
    }
  }

  rememberLanguageChoice();
  setupSearch();
  setupFilterBoxes();
  setupSortableTables();
  setupLevelCalculators();
  setupSpellSounds();
})();
