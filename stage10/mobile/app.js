(() => {
  const shell = document.querySelector('.worker-shell');
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || shell.dataset.demoRole || 'WORKER');
  const capabilities = window.MOLRoles.get(role) || window.MOLRoles.get('WORKER');
  const managerNav = document.getElementById('managerMobileNav');
  const bottomNav = document.querySelector('.bottom-nav');
  const roleChip = document.getElementById('mobileRoleChip');
  const panelLabel = document.getElementById('mobilePanelLabel');

  const loadScript = (src) => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = resolve;
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
    if (!window.ESTYL_LOGO) await loadScript('../../logo.js');
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

  loadWorkerDetails();
  show('home');
})();
