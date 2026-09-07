(() => {
  const shell = document.querySelector('.worker-shell');
  const navButtons = [...document.querySelectorAll('[data-nav]')];
  const dashboardSections = [...document.querySelectorAll('.worker-hero, .work-status, .kpi-grid, .section-block, .active-process')];
  const panels = [...document.querySelectorAll('[data-panel]')];

  const show = (screen) => {
    shell.dataset.screen = screen;
    navButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.nav === screen));
    dashboardSections.forEach((section) => { section.hidden = screen !== 'home'; });
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== screen; });
  };

  navButtons.forEach((button) => button.addEventListener('click', () => show(button.dataset.nav)));

  document.querySelectorAll('[data-action="process"], [data-action="change-process"]')
    .forEach((button) => button.addEventListener('click', () => show('process')));

  document.querySelectorAll('[data-action="start"], [data-action="stop"], [data-action="process-stop"]')
    .forEach((button) => button.addEventListener('click', () => {
      button.blur();
      window.dispatchEvent(new CustomEvent('mol:stage10-demo-action', { detail: { action: button.dataset.action } }));
    }));

  show('home');
})();
