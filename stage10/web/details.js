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
    pickTime: row.dataset.pickTime || '00:00',
    pickNorm: Number(row.dataset.pickNorm || 0),
    pack: Number(row.dataset.pack || 0),
    packTime: row.dataset.packTime || '00:00',
    packNorm: Number(row.dataset.packNorm || 0),
    total: Number(row.dataset.total || 0),
    totalTime: row.dataset.totalTime || '00:00',
    totalNorm: Number(row.dataset.totalNorm || 0),
    monthPick: Number(row.dataset.monthPick || 0),
    monthPickTime: row.dataset.monthPickTime || '00:00',
    monthPickNorm: Number(row.dataset.monthPickNorm || 0),
    monthPack: Number(row.dataset.monthPack || 0),
    monthPackTime: row.dataset.monthPackTime || '00:00',
    monthPackNorm: Number(row.dataset.monthPackNorm || 0),
    monthTotal: Number(row.dataset.monthTotal || 0),
    monthTotalTime: row.dataset.monthTotalTime || '00:00',
    monthTotalNorm: Number(row.dataset.monthTotalNorm || 0)
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
        ${teamData.map((person, index) => `<label class="report-person"><input type="checkbox" value="${person.id}" ${index < 3 ? 'checked' : ''}><span><b>${person.name}</b><small>${person.id}</small></span><span class="report-person-output"><i>PICK <strong>${person.monthPick}</strong></i><i>PAK <strong>${person.monthPack}</strong></i><i>PICK/PAK <strong>${person.monthTotalNorm}%</strong></i></span></label>`).join('')}
      </div>
      <p class="report-help">Możesz wybrać jednego, kilku lub wszystkich pracowników. Raport i eksport obejmują dokładnie zaznaczone osoby oraz wskazany zakres dat.</p>
    </section>
    <div class="web-stat-grid report-summary">
      <article class="mol-card"><small>Wybrani pracownicy</small><strong data-report-selected>3</strong></article>
      <article class="mol-card norm-summary-card"><small>PICK</small><strong data-report-pick>0</strong><span data-report-pick-time>00:00</span><b data-report-pick-norm>—</b></article>
      <article class="mol-card norm-summary-card"><small>PAK</small><strong data-report-pack>0</strong><span data-report-pack-time>00:00</span><b data-report-pack-norm>—</b></article>
      <article class="mol-card norm-summary-card"><small>PICK/PAK</small><strong data-report-total>0</strong><span data-report-total-time>00:00</span><b data-report-total-norm>—</b></article>
    </div>
    <section class="mol-card detail-table-card"><div class="detail-table-head"><div><h2>Normy za wybrany okres</h2><small data-report-generated aria-live="polite"></small></div></div><table class="norm-report-table"><thead><tr><th>Pracownik</th><th>PICK ilość</th><th>PICK czas</th><th>PICK %</th><th>PAK ilość</th><th>PAK czas</th><th>PAK %</th><th>PICK/PAK ilość</th><th>PICK/PAK czas</th><th>PICK/PAK %</th><th>Świeżość</th></tr></thead><tbody data-report-body></tbody></table></section>`;

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

  const renderReport = () => {
    const ids = new Set(checkedIds());
    const selected = teamData.filter((person) => ids.has(person.id));
    const pick = selected.reduce((sum, person) => sum + person.monthPick, 0);
    const pack = selected.reduce((sum, person) => sum + person.monthPack, 0);
    const total = selected.reduce((sum, person) => sum + person.monthTotal, 0);
    const pickTime = selected.reduce((sum, person) => sum + toMinutes(person.monthPickTime), 0);
    const packTime = selected.reduce((sum, person) => sum + toMinutes(person.monthPackTime), 0);
    const totalTime = selected.reduce((sum, person) => sum + toMinutes(person.monthTotalTime), 0);
    const pickNorm = average(selected, 'monthPickNorm');
    const packNorm = average(selected, 'monthPackNorm');
    const totalNorm = average(selected, 'monthTotalNorm');

    reports.querySelector('[data-report-selected]').textContent = String(selected.length);
    reports.querySelector('[data-report-pick]').textContent = String(pick);
    reports.querySelector('[data-report-pick-time]').textContent = fromMinutes(pickTime);
    reports.querySelector('[data-report-pick-norm]').textContent = pickNorm === null ? '—' : `${pickNorm}%`;
    reports.querySelector('[data-report-pack]').textContent = String(pack);
    reports.querySelector('[data-report-pack-time]').textContent = fromMinutes(packTime);
    reports.querySelector('[data-report-pack-norm]').textContent = packNorm === null ? '—' : `${packNorm}%`;
    reports.querySelector('[data-report-total]').textContent = String(total);
    reports.querySelector('[data-report-total-time]').textContent = fromMinutes(totalTime);
    reports.querySelector('[data-report-total-norm]').textContent = totalNorm === null ? '—' : `${totalNorm}%`;

    reports.querySelector('[data-report-body]').innerHTML = selected.length
      ? selected.map((person) => `<tr><td><b>${person.name}</b><small>${person.id}</small></td><td><strong>${person.monthPick}</strong></td><td>${person.monthPickTime}</td><td class="${person.monthPickNorm >= 90 ? 'good' : person.monthPickNorm > 0 ? 'warn' : 'danger'}">${person.monthPickNorm}%</td><td><strong>${person.monthPack}</strong></td><td>${person.monthPackTime}</td><td class="${person.monthPackNorm >= 90 ? 'good' : person.monthPackNorm > 0 ? 'warn' : 'danger'}">${person.monthPackNorm}%</td><td><strong>${person.monthTotal}</strong></td><td>${person.monthTotalTime}</td><td class="${person.monthTotalNorm >= 90 ? 'good' : person.monthTotalNorm > 0 ? 'warn' : 'danger'}">${person.monthTotalNorm}%</td><td>LIVE</td></tr>`).join('')
      : '<tr><td colspan="11" class="report-empty">Zaznacz co najmniej jednego pracownika.</td></tr>';
    const from = reports.querySelector('[data-report-from]').value;
    const to = reports.querySelector('[data-report-to]').value;
    reports.querySelector('[data-report-generated]').textContent = selected.length ? `Zakres ${formatDate(from)} – ${formatDate(to)} · ${selected.length} osób · dane w układzie ilość / czas / procent normy` : '';
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
