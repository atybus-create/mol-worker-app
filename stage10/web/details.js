(() => {
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || 'LEADER');
  const capabilities = window.MOLRoles.get(role);
  if (!capabilities?.web) return;

  const reports = document.querySelector('[data-view="reports"]');
  reports.innerHTML = `
    <div class="page-title"><div><p class="mol-kicker">Analiza zespołu</p><h1>Raporty</h1></div></div>
    <div class="view-toolbar">
      <label>Od <input type="date" value="2026-09-01"></label>
      <label>Do <input type="date" value="2026-09-07"></label>
      <label>Pracownik <select><option>Wszyscy</option><option>Aneta Nowak</option><option>Kamil Kaczmarek</option></select></label>
      <button class="mol-button mol-button--primary">Pokaż raport</button>
      <button class="mol-button">Eksport CSV</button><button class="mol-button">Eksport XLSX</button>
    </div>
    <div class="web-stat-grid"><article class="mol-card"><small>Wiersze</small><strong>42</strong></article><article class="mol-card"><small>Śr. obecność</small><strong>7:48</strong></article><article class="mol-card"><small>Śr. norma</small><strong>89%</strong></article><article class="mol-card"><small>Pokrycie danych</small><strong>98%</strong></article></div>
    <div class="report-visuals"><article class="mol-card report-chart"><h2>Obecność</h2><strong class="big">89%</strong><div class="report-bars"><i style="height:68%"></i><i style="height:82%"></i><i style="height:91%"></i><i style="height:87%"></i><i style="height:96%"></i></div></article><article class="mol-card report-chart"><h2>Realizacja norm</h2><strong class="big">91%</strong><svg class="report-line" viewBox="0 0 320 110" aria-label="Trend realizacji norm"><polyline points="5,75 55,62 105,63 155,44 205,50 255,31 315,16" fill="none" stroke="currentColor" stroke-width="5"/></svg></article></div>
    <section class="mol-card detail-table-card"><h2>Obecność i normy</h2><table><thead><tr><th>Data</th><th>Pracownik</th><th>Status</th><th>START</th><th>STOP</th><th>Obecność</th><th>Norma</th><th>Świeżość</th></tr></thead><tbody><tr><td>07.09.2026</td><td>Aneta Nowak</td><td class="good">Obecny</td><td>07:03</td><td>—</td><td>07:45</td><td class="warn">88%</td><td>LIVE</td></tr><tr><td>07.09.2026</td><td>Kamil Kaczmarek</td><td class="good">Obecny</td><td>06:12</td><td>—</td><td>08:12</td><td class="good">96%</td><td>LIVE</td></tr><tr><td>07.09.2026</td><td>Tomasz Wójcik</td><td class="warn">Przerwa</td><td>06:45</td><td>—</td><td>06:30</td><td class="warn">72%</td><td>LIVE</td></tr></tbody></table></section>`;

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
      <section class="mol-card user-list-card"><h2>Lista użytkowników</h2><div class="user-row"><div><b>Dominika Tatarska</b><small>MOL004 · dtatarska</small></div><span>WORKER</span><span class="good">Aktywna</span><div class="user-row-actions"><button class="mol-button">Reset hasła</button><button class="mol-button mol-button--danger">Dezaktywuj</button></div></div><div class="user-row"><div><b>Bożena</b><small>LEADER</small></div><span>LEADER</span><span class="good">Aktywna</span><div class="user-row-actions"><button class="mol-button">Reset hasła</button></div></div><div class="user-row"><div><b>Artur</b><small>MOL015 · atybus</small></div><span>ADMIN</span><span class="good">Aktywna</span><div class="user-row-actions"><button class="mol-button">Reset hasła</button></div></div></section>
    </div>`;

  const audit = document.querySelector('[data-view="audit"]');
  audit.innerHTML = `
    <div class="page-title"><div><p class="mol-kicker">Audyt</p><h1>Historia operacji</h1></div></div>
    <section class="mol-card audit-card"><h2>Ostatnie operacje administracyjne</h2><div class="audit-list"><div class="audit-item"><b>07.09.2026 11:12</b><span>USER_CREATED · konto WORKER</span><span>LEADER</span><span>Bez danych hasła</span></div><div class="audit-item"><b>07.09.2026 10:58</b><span>PASSWORD_CHANGED</span><span>ADMIN</span><span>Sesje unieważnione</span></div><div class="audit-item"><b>07.09.2026 10:41</b><span>USER_DEACTIVATED</span><span>ADMIN</span><span>Sesje unieważnione</span></div><div class="audit-item"><b>07.09.2026 10:22</b><span>CORRECTION_REJECTED</span><span>LEADER</span><span>Hash propozycji zachowany</span></div></div></section>`;

  document.querySelector('[data-demo-user-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-user-create', { detail: { role } }));
  });
})();
