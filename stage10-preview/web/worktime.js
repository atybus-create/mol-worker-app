(() => {
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || 'LEADER');
  const capabilities = window.MOLRoles.get(role);
  if (!capabilities?.web) return;

  const view = document.querySelector('[data-view="worktime"]');
  if (!view) return;

  const people = [...document.querySelectorAll('#teamRows tr')].map((row, index) => ({
    id: row.dataset.id,
    name: row.dataset.employee,
    liveState: row.dataset.status,
    livePresence: row.dataset.attendance || '00:00',
    index
  }));

  const toMinutes = (value) => {
    const [hours, minutes] = String(value || '00:00').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const fromMinutes = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const formatDate = (value) => value ? value.split('-').reverse().join('.') : '—';
  const addMinutesToClock = (clock, minutes) => {
    const total = toMinutes(clock) + minutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };
  const datesBetween = (from, to) => {
    if (!from || !to || from > to) return [];
    const dates = [];
    const cursor = new Date(`${from}T12:00:00Z`);
    const end = new Date(`${to}T12:00:00Z`);
    while (cursor <= end && dates.length < 62) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  };

  const demoAttendance = (person, workDate, dayIndex) => {
    const weekday = new Date(`${workDate}T12:00:00Z`).getUTCDay();
    if (weekday === 0) return { workDate, state: 'NOT_STARTED', start: '—', stop: '—', minutes: 0 };

    if (workDate === '2026-09-07' && person.liveState !== 'BRAK STARTU') {
      const startOffset = 2 + ((person.index * 7) % 31);
      const start = `06:${String(startOffset).padStart(2, '0')}`;
      return {
        workDate,
        state: 'OPEN',
        start,
        stop: '—',
        minutes: toMinutes(person.livePresence)
      };
    }

    const startMinute = 3 + ((person.index * 11 + dayIndex * 5) % 37);
    const start = `06:${String(startMinute).padStart(2, '0')}`;
    const minutes = weekday === 6 ? 360 + ((person.index + dayIndex) % 31) : 450 + ((person.index * 9 + dayIndex * 7) % 51);
    return {
      workDate,
      state: 'CLOSED',
      start,
      stop: addMinutesToClock(start, minutes),
      minutes
    };
  };

  view.innerHTML = `
    <div class="page-title"><div><p class="mol-kicker">Ewidencja obecności</p><h1>Raport czasu pracy</h1><small>Oddzielony od raportu wydajności</small></div></div>
    <div class="view-toolbar report-toolbar">
      <label>Od <input data-worktime-from type="date" value="2026-09-01"></label>
      <label>Do <input data-worktime-to type="date" value="2026-09-07"></label>
      <button class="mol-button mol-button--primary" type="button" data-worktime-generate>Generuj raport dla zaznaczonych</button>
      <button class="mol-button" type="button" data-worktime-export="CSV">Eksport CSV</button>
      <button class="mol-button" type="button" data-worktime-export="XLSX">Eksport XLSX</button>
    </div>
    <section class="mol-card report-selector-card" aria-labelledby="worktimePeopleTitle">
      <div class="report-selector-head">
        <div><p class="mol-kicker">Zakres osób</p><h2 id="worktimePeopleTitle">Wybierz pracowników</h2><small data-worktime-count aria-live="polite">Wybrano 3</small></div>
        <div class="report-selector-actions"><button type="button" data-worktime-all>Zaznacz wszystkich</button><button type="button" data-worktime-clear>Wyczyść</button></div>
      </div>
      <div class="report-people-grid">
        ${people.map((person, index) => `<label class="report-person"><input type="checkbox" value="${person.id}" ${index < 3 ? 'checked' : ''}><span><b>${person.name}</b><small>${person.id}</small></span></label>`).join('')}
      </div>
      <p class="report-help">Raport czasu pracy nie zawiera norm ani PICK/PAK. Pokazuje ewidencję dnia: stan, START, STOP i przepracowany czas.</p>
    </section>
    <div class="web-stat-grid">
      <article class="mol-card"><small>Wybrani pracownicy</small><strong data-worktime-selected>0</strong></article>
      <article class="mol-card"><small>Dni z pracą</small><strong data-worktime-days>0</strong></article>
      <article class="mol-card"><small>Łączny czas pracy</small><strong data-worktime-total>00:00</strong></article>
      <article class="mol-card"><small>Średnio / dzień</small><strong data-worktime-average>00:00</strong></article>
    </div>
    <section class="mol-card detail-table-card">
      <div class="detail-table-head"><div><h2>Czas pracy za wybrany okres</h2><small data-worktime-generated aria-live="polite"></small></div></div>
      <table class="worktime-report-table">
        <thead><tr><th>Data</th><th>Pracownik</th><th>Stan dnia</th><th>START</th><th>STOP</th><th>Czas pracy</th></tr></thead>
        <tbody data-worktime-body></tbody>
      </table>
    </section>`;

  const checkedIds = () => [...view.querySelectorAll('.report-people-grid input:checked')].map((input) => input.value);
  const updateCount = () => {
    const count = checkedIds().length;
    view.querySelector('[data-worktime-count]').textContent = `Wybrano ${count}`;
    view.querySelector('[data-worktime-generate]').disabled = count === 0;
    view.querySelectorAll('[data-worktime-export]').forEach((button) => { button.disabled = count === 0; });
  };

  const render = () => {
    const ids = new Set(checkedIds());
    const selectedPeople = people.filter((person) => ids.has(person.id));
    const from = view.querySelector('[data-worktime-from]').value;
    const to = view.querySelector('[data-worktime-to]').value;
    const dates = datesBetween(from, to);
    const records = [];

    selectedPeople.forEach((person) => {
      dates.forEach((workDate, dayIndex) => records.push({ person, ...demoAttendance(person, workDate, dayIndex) }));
    });

    const working = records.filter((record) => record.state !== 'NOT_STARTED');
    const totalMinutes = working.reduce((sum, record) => sum + record.minutes, 0);
    const averageMinutes = working.length ? Math.round(totalMinutes / working.length) : 0;

    view.querySelector('[data-worktime-selected]').textContent = String(selectedPeople.length);
    view.querySelector('[data-worktime-days]').textContent = String(working.length);
    view.querySelector('[data-worktime-total]').textContent = fromMinutes(totalMinutes);
    view.querySelector('[data-worktime-average]').textContent = fromMinutes(averageMinutes);
    view.querySelector('[data-worktime-generated]').textContent = selectedPeople.length && dates.length
      ? `Zakres ${formatDate(from)} – ${formatDate(to)} · ${selectedPeople.length} osób · ${records.length} wierszy`
      : '';

    view.querySelector('[data-worktime-body]').innerHTML = records.length
      ? records.sort((a, b) => b.workDate.localeCompare(a.workDate) || a.person.name.localeCompare(b.person.name, 'pl')).map((record) => `
        <tr>
          <td>${formatDate(record.workDate)}</td>
          <td><b>${record.person.name}</b><small>${record.person.id}</small></td>
          <td><span class="status ${record.state === 'OPEN' ? 'success' : record.state === 'CLOSED' ? 'muted' : 'warning'}">${record.state}</span></td>
          <td>${record.start}</td>
          <td>${record.stop}</td>
          <td><strong>${fromMinutes(record.minutes)}</strong></td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="report-empty">Zaznacz pracownika i poprawny zakres dat.</td></tr>';
  };

  view.querySelectorAll('.report-people-grid input').forEach((input) => input.addEventListener('change', updateCount));
  view.querySelector('[data-worktime-all]').addEventListener('click', () => {
    view.querySelectorAll('.report-people-grid input').forEach((input) => { input.checked = true; });
    updateCount();
  });
  view.querySelector('[data-worktime-clear]').addEventListener('click', () => {
    view.querySelectorAll('.report-people-grid input').forEach((input) => { input.checked = false; });
    updateCount();
  });
  view.querySelector('[data-worktime-generate]').addEventListener('click', render);
  view.querySelectorAll('[data-worktime-export]').forEach((button) => button.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-export', {
      detail: {
        reportType: 'attendance',
        format: button.dataset.worktimeExport,
        employeeIds: checkedIds(),
        from: view.querySelector('[data-worktime-from]').value,
        to: view.querySelector('[data-worktime-to]').value,
        role
      }
    }));
  }));

  const employeeActions = document.querySelector('.employee-actions');
  if (employeeActions && !employeeActions.querySelector('[data-worktime-employee]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mol-button';
    button.dataset.worktimeEmployee = 'true';
    button.textContent = 'Czas pracy';
    button.addEventListener('click', () => {
      const employeeId = document.getElementById('employeeId')?.textContent;
      view.querySelectorAll('.report-people-grid input').forEach((input) => { input.checked = input.value === employeeId; });
      updateCount();
      render();
      document.querySelector('.sidebar [data-section="worktime"]')?.click();
    });
    employeeActions.append(button);
  }

  updateCount();
  render();
})();
