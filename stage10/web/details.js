(() => {
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || 'LEADER');
  const capabilities = window.MOLRoles.get(role);
  if (!capabilities?.web) return;

  const teamData = [...document.querySelectorAll('#teamRows tr')].map((row) => ({
    id: row.dataset.id,
    name: row.dataset.employee,
    status: row.dataset.status,
    process: row.dataset.process,
    attendance: row.dataset.attendance,
    noProcess: row.dataset.noProcess,
    pick: Number(row.dataset.pick || 0),
    pack: Number(row.dataset.pack || 0),
    norm: Number(row.dataset.norm || 0)
  }));

  const reports = document.querySelector('[data-view="reports"]');
  reports.innerHTML = `
    <div class="page-title"><div><p class="mol-kicker">Analiza zespołu</p><h1>Raporty</h1></div></div>
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
        ${teamData.map((person, index) => `<label class="report-person"><input type="checkbox" value="${person.id}" ${index < 3 ? 'checked' : ''}><span><b>${person.name}</b><small>${person.id}</small></span><span class="report-person-output"><i>PICK <strong>${person.pick}</strong></i><i>PAK <strong>${person.pack}</strong></i><i>Norma <strong>${person.norm}%</strong></i></span></label>`).join('')}
      </div>
      <p class="report-help">Raport i eksport obejmują dokładnie zaznaczonych pracowników oraz wybrany zakres dat.</p>
    </section>
    <div class="web-stat-grid report-summary"><article class="mol-card"><small>Wybrani pracownicy</small><strong data-report-selected>3</strong></article><article class="mol-card"><small>PICK dzisiaj</small><strong data-report-pick>0</strong></article><article class="mol-card"><small>PAK dzisiaj</small><strong data-report-pack>0</strong></article><article class="mol-card"><small>Śr. norma</small><strong data-report-norm>—</strong></article></div>
    <div class="report-visuals"><article class="mol-card report-chart"><h2>Obecność</h2><strong class="big">89%</strong><div class="report-bars"><i style="height:68%"></i><i style="height:82%"></i><i style="height:91%"></i><i style="height:87%"></i><i style="height:96%"></i></div></article><article class="mol-card report-chart"><h2>Realizacja norm</h2><strong class="big">91%</strong><svg class="report-line" viewBox="0 0 320 110" aria-label="Trend realizacji norm"><polyline points="5,75 55,62 105,63 155,44 205,50 255,31 315,16" fill="none" stroke="currentColor" stroke-width="5"/></svg></article></div>
    <section class="mol-card detail-table-card"><div class="detail-table-head"><div><h2>Obecność, wykonanie i normy</h2><small data-report-generated aria-live="polite"></small></div></div><table><thead><tr><th>Data</th><th>Pracownik</th><th>Status</th><th>Obecność</th><th>PICK</th><th>PAK</th><th>Norma</th><th>Świeżość</th></tr></thead><tbody data-report-body></tbody></table></section>`;

  const checkedIds = () => [...reports.querySelectorAll('.report-people-grid input:checked')].map((input) => input.value);
  const updateSelectionCount = () => {
    const count = checkedIds().length;
    reports.querySelector('[data-report-count]').textContent = `Wybrano ${count}`;
    reports.querySelector('[data-report-generate]').disabled = count === 0;
    reports.querySelectorAll('[data-report-export]').forEach((button) => { button.disabled = count === 0; });
  };
  const renderReport = () => {
    const ids = new Set(checkedIds());
    const selected = teamData.filter((person) => ids.has(person.id));
    const pick = selected.reduce((sum, person) => sum + person.pick, 0);
    const pack = selected.reduce((sum, person) => sum + person.pack, 0);
    const norm = selected.length ? Math.round(selected.reduce((sum, person) => sum + person.norm, 0) / selected.length) : null;
    reports.querySelector('[data-report-selected]').textContent = String(selected.length);
    reports.querySelector('[data-report-pick]').textContent = String(pick);
    reports.querySelector('[data-report-pack]').textContent = String(pack);
    reports.querySelector('[data-report-norm]').textContent = norm === null ? '—' : `${norm}%`;
    reports.querySelector('[data-report-body]').innerHTML = selected.length
      ? selected.map((person) => `<tr><td>07.09.2026</td><td><b>${person.name}</b><small>${person.id}</small></td><td class="${person.status === 'W PRACY' ? 'good' : person.status === 'PRZERWA' ? 'warn' : 'danger'}">${person.status}</td><td>${person.attendance}</td><td><strong>${person.pick}</strong></td><td><strong>${person.pack}</strong></td><td class="${person.norm >= 90 ? 'good' : person.norm > 0 ? 'warn' : 'danger'}">${person.norm}%</td><td>LIVE</td></tr>`).join('')
      : '<tr><td colspan="8" class="report-empty">Zaznacz co najmniej jednego pracownika.</td></tr>';
    const from = reports.querySelector('[data-report-from]').value;
    const to = reports.querySelector('[data-report-to]').value;
    reports.querySelector('[data-report-generated]').textContent = selected.length ? `Zakres ${from} – ${to} · ${selected.length} osób` : '';
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
