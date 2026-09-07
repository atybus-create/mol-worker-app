(() => {
  const shell = document.querySelector('.worker-shell');
  if (!shell) return;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = './spec-completion.css';
  document.head.append(css);

  const params = new URLSearchParams(location.search);
  const dayState = String(params.get('dayState') || 'OPEN').toUpperCase();
  const validState = ['NOT_STARTED', 'OPEN', 'CLOSED'].includes(dayState) ? dayState : 'OPEN';

  const startButton = document.querySelector('[data-action="start"]');
  const stopButton = document.querySelector('[data-action="stop"]');
  if (startButton?.querySelector('strong')) startButton.querySelector('strong').textContent = 'MONITI Rozpocznij pracę';
  if (stopButton?.querySelector('strong')) stopButton.querySelector('strong').textContent = 'MONITI Zakończ pracę';

  const quickActions = document.querySelector('.action-grid');
  if (quickActions && !quickActions.querySelector('[data-action="correct-hours"]')) {
    const correct = document.createElement('button');
    correct.className = 'mol-button';
    correct.type = 'button';
    correct.dataset.action = 'correct-hours';
    correct.innerHTML = '◷ <span><strong>Zmień godziny pracy</strong><small>START / STOP i powód</small></span>';
    correct.addEventListener('click', () => {
      document.querySelector('[data-nav="profile"]')?.click();
      requestAnimationFrame(() => document.querySelector('[data-demo-correction]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
    quickActions.append(correct);

    const reopen = document.createElement('button');
    reopen.className = 'mol-button';
    reopen.type = 'button';
    reopen.dataset.action = 'reopen-day';
    reopen.innerHTML = '↶ <span><strong>Cofnij zakończenie dnia</strong><small>Przywróć dzień do OPEN bez uruchamiania procesu</small></span>';
    reopen.hidden = validState !== 'CLOSED';
    reopen.addEventListener('click', () => window.dispatchEvent(new CustomEvent('mol:stage10-demo-action', { detail: { action: 'attendance-reopen', processAutoStart: false } })));
    quickActions.append(reopen);
  }

  const statusCard = document.querySelector('.work-status');
  const statusTitle = statusCard?.querySelector('.status-head h2');
  const processChip = statusCard?.querySelector('.status-head .mol-chip');
  const actionBlock = quickActions?.closest('.section-block');
  if (actionBlock && !actionBlock.querySelector('.day-state-banner')) {
    const banner = document.createElement('div');
    banner.className = 'day-state-banner';
    banner.innerHTML = `<strong>Stan dnia: ${validState}</strong> · źródłem stanu jest Data Tables. Parametr dayState w preview służy wyłącznie do pokazania wariantów UI.`;
    actionBlock.insertBefore(banner, quickActions);
  }

  if (validState === 'NOT_STARTED') {
    if (statusTitle) statusTitle.textContent = 'NIE ROZPOCZĘTO';
    if (processChip) { processChip.textContent = 'BRAK PROCESU'; processChip.className = 'mol-chip mol-chip--warning'; }
    if (startButton) startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
  } else if (validState === 'CLOSED') {
    if (statusTitle) statusTitle.textContent = 'DZIEŃ ZAKOŃCZONY';
    if (processChip) { processChip.textContent = 'CLOSED'; processChip.className = 'mol-chip mol-chip--info'; }
    if (startButton) startButton.disabled = true;
    if (stopButton) stopButton.disabled = true;
  } else {
    if (startButton) startButton.disabled = true;
    if (stopButton) stopButton.disabled = false;
  }

  startButton?.addEventListener('click', () => {
    if (startButton.disabled) return;
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-attendance-transition', { detail: { from: 'NOT_STARTED', to: 'OPEN', nextScreen: 'process' } }));
    requestAnimationFrame(() => document.querySelector('[data-nav="process"]')?.click());
  });
  stopButton?.addEventListener('click', () => {
    if (stopButton.disabled) return;
    document.querySelector('[data-panel="process"] [data-process-logout]')?.click();
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-attendance-transition', { detail: { from: 'OPEN', to: 'CLOSED', closesProcessAtSameInstant: true } }));
  });

  const active = document.querySelector('.active-process');
  if (active) {
    const info = active.querySelector('div');
    const originalButton = active.querySelector('[data-action="change-process"]');
    if (originalButton) originalButton.textContent = 'ZMIEŃ PROCES';
    if (info && !info.querySelector('.active-process-meta')) {
      info.insertAdjacentHTML('beforeend', `
        <div class="active-process-meta">
          <span><small>Proces od</small><strong data-active-process-start>08:55</strong></span>
          <span><small>Timer procesu</small><strong data-active-process-timer>01:58</strong></span>
          <span><small>Wykonanie właściwe</small><strong data-active-process-output>PAK 124 do normy</strong></span>
        </div>`);
    }
    if (!active.querySelector('.active-process-actions')) {
      const actions = document.createElement('div');
      actions.className = 'active-process-actions';
      if (originalButton) actions.append(originalButton);
      const logout = document.createElement('button');
      logout.className = 'mol-button';
      logout.type = 'button';
      logout.textContent = 'WYLOGUJ Z PROCESU';
      logout.addEventListener('click', () => document.querySelector('[data-panel="process"] [data-process-logout]')?.click());
      actions.append(logout);
      const norm = document.createElement('button');
      norm.className = 'mol-button mol-button--primary';
      norm.type = 'button';
      norm.textContent = 'PODGLĄD NORMY';
      norm.addEventListener('click', () => {
        document.querySelector('[data-nav="home"]')?.click();
        const today = document.querySelector('[data-norm-period="today"]');
        if (today) { today.open = true; today.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
      actions.append(norm);
      active.append(actions);
    }
  }

  const processPanel = document.querySelector('[data-panel="process"]');
  if (processPanel) {
    const current = processPanel.querySelector('.process-current');
    if (current && !processPanel.querySelector('.process-day-context')) {
      current.insertAdjacentHTML('afterend', `
        <section class="mol-card process-day-context">
          <div class="process-day-context-grid">
            <span><small>START dnia</small><strong>06:12</strong></span>
            <span><small>Czas międzyprocesowy</small><strong>00:08</strong></span>
            <span><small>Stan dnia</small><strong>OPEN</strong></span>
          </div>
        </section>`);
    }
    const logout = processPanel.querySelector('[data-process-logout]');
    if (logout) logout.textContent = 'WYLOGUJ Z PROCESU';
  }

  const contextByPeriod = {
    today: {
      processes: 'Pakowanie 01:58 · Kompletacja 01:46 · pozostałe 00:00',
      noProcess: '00:08',
      freshness: 'FRESH · aktualizacja 19:20'
    },
    month: {
      processes: 'Pakowanie 09:42 · Kompletacja 08:20 · pozostałe 04:16',
      noProcess: '01:03',
      freshness: 'FRESH · agregat MTD'
    }
  };
  document.querySelectorAll('[data-norm-period]').forEach((drawer) => {
    if (drawer.querySelector('.norm-context')) return;
    const period = drawer.dataset.normPeriod;
    const data = contextByPeriod[period] || contextByPeriod.today;
    const article = drawer.querySelector('.performance-period');
    if (!article) return;
    article.insertAdjacentHTML('beforeend', `
      <section class="mol-card norm-context">
        <div class="norm-context-grid">
          <span><small>Czasy wszystkich procesów</small><strong>${data.processes}</strong></span>
          <span><small>Czas międzyprocesowy</small><strong>${data.noProcess}</strong></span>
          <span><small>Świeżość danych</small><strong class="freshness-fresh">${data.freshness}</strong></span>
        </div>
      </section>`);
  });

  const staleNotice = [...document.querySelectorAll('.notices .notice strong')].find((node) => node.textContent.includes('> 5 min'));
  if (staleNotice) {
    staleNotice.textContent = 'Przykładowy alert systemowy';
    const description = staleNotice.parentElement?.querySelector('small');
    if (description) description.textContent = 'Automatyczne reguły alertów pozostają OFF/HOLD do etapu powiadomień.';
  }

  const messagesPanel = document.querySelector('[data-panel="messages"]');
  if (messagesPanel && !messagesPanel.querySelector('[data-message-scope-tabs]')) {
    const list = messagesPanel.querySelector('.message-list');
    const tabs = document.createElement('div');
    tabs.className = 'day-control-grid';
    tabs.dataset.messageScopeTabs = 'true';
    tabs.innerHTML = '<button class="mol-button mol-button--primary" type="button" data-message-scope="new">Nowe</button><button class="mol-button" type="button" data-message-scope="archive">Archiwum</button>';
    list?.before(tabs);
    tabs.querySelectorAll('[data-message-scope]').forEach((button) => button.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach((node) => node.classList.toggle('mol-button--primary', node === button));
      messagesPanel.dataset.messageScope = button.dataset.messageScope;
      window.dispatchEvent(new CustomEvent('mol:stage10-demo-message-scope', { detail: { scope: button.dataset.messageScope } }));
    }));
  }

  const correctionForm = document.querySelector('[data-demo-correction]');
  if (correctionForm && !correctionForm.querySelector('[data-correction-policy]')) {
    const note = document.createElement('p');
    note.className = 'day-control-note';
    note.dataset.correctionPolicy = 'true';
    note.textContent = 'Pracownik może korygować własny czas do 31 dni wstecz. Starsze korekty wykonuje LEADER/ADMIN.';
    correctionForm.append(note);
  }

  window.addEventListener('mol:stage10-demo-process-activate', (event) => {
    const detail = event.detail || {};
    const started = document.querySelector('[data-active-process-start]');
    const timer = document.querySelector('[data-active-process-timer]');
    const output = document.querySelector('[data-active-process-output]');
    if (started) started.textContent = 'teraz';
    if (timer) timer.textContent = '00:00';
    if (output) output.textContent = detail.code === 'PAKOWANIE' ? 'PAK · oczekiwanie na dane' : detail.code === 'KOMPLETACJA' ? 'PICK · oczekiwanie na dane' : 'Proces niemierzalny';
  });
})();
