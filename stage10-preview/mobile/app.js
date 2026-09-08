(() => {
  const shell = document.querySelector('.worker-shell');
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || shell.dataset.demoRole || 'WORKER');
  const capabilities = window.MOLRoles.get(role) || window.MOLRoles.get('WORKER');
  const managerNav = document.getElementById('managerMobileNav');
  const bottomNav = document.querySelector('.bottom-nav');
  const roleChip = document.getElementById('mobileRoleChip');
  const panelLabel = document.getElementById('mobilePanelLabel');

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Nie udało się załadować ${src}`));
    document.head.append(script);
  });

  const stateScript = document.createElement('script');
  stateScript.src = '../shared/states.js';
  document.body.append(stateScript);

  shell.dataset.demoRole = role;
  roleChip.textContent = role;
  roleChip.className = `mol-chip role-chip ${role === 'ADMIN' ? 'mol-chip--warning' : 'mol-chip--info'}`;
  panelLabel.textContent = capabilities.managerMobile ? 'Panel mobilny · tryb roli' : 'Panel pracownika';
  managerNav.hidden = !capabilities.managerMobile;
  bottomNav.classList.toggle('has-manager', capabilities.managerMobile);

  const getNavButtons = () => [...document.querySelectorAll('[data-nav]')];
  const dashboardSections = [...document.querySelectorAll('.worker-hero, .work-status, .kpi-grid, .section-block, .active-process')];
  const panels = [...document.querySelectorAll('[data-panel]')];

  const show = (requestedScreen) => {
    const screen = requestedScreen === 'team' && !capabilities.managerMobile ? 'home' : requestedScreen;
    shell.dataset.screen = screen;
    getNavButtons().forEach((button) => button.classList.toggle('is-active', button.dataset.nav === screen));
    dashboardSections.forEach((section) => { section.hidden = screen !== 'home'; });
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== screen; });
  };

  getNavButtons().forEach((button) => button.addEventListener('click', () => show(button.dataset.nav)));

  document.querySelectorAll('[data-action="process"], [data-action="change-process"]')
    .forEach((button) => button.addEventListener('click', () => show('process')));

  document.querySelectorAll('[data-action="start"], [data-action="stop"], [data-action="process-stop"]')
    .forEach((button) => button.addEventListener('click', () => {
      button.blur();
      window.dispatchEvent(new CustomEvent('mol:stage10-demo-action', { detail: { action: button.dataset.action, role } }));
    }));

  const normDrawers = [...document.querySelectorAll('[data-norm-period]')];
  normDrawers.forEach((drawer) => drawer.addEventListener('toggle', () => {
    if (!drawer.open) return;
    normDrawers.forEach((other) => {
      if (other !== drawer) other.open = false;
    });
  }));

  const loadBrand = async () => {
    await loadScript('../shared/brand.js');
  };

  const loadWarehouseConfig = async () => {
    if (!window.MOLWarehouseTools?.items) await loadScript('../shared/warehouse-tools.js');
  };

  const loadWorkerDetails = async () => {
    await Promise.all([loadBrand(), loadWarehouseConfig()]);
    await loadScript('./worker-details.js');
    await loadScript('./spec-completion.js');
    await loadScript('./report-integrity.js');
  };

  const renderActiveProcess = (selected) => {
    const activeCard = document.querySelector('.active-process');
    const activeName = activeCard?.querySelector('h2');
    const activeCode = activeCard?.querySelector('div > small:last-of-type');
    const statusChip = document.querySelector('.work-status .status-head .mol-chip');
    if (activeName) activeName.textContent = selected?.name ? selected.name.toUpperCase() : 'BRAK PROCESU';
    if (activeCode) activeCode.textContent = selected?.code ? `Kod procesu: ${selected.code}` : 'Brak aktywnego procesu';
    if (statusChip) {
      statusChip.textContent = selected?.code || 'BRAK PROCESU';
      statusChip.className = `mol-chip ${selected?.code ? 'mol-chip--success' : 'mol-chip--warning'}`;
    }
  };

  window.addEventListener('mol:stage10-demo-process-activate', (event) => {
    const selected = event.detail || {};
    renderActiveProcess(selected);
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-action', {
      detail: {
        action: selected.action,
        processCode: selected.code,
        previousProcessCode: selected.previousCode,
        role
      }
    }));
  });

  window.addEventListener('mol:stage10-demo-process-logout', (event) => {
    renderActiveProcess(null);
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-action', {
      detail: { action: 'process-logout', previousProcessCode: event.detail?.previousCode || null, role }
    }));
  });

  const prepareLiveView = () => {
    const workTitle = document.querySelector('.work-status h2');
    if (workTitle) workTitle.textContent = 'ŁADOWANIE…';
    const processChip = document.querySelector('.work-status .status-head .mol-chip');
    if (processChip) { processChip.textContent = '—'; processChip.className = 'mol-chip mol-chip--info'; }
    document.querySelectorAll('.work-status .status-stats strong,.kpi-grid article strong,.performance-metrics b,.performance-drawer summary > b').forEach((node) => { node.textContent = '—'; });
    const progress = document.querySelector('.kpi-grid .progress i');
    if (progress) progress.style.width = '0%';
    const activeName = document.querySelector('.active-process h2');
    if (activeName) activeName.textContent = 'ŁADOWANIE…';
    const activeCode = document.querySelector('.active-process small:last-of-type');
    if (activeCode) activeCode.textContent = 'Dane z backendu V2';
    const notices = document.querySelector('.notices');
    if (notices) {
      notices.querySelectorAll('article.notice').forEach((node) => node.remove());
      const info = document.createElement('article');
      info.className = 'mol-card notice';
      info.innerHTML = '<b>●</b><div><strong>Komunikaty z backendu V2</strong><small>Aktualne wiadomości są w zakładce Komunikaty.</small></div>';
      notices.append(info);
    }
    const managerList = document.querySelector('.manager-list');
    if (managerList) managerList.innerHTML = '<div class="manager-person"><div><b>Ładowanie zespołu…</b><small>Dane z backendu V2</small></div></div>';
    document.querySelectorAll('.manager-mobile-grid article strong').forEach((node) => { node.textContent = '—'; });
  };

  const bootstrapLive = async () => {
    prepareLiveView();
    await loadWorkerDetails();
    await loadScript('../shared/api.js');
    await loadScript('./live.js');
  };

  bootstrapLive().catch((error) => {
    console.error(error);
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;z-index:99999;left:12px;right:12px;top:12px;padding:12px 16px;border-radius:10px;background:#45151a;color:#fff;font:600 14px system-ui';
    banner.textContent = `Błąd uruchomienia integracji V2: ${error.message}`;
    document.body.prepend(banner);
  });

  show('home');
})();
