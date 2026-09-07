(() => {
  const shell = document.querySelector('.worker-shell');
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || shell.dataset.demoRole || 'WORKER');
  const capabilities = window.MOLRoles.get(role) || window.MOLRoles.get('WORKER');
  const managerNav = document.getElementById('managerMobileNav');
  const bottomNav = document.querySelector('.bottom-nav');
  const roleChip = document.getElementById('mobileRoleChip');
  const panelLabel = document.getElementById('mobilePanelLabel');

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

  show('home');
})();
