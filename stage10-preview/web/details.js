(() => {
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || 'LEADER');
  const capabilities = window.MOLRoles.get(role);
  if (!capabilities?.web) return;

  const numberField = (row, name) => Number(row.dataset[name] || 0);
  const textField = (row, name) => row.dataset[name] || '00:00';
  const teamData = [...document.querySelectorAll('#teamRows tr')].map((row) => ({
    id: row.dataset.id,
    name: row.dataset.employee,
    status: row.dataset.status,
    attendance: row.dataset.attendance,
    pickTotal: numberField(row, 'monthPickTotal'),
    pickEligible: numberField(row, 'monthPickEligible'),
    pickOutside: numberField(row, 'monthPickOutside'),
    pickTime: textField(row, 'monthPickTime'),
    pickNorm: numberField(row, 'monthPickNorm'),
    packTotal: numberField(row, 'monthPackTotal'),
    packEligible: numberField(row, 'monthPackEligible'),
    packOutside: numberField(row, 'monthPackOutside'),
    packTime: textField(row, 'monthPackTime'),
    packNorm: numberField(row, 'monthPackNorm'),
    total: numberField(row, 'monthTotal'),
    totalEligible: numberField(row, 'monthTotalEligible'),
    totalOutside: numberField(row, 'monthTotalOutside'),
    totalTime: textField(row, 'monthTotalTime'),
    totalNorm: numberField(row, 'monthTotalNorm')
  }));

  const reports = document.querySelector('[data-view="reports"]');
  reports.innerHTML = `
    <div class="page-title"><div><p class="mol-kicker">Analiza zespołu</p><h1>Raport norm</h1></div></div>
    <div class="view-toolbar report-toolbar">
      <label>Od <input data-report-from type="date" value="2026-09-01"></label>
      <label>Do <input data-report-to type="date" value="2026-09-07"></label>
      <button class="mol-button mol-button--primary" type="button" data-report-generate>Generuj raport dla zaznaczonych</button>
      <button class="mol-button" type="button" data-report-export="CSV">Eksport CSV</button>
      <button class="mol-button" type="button" data-report-export="XLSX">Eksport XLSX</button>
    </div>
    <section class="mol-card report-selector-card" aria-labelledby="reportPeopleTitle">
      <div class="report-selector-head">
        <div><p class="mol-kicker">Zakres osób</p><h2 id="reportPeopleTitle">Wybierz pracowników</h2><small data-report-count aria-live="polite">Wybrano 3</small></div>
        <div class="report-selector-actions"><button type="button" data-report-all>Zaznacz wszystkich</button><button type="button" data-report-clear>Wyczyść</button></div>
      </div>
      <div class="report-people-grid">
        ${teamData.map((person, index) => `<label class="report-person"><input type="checkbox" value="${person.id}" ${index < 3 ? 'checked' : ''}><span><b>${person.name}</b><small>${person.id}</small></span><span class="report-person-output"><i>Łącznie <strong>${person.total}</strong></i><i>Do normy <strong>${person.totalEligible}</strong></i><i>Poza normą <strong>${person.totalOutside}</strong></i></span></label>`).join('')}
      </div>
      <p class="report-help">Możesz wybrać jednego, kilku lub wszystkich pracowników. Każda ilość jest rozdzielona na łączną, liczącą się do normy i poza normą.</p>
    </section>
    <div class="report-process-summary">
      <article class="mol-card report-process-card"><h2>PICK</h2><div class="report-process-metrics"><span><small>Ilość łącznie</small><strong data-report-pick-total>0</strong></span><span><small>Ilość do normy</small><strong data-report-pick-eligible>0</strong></span><span><small>Ilość poza normą</small><strong data-report-pick-outside>0</strong></span><span><small>Czas</small><strong data-report-pick-time>00:00</strong></span><span><small>Procent normy</small><strong data-report-pick-norm>—</strong></span></div></article>
      <article class="mol-card report-process-card"><h2>PAK</h2><div class="report-process-metrics"><span><small>Ilość łącznie</small><strong data-report-pack-total>0</strong></span><span><small>Ilość do normy</small><strong data-report-pack-eligible>0</strong></span><span><small>Ilość poza normą</small><strong data-report-pack-outside>0</strong></span><span><small>Czas</small><strong data-report-pack-time>00:00</strong></span><span><small>Procent normy</small><strong data-report-pack-norm>—</strong></span></div></article>
      <article class="mol-card report-process-card is-total"><h2>PICK/PAK</h2><div class="report-process-metrics"><span><small>Ilość łącznie</small><strong data-report-total>0</strong></span><span><small>Ilość do normy</small><strong data-report-total-eligible>0</strong></span><span><small>Ilość poza normą</small><strong data-report-total-outside>0</strong></span><span><small>Czas</small><strong data-report-total-time>00:00</strong></span><span><small>Procent normy</small><strong data-report-total-norm>—</strong></span></div></article>
    </div>
    <section class="mol-card detail-table-card"><div class="detail-table-head"><div><h2>Normy za wybrany okres</h2><small data-report-generated aria-live="polite"></small></div></div><table class="norm-report-table"><thead><tr><th>Pracownik</th><th>PICK łącznie</th><th>PICK do normy</th><th>PICK poza normą</th><th>PICK czas</th><th>PICK %</th><th>PAK łącznie</th><th>PAK do normy</th><th>PAK poza normą</th><th>PAK czas</th><th>PAK %</th><th>PICK/PAK łącznie</th><th>PICK/PAK do normy</th><th>PICK/PAK poza normą</th><th>PICK/PAK czas</th><th>PICK/PAK %</th><th>Świeżość</th></tr></thead><tbody data-report-body></tbody></table></section>`;

  const checkedIds = () => [...reports.querySelectorAll('.report-people-grid input:checked')].map((input) => input.value);
  const updateSelectionCount = () => {
    const count = checkedIds().length;
    reports.querySelector('[data-report-count]').textContent = `Wybrano ${count}`;
    reports.querySelector('[data-report-generate]').disabled = count === 0;
    reports.querySelectorAll('[data-report-export]').forEach((button) => { button.disabled = count === 0; });
  };
  const toMinutes = (value) => {
    const [hours, minutes] = String(value || '00:00').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const fromMinutes = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const average = (rows, field) => rows.length ? Math.round(rows.reduce((sum, row) => sum + row[field], 0) / rows.length) : null;
  const formatDate = (value) => value ? value.split('-').reverse().join('.') : '—';
  const sum = (rows, field) => rows.reduce((acc, row) => acc + row[field], 0);
  const write = (selector, value) => { reports.querySelector(selector).textContent = String(value); };
  const writePercent = (selector, value) => { reports.querySelector(selector).textContent = value === null ? '—' : `${value}%`; };

  const renderReport = () => {
    const ids = new Set(checkedIds());
    const selected = teamData.filter((person) => ids.has(person.id));

    write('[data-report-pick-total]', sum(selected, 'pickTotal'));
    write('[data-report-pick-eligible]', sum(selected, 'pickEligible'));
    write('[data-report-pick-outside]', sum(selected, 'pickOutside'));
    write('[data-report-pick-time]', fromMinutes(selected.reduce((acc, row) => acc + toMinutes(row.pickTime), 0)));
    writePercent('[data-report-pick-norm]', average(selected, 'pickNorm'));

    write('[data-report-pack-total]', sum(selected, 'packTotal'));
    write('[data-report-pack-eligible]', sum(selected, 'packEligible'));
    write('[data-report-pack-outside]', sum(selected, 'packOutside'));
    write('[data-report-pack-time]', fromMinutes(selected.reduce((acc, row) => acc + toMinutes(row.packTime), 0)));
    writePercent('[data-report-pack-norm]', average(selected, 'packNorm'));

    write('[data-report-total]', sum(selected, 'total'));
    write('[data-report-total-eligible]', sum(selected, 'totalEligible'));
    write('[data-report-total-outside]', sum(selected, 'totalOutside'));
    write('[data-report-total-time]', fromMinutes(selected.reduce((acc, row) => acc + toMinutes(row.totalTime), 0)));
    writePercent('[data-report-total-norm]', average(selected, 'totalNorm'));

    reports.querySelector('[data-report-body]').innerHTML = selected.length
      ? selected.map((person) => `<tr><td><b>${person.name}</b><small>${person.id}</small></td><td>${person.pickTotal}</td><td class="good">${person.pickEligible}</td><td class="warn">${person.pickOutside}</td><td>${person.pickTime}</td><td>${person.pickNorm}%</td><td>${person.packTotal}</td><td class="good">${person.packEligible}</td><td class="warn">${person.packOutside}</td><td>${person.packTime}</td><td>${person.packNorm}%</td><td>${person.total}</td><td class="good">${person.totalEligible}</td><td class="warn">${person.totalOutside}</td><td>${person.totalTime}</td><td>${person.totalNorm}%</td><td>LIVE</td></tr>`).join('')
      : '<tr><td colspan="17" class="report-empty">Zaznacz co najmniej jednego pracownika.</td></tr>';
    const from = reports.querySelector('[data-report-from]').value;
    const to = reports.querySelector('[data-report-to]').value;
    reports.querySelector('[data-report-generated]').textContent = selected.length ? `Zakres ${formatDate(from)} – ${formatDate(to)} · ${selected.length} osób · ilość łączna / do normy / poza normą / czas / procent` : '';
  };

  reports.querySelectorAll('.report-people-grid input').forEach((input) => input.addEventListener('change', updateSelectionCount));
  reports.querySelector('[data-report-all]').addEventListener('click', () => {
    reports.querySelectorAll('.report-people-grid input').forEach((input) => { input.checked = true; });
    updateSelectionCount();
  });
  reports.querySelector('[data-report-clear]').addEventListener('click', () => {
    reports.querySelectorAll('.report-people-grid input').forEach((input) => { input.checked = false; });
    updateSelectionCount();
  });
  reports.querySelector('[data-report-generate]').addEventListener('click', renderReport);
  reports.querySelectorAll('[data-report-export]').forEach((button) => button.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-export', { detail: { format: button.dataset.reportExport, employeeIds: checkedIds(), from: reports.querySelector('[data-report-from]').value, to: reports.querySelector('[data-report-to]').value, role } }));
  }));

  const quickReport = document.querySelector('.employee-actions [data-section="reports"]');
  quickReport?.addEventListener('click', () => {
    const selectedRow = document.querySelector('#teamRows tr.is-selected');
    if (!selectedRow) return;
    reports.querySelectorAll('.report-people-grid input').forEach((input) => { input.checked = input.value === selectedRow.dataset.id; });
    updateSelectionCount();
    renderReport();
  });

  const corrections = document.querySelector('[data-view="corrections"]');
  corrections.innerHTML = `
    <div class="page-title"><div><p class="mol-kicker">Decyzje</p><h1>Korekty czasu pracy</h1></div></div>
    <div class="view-toolbar"><label>Status <select><option>Oczekujące</option><option>Wszystkie</option><option>CHANGED</option><option>REJECTED</option></select></label><label>Pracownik <select><option>Wszyscy</option><option>Anna Kowalska</option><option>Piotr Wiśniewski</option></select></label><button class="mol-button">Odśwież</button></div>
    <div class="web-stat-grid"><article class="mol-card"><small>Oczekujące</small><strong>5</strong></article><article class="mol-card"><small>CHANGED</small><strong>1</strong></article><article class="mol-card"><small>Zatwierdzone dziś</small><strong>4</strong></article><article class="mol-card"><small>Odrzucone dziś</small><strong>2</strong></article></div>
    <section class="mol-card detail-table-card"><h2>Kolejka</h2><table><thead><tr><th>Pracownik</th><th>Data</th><th>Stary czas</th><th>Nowy czas</th><th>Powód</th><th>Status</th><th>Akcje</th></tr></thead><tbody><tr><td>Anna Kowalska</td><td>07.09.2026</td><td>06:12</td><td>08:00</td><td>Wizyta lekarska</td><td><span class="correction-status pending">PENDING</span></td><td class="web-action-pair"><button class="accept">Akceptuj</button><button class="reject">Odrzuć</button></td></tr><tr><td>Piotr Wiśniewski</td><td>06.09.2026</td><td>14:00</td><td>16:30</td><td>Nadgodziny</td><td><span class="correction-status changed">CHANGED</span></td><td class="web-action-pair"><button class="accept">Akceptuj</button><button class="reject">Odrzuć</button></td></tr></tbody></table></section>`;

  const users = document.querySelector('[data-view="users"]');
  const createRoles = capabilities.userCreateRoles.join(' / ');
  users.innerHTML = `
    <div class="page-title"><div><p class="mol-kicker">Administracja · ${role}</p><h1>Użytkownicy</h1></div></div>
    <div class="user-layout">
      <section class="mol-card user-form"><h2>Dodaj użytkownika</h2><p class="mol-muted">Dozwolone role: <b>${createRoles}</b></p><form class="form-grid" data-demo-user-form><label>Imię i nazwisko<input required placeholder="Imię i nazwisko"></label><label>Login<input required placeholder="Login"></label><label>Rola<select>${capabilities.userCreateRoles.map((item) => `<option>${item}</option>`).join('')}</select></label><label>Hasło startowe<input type="password" required placeholder="Hasło startowe"></label><button class="mol-button mol-button--primary" type="submit">Utwórz konto</button></form></section>
      <section class="mol-card user-list-card"><h2>Lista użytkowników</h2><div class="user-row"><div><b>Dominika Tatarska</b><small>MOL004 · dtatarska</small></div><span>WORKER</span><span class="good">Aktywna</span><div class="user-row-actions"><button class="mol-button">Reset hasła</button><button class="mol-button mol-button--danger">Dezaktywuj</button></div></div><div class="user-row"><div><b>Bożena</b><small>LEADER · aktywna</small></div><span>LEADER</span><span class="good">Aktywna</span><div class="user-row-actions"><button class="mol-button">Reset hasła</button></div></div><div class="user-row"><div><b>Artur</b><small>MOL015 · atybus</small></div><span>ADMIN</span><span class="good">Aktywna</span><div class="user-row-actions"><button class="mol-button">Reset hasła</button></div></div></section>
    </div>`;

  const audit = document.querySelector('[data-view="audit"]');
  audit.innerHTML = `
    <div class="page-title"><div><p class="mol-kicker">Audyt</p><h1>Historia operacji</h1></div></div>
    <section class="mol-card audit-card"><h2>Ostatnie operacje administracyjne</h2><div class="audit-list"><div class="audit-item"><b>07.09.2026 11:12</b><span>USER_CREATED · konto WORKER</span><span>LEADER</span><span>Bez danych hasła</span></div><div class="audit-item"><b>07.09.2026 10:58</b><span>PASSWORD_CHANGED</span><span>ADMIN</span><span>Sesje unieważnione</span></div><div class="audit-item"><b>07.09.2026 10:41</b><span>USER_DEACTIVATED</span><span>ADMIN</span><span>Sesje unieważnione</span></div><div class="audit-item"><b>07.09.2026 10:22</b><span>CORRECTION_REJECTED</span><span>LEADER</span><span>Hash propozycji zachowany</span></div></div></section>`;

  document.querySelector('[data-demo-user-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-user-create', { detail: { role } }));
  });

  updateSelectionCount();
  renderReport();
})();
