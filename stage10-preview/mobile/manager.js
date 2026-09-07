(() => {
  const shell = document.querySelector('.worker-shell');
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || shell.dataset.demoRole || 'WORKER');
  const capabilities = window.MOLRoles.get(role);
  if (!capabilities?.managerMobile) return;

  const managerStyles = document.createElement('link');
  managerStyles.rel = 'stylesheet';
  managerStyles.href = './manager.css';
  document.head.append(managerStyles);

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
    <h2>Raporty</h2>
    <div class="manager-filter mol-card"><label>Od <input type="date" value="2026-09-01"></label><label>Do <input type="date" value="2026-09-07"></label></div>
    <div class="manager-mobile-grid"><article class="mol-card"><small>Śr. obecność</small><strong>7:48</strong></article><article class="mol-card"><small>Śr. norma</small><strong>89%</strong></article></div>
    <div class="mol-card manager-report-list"><div><b>Aneta Nowak</b><span>07:45 · 88%</span></div><div><b>Kamil Kaczmarek</b><span>08:12 · 96%</span></div><div><b>Piotr Wiśniewski</b><span>08:15 · 103%</span></div></div>
    <div class="manager-actions"><button class="mol-button">CSV</button><button class="mol-button mol-button--primary">XLSX</button></div>`;

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

  managerNav.querySelectorAll('[data-manager-target]').forEach((button) => button.addEventListener('click', () => showManager(button.dataset.managerTarget)));
  managerPanels.forEach((panel) => panel.querySelector('.manager-back').addEventListener('click', () => showManager('team')));
})();
