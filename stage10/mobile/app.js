(() => {
  'use strict';
  const BUILD = '20260908.3';
  const shell = document.querySelector('.worker-shell');
  if (!shell) return;
  const params = new URLSearchParams(location.search);
  const hintedRole = window.MOLRoles.normalizeRole(params.get('role') || 'WORKER');
  const capabilities = window.MOLRoles.get(hintedRole) || window.MOLRoles.get('WORKER');
  const managerNav = document.getElementById('managerMobileNav');
  const bottomNav = document.querySelector('.bottom-nav');
  const roleChip = document.getElementById('mobileRoleChip');
  const panelLabel = document.getElementById('mobilePanelLabel');

  if (roleChip) roleChip.textContent = hintedRole;
  if (panelLabel) panelLabel.textContent = capabilities.managerMobile ? 'Panel mobilny · weryfikacja sesji' : 'Panel pracownika · weryfikacja sesji';
  if (managerNav) managerNav.hidden = !capabilities.managerMobile;
  bottomNav?.classList.toggle('has-manager', capabilities.managerMobile);

  const panels = () => [...document.querySelectorAll('[data-panel]')];
  const dashboard = () => [...document.querySelectorAll('.worker-hero,.work-status,.kpi-grid,.section-block,.active-process')];
  function show(requested) {
    const screen = requested === 'team' && !capabilities.managerMobile ? 'home' : requested;
    shell.dataset.screen = screen;
    document.querySelectorAll('[data-nav]').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === screen));
    dashboard().forEach((node) => { node.hidden = screen !== 'home'; });
    panels().forEach((panel) => { panel.hidden = panel.dataset.panel !== screen; });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  window.MOLMobileShow = show;

  document.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => show(button.dataset.nav)));
  document.querySelectorAll('[data-action="process"],[data-action="change-process"]').forEach((button) => button.addEventListener('click', () => show('process')));
  document.querySelectorAll('[data-norm-period]').forEach((drawer) => drawer.addEventListener('toggle', () => {
    if (!drawer.open) return;
    document.querySelectorAll('[data-norm-period]').forEach((other) => { if (other !== drawer) other.open = false; });
  }));

  const versioned = (src) => `${src}${src.includes('?') ? '&' : '?'}v=${BUILD}`;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = versioned(src); script.onload = resolve;
    script.onerror = () => reject(new Error(`Nie udało się załadować ${src}`)); document.head.append(script);
  });
  const loadSupport = async () => {
    await loadScript('../shared/states.js');
    await loadScript('../shared/brand.js');
    if (!window.MOLWarehouseTools) await loadScript('../shared/warehouse-tools.js');
    await loadScript('./worker-details.js');
    await loadScript('./spec-completion.js');
    await loadScript('./report-integrity.js');
    await loadScript('../shared/api.js');
    await loadScript('./live.js');
    await loadScript('./live-actions.js');
  };
  loadSupport().catch((error) => {
    console.error(error);
    const banner = document.createElement('div'); banner.setAttribute('role','alert');
    banner.style.cssText='position:fixed;z-index:99999;left:12px;right:12px;top:12px;padding:12px 16px;border-radius:10px;background:#45151a;color:#fff;font:600 14px system-ui';
    banner.textContent=`Błąd uruchomienia MOL V2: ${error.message}`; document.body.prepend(banner);
  });
  show('home');
})();
