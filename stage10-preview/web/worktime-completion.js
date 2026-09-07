(() => {
  const waitForWorktime = () => {
    const view = document.querySelector('[data-view="worktime"]');
    const toolbar = view?.querySelector('.report-toolbar');
    const table = view?.querySelector('.worktime-report-table');
    const generate = view?.querySelector('[data-worktime-generate]');
    if (!view || !toolbar || !table || !generate) {
      setTimeout(waitForWorktime, 25);
      return;
    }

    if (!toolbar.querySelector('[data-worktime-status]')) {
      const status = document.createElement('label');
      status.innerHTML = 'Status <select data-worktime-status><option value="ALL">Wszystkie</option><option value="OPEN">OPEN</option><option value="CLOSED">CLOSED</option><option value="NOT_STARTED">NOT_STARTED</option></select>';
      toolbar.insertBefore(status, generate);

      const today = document.createElement('button');
      today.className = 'mol-button';
      today.type = 'button';
      today.dataset.worktimePreset = 'today';
      today.textContent = 'Dzisiaj';
      toolbar.append(today);

      const month = document.createElement('button');
      month.className = 'mol-button';
      month.type = 'button';
      month.dataset.worktimePreset = 'month';
      month.textContent = 'Bieżący miesiąc';
      toolbar.append(month);
    }

    const header = table.querySelector('thead tr');
    if (header && !header.querySelector('[data-worktime-extra]')) {
      ['Czasy procesów', 'Czas międzyprocesowy', 'Korekty', 'Synchronizacja', 'Historia'].forEach((label) => {
        const th = document.createElement('th');
        th.dataset.worktimeExtra = label;
        th.textContent = label;
        header.append(th);
      });
    }

    const toMinutes = (value) => {
      const [hours, minutes] = String(value || '00:00').split(':').map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    };
    const fromMinutes = (value) => `${String(Math.floor(Math.max(0, value) / 60)).padStart(2, '0')}:${String(Math.max(0, value) % 60).padStart(2, '0')}`;

    const augmentRows = () => {
      const selectedStatus = view.querySelector('[data-worktime-status]')?.value || 'ALL';
      [...table.querySelectorAll('tbody tr')].forEach((row, index) => {
        if (row.querySelector('.report-empty')) return;
        while (row.cells.length > 6) row.deleteCell(-1);
        const state = row.cells[2]?.textContent.trim() || 'NOT_STARTED';
        const presence = row.cells[5]?.textContent.trim() || '00:00';
        const presenceMinutes = toMinutes(presence);
        const between = state === 'NOT_STARTED' ? 0 : Math.min(18, 5 + (index % 4) * 3);
        const processMinutes = Math.max(0, presenceMinutes - between);
        const packMinutes = Math.round(processMinutes * 0.55);
        const pickMinutes = processMinutes - packMinutes;
        const corrections = index % 5 === 1 ? '1 · zatwierdzona' : '0';
        const sync = state === 'OPEN' ? 'Drive PENDING · Moniti OK' : state === 'NOT_STARTED' ? '—' : 'Drive OK · Moniti OK';
        row.insertAdjacentHTML('beforeend', `
          <td><small>PAK ${fromMinutes(packMinutes)} · PICK ${fromMinutes(pickMinutes)}</small></td>
          <td><strong>${fromMinutes(between)}</strong></td>
          <td>${corrections}</td>
          <td><small>${sync}</small></td>
          <td><button class="mol-button" type="button" data-worktime-history>Historia</button></td>`);
        row.hidden = selectedStatus !== 'ALL' && state !== selectedStatus;
      });
      view.dataset.completeAttendanceFields = 'process-times,no-process,corrections,sync,status-filter,event-history';
    };

    const renderThenAugment = () => setTimeout(augmentRows, 0);
    generate.addEventListener('click', renderThenAugment);
    view.querySelector('[data-worktime-status]').addEventListener('change', augmentRows);

    view.querySelector('[data-worktime-preset="today"]').addEventListener('click', () => {
      view.querySelector('[data-worktime-from]').value = '2026-09-07';
      view.querySelector('[data-worktime-to]').value = '2026-09-07';
      generate.click();
    });
    view.querySelector('[data-worktime-preset="month"]').addEventListener('click', () => {
      view.querySelector('[data-worktime-from]').value = '2026-09-01';
      view.querySelector('[data-worktime-to]').value = '2026-09-07';
      generate.click();
    });

    table.addEventListener('click', (event) => {
      const button = event.target.closest('[data-worktime-history]');
      if (!button) return;
      const row = button.closest('tr');
      const employee = row?.cells[1]?.querySelector('b')?.textContent || 'pracownika';
      window.dispatchEvent(new CustomEvent('mol:stage10-demo-employee-event-history', { detail: { employee } }));
      button.textContent = 'Historia dostępna w podglądzie osoby';
    });

    const help = view.querySelector('.report-help');
    if (help) help.textContent = 'Raport czasu pracy: START, STOP, obecność, czasy procesów, czas międzyprocesowy, korekty i synchronizacja. Filtry: okres, pracownicy i status dnia.';

    augmentRows();
  };

  waitForWorktime();
})();
