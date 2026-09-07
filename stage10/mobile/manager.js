(() => {
  const shell = document.querySelector('.worker-shell');
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || shell.dataset.demoRole || 'WORKER');
  const capabilities = window.MOLRoles.get(role);
  if (!capabilities?.managerMobile) return;

  const managerStyles = document.createElement('link');
  managerStyles.rel = 'stylesheet';
  managerStyles.href = './manager.css';
  document.head.append(managerStyles);

  const reportPeople = [
    { id: 'MOL031', name: 'Aneta Nowak', attendance: '07:45', pickTotal: 1637, pickEligible: 1526, pickOutside: 111, pickTime: '15:11', pickNorm: 87, packTotal: 652, packEligible: 604, packOutside: 48, packTime: '10:52', packNorm: 89, total: 2289, totalEligible: 2130, totalOutside: 159, totalTime: '26:03', totalNorm: 88 },
    { id: 'MOL027', name: 'Kamil Kaczmarek', attendance: '08:12', pickTotal: 1884, pickEligible: 1812, pickOutside: 72, pickTime: '15:42', pickNorm: 98, packTotal: 728, packEligible: 698, packOutside: 30, packTime: '09:48', packNorm: 93, total: 2612, totalEligible: 2510, totalOutside: 102, totalTime: '25:30', totalNorm: 96 },
    { id: 'MOL011', name: 'Piotr Wiśniewski', attendance: '08:15', pickTotal: 2110, pickEligible: 2054, pickOutside: 56, pickTime: '16:10', pickNorm: 105, packTotal: 792, packEligible: 764, packOutside: 28, packTime: '10:16', packNorm: 101, total: 2902, totalEligible: 2818, totalOutside: 84, totalTime: '26:26', totalNorm: 103 },
    { id: 'MOL029', name: 'Tomasz Wójcik', attendance: '06:30', pickTotal: 1096, pickEligible: 981, pickOutside: 115, pickTime: '13:28', pickNorm: 69, packTotal: 466, packEligible: 412, packOutside: 54, packTime: '08:35', packNorm: 75, total: 1562, totalEligible: 1393, totalOutside: 169, totalTime: '22:03', totalNorm: 72 }
  ];

  const root = shell;
  const teamPanel = document.querySelector('[data-panel="team"]');
  const managerNav = document.createElement('div');
  managerNav.className = 'manager-actions';
  managerNav.innerHTML = `
    <button class="mol-button" data-manager-target="manager-reports">Raporty</button>
    <button class="mol-button" data-manager-target="manager-corrections">Korekty</button>
    <button class="mol-button" data-manager-target="manager-users">Użytkownicy</button>`;
  teamPanel.append(managerNav);

  const reports = document.createElement('section');
  reports.className = 'screen-placeholder manager-mobile manager-detail';
  reports.dataset.panel = 'manager-reports';
  reports.hidden = true;
  reports.innerHTML = `
    <button class="manager-back" type="button">← Zespół</button>
    <p class="mol-kicker">LEADER / ADMIN</p>
    <h2>Raport norm</h2>
    <div class="manager-filter mol-card"><label>Od <input data-mobile-report-from type="date" value="2026-09-01"></label><label>Do <input data-mobile-report-to type="date" value="2026-09-07"></label></div>
    <section class="mol-card mobile-report-selector">
      <div class="mobile-report-head"><div><small>Pracownicy do raportu</small><strong data-mobile-report-count>Wybrano 3</strong></div><div><button type="button" data-mobile-report-all>Wszyscy</button><button type="button" data-mobile-report-clear>Wyczyść</button></div></div>
      <div class="mobile-report-people">
        ${reportPeople.map((person, index) => `<label><input type="checkbox" value="${person.id}" ${index < 3 ? 'checked' : ''}><span><b>${person.name}</b><small>${person.id} · PICK/PAK łącznie ${person.total} · do normy ${person.totalEligible} · poza ${person.totalOutside}</small></span></label>`).join('')}
      </div>
      <button class="mol-button mol-button--primary" type="button" data-mobile-report-generate>Generuj raport dla zaznaczonych</button>
    </section>
    <div class="manager-mobile-grid"><article class="mol-card"><small>Wybrani</small><strong data-mobile-report-selected>3</strong></article><article class="mol-card"><small>Śr. PICK/PAK</small><strong data-mobile-report-norm>96%</strong></article></div>
    <p class="mol-muted" data-mobile-report-range>Zakres 01.09.2026–07.09.2026</p>
    <div class="mol-card manager-report-list" data-mobile-report-list></div>
    <div class="manager-actions"><button class="mol-button" data-mobile-export="CSV">CSV</button><button class="mol-button mol-button--primary" data-mobile-export="XLSX">XLSX</button></div>`;

  const corrections = document.createElement('section');
  corrections.className = 'screen-placeholder manager-mobile manager-detail';
  corrections.dataset.panel = 'manager-corrections';
  corrections.hidden = true;
  corrections.innerHTML = `
    <button class="manager-back" type="button">← Zespół</button>
    <p class="mol-kicker">Decyzje</p><h2>Korekty</h2>
    <div class="manager-correction-list">
      <article class="mol-card correction-item"><div><b>Anna Kowalska</b><small>07.09.2026 · 06:12 → 08:00</small><p>Wizyta lekarska</p></div><div class="correction-actions"><button class="accept">Akceptuj</button><button class="reject">Odrzuć</button></div></article>
      <article class="mol-card correction-item"><div><b>Piotr Wiśniewski</b><small>06.09.2026 · 14:00 → 16:30</small><p>Nadgodziny</p></div><div class="correction-actions"><button class="accept">Akceptuj</button><button class="reject">Odrzuć</button></div></article>
    </div>`;

  const allowedRoles = capabilities.userCreateRoles.join(' / ');
  const users = document.createElement('section');
  users.className = 'screen-placeholder manager-mobile manager-detail';
  users.dataset.panel = 'manager-users';
  users.hidden = true;
  users.innerHTML = `
    <button class="manager-back" type="button">← Zespół</button>
    <p class="mol-kicker">Administracja · ${role}</p><h2>Użytkownicy</h2>
    <div class="mol-card manager-user-policy"><small>Możesz tworzyć role</small><strong>${allowedRoles}</strong></div>
    <div class="manager-user-list">
      <article class="mol-card"><div><b>Dominika Tatarska</b><small>WORKER · MOL004 · aktywna</small></div><button class="mol-button">Opcje</button></article>
      <article class="mol-card"><div><b>Bożena</b><small>LEADER · aktywna</small></div><button class="mol-button">Opcje</button></article>
    </div>
    <button class="mol-button mol-button--primary manager-create-user">Dodaj użytkownika</button>`;

  root.insertBefore(reports, document.querySelector('.bottom-nav'));
  root.insertBefore(corrections, document.querySelector('.bottom-nav'));
  root.insertBefore(users, document.querySelector('.bottom-nav'));

  const managerPanels = [reports, corrections, users];
  const allPanels = () => [...document.querySelectorAll('[data-panel]')];
  const dashboard = [...document.querySelectorAll('.worker-hero, .work-status, .kpi-grid, .section-block, .active-process')];

  const showManager = (panelName) => {
    dashboard.forEach((node) => { node.hidden = true; });
    allPanels().forEach((panel) => { panel.hidden = panel.dataset.panel !== panelName; });
    document.querySelectorAll('.bottom-nav button').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === 'team'));
    shell.dataset.screen = panelName;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkedIds = () => [...reports.querySelectorAll('.mobile-report-people input:checked')].map((input) => input.value);
  const updateCount = () => {
    const count = checkedIds().length;
    reports.querySelector('[data-mobile-report-count]').textContent = `Wybrano ${count}`;
    reports.querySelector('[data-mobile-report-generate]').disabled = count === 0;
  };
  const formatDate = (value) => value ? value.split('-').reverse().join('.') : '—';
  const metricBlock = (label, total, eligible, outside, time, norm) => `<span><small>${label}</small><b>Łącznie ${total}</b><em>Do normy ${eligible}</em><i>Poza normą ${outside}</i><strong>Czas ${time} · ${norm}%</strong></span>`;
  const renderReport = () => {
    const selected = new Set(checkedIds());
    const rows = reportPeople.filter((person) => selected.has(person.id));
    reports.querySelector('[data-mobile-report-selected]').textContent = String(rows.length);
    reports.querySelector('[data-mobile-report-norm]').textContent = rows.length ? `${Math.round(rows.reduce((sum, row) => sum + row.totalNorm, 0) / rows.length)}%` : '—';
    const from = reports.querySelector('[data-mobile-report-from]').value;
    const to = reports.querySelector('[data-mobile-report-to]').value;
    reports.querySelector('[data-mobile-report-range]').textContent = `Zakres ${formatDate(from)}–${formatDate(to)}`;
    reports.querySelector('[data-mobile-report-list]').innerHTML = rows.length
      ? rows.map((person) => `<article class="mobile-norm-report"><div><b>${person.name}</b><small>${person.id}</small></div><div class="mobile-norm-grid">${metricBlock('PICK', person.pickTotal, person.pickEligible, person.pickOutside, person.pickTime, person.pickNorm)}${metricBlock('PAK', person.packTotal, person.packEligible, person.packOutside, person.packTime, person.packNorm)}${metricBlock('PICK/PAK', person.total, person.totalEligible, person.totalOutside, person.totalTime, person.totalNorm)}</div></article>`).join('')
      : '<p class="mol-muted">Zaznacz co najmniej jednego pracownika.</p>';
  };

  reports.querySelectorAll('.mobile-report-people input').forEach((input) => input.addEventListener('change', updateCount));
  reports.querySelector('[data-mobile-report-all]').addEventListener('click', () => {
    reports.querySelectorAll('.mobile-report-people input').forEach((input) => { input.checked = true; });
    updateCount();
  });
  reports.querySelector('[data-mobile-report-clear]').addEventListener('click', () => {
    reports.querySelectorAll('.mobile-report-people input').forEach((input) => { input.checked = false; });
    updateCount();
  });
  reports.querySelector('[data-mobile-report-generate]').addEventListener('click', renderReport);
  reports.querySelectorAll('[data-mobile-export]').forEach((button) => button.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-export', { detail: { format: button.dataset.mobileExport, employeeIds: checkedIds(), from: reports.querySelector('[data-mobile-report-from]').value, to: reports.querySelector('[data-mobile-report-to]').value, role } }));
  }));

  managerNav.querySelectorAll('[data-manager-target]').forEach((button) => button.addEventListener('click', () => showManager(button.dataset.managerTarget)));
  managerPanels.forEach((panel) => panel.querySelector('.manager-back').addEventListener('click', () => showManager('team')));
  updateCount();
  renderReport();
})();
