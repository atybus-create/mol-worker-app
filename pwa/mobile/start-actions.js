(() => {
  'use strict';

  const BUILD = '20260915.4';
  const processPanel = document.querySelector('[data-panel="process"]');
  const workStatus = document.querySelector('.work-status');
  if (!processPanel || !workStatus) return;

  let host = document.querySelector('[data-home-process-actions]');
  if (!host) {
    host = document.createElement('section');
    host.className = 'section-block home-actions-block';
    host.dataset.homeProcessActions = 'true';
    host.setAttribute('aria-label', 'Akcje pracy');
    workStatus.insertAdjacentElement('afterend', host);
  }

  function moveActionsToStart() {
    const title = processPanel.querySelector('.process-actions-title');
    const actions = processPanel.querySelector('[data-process-actions]');
    if (!actions) return;

    host.replaceChildren();
    if (title) host.append(title);
    host.append(actions);
    host.hidden = document.querySelector('.worker-shell')?.dataset.screen !== 'home';

    const processHelp = processPanel.querySelector('.process-screen-head small');
    if (processHelp) processHelp.textContent = 'Tu wybierasz i przeglądasz bieżący proces.';
    const label = document.getElementById('mobilePanelLabel');
    if (label) label.textContent = `MOL App V3 · build ${BUILD}`;
  }

  const observer = new MutationObserver(() => moveActionsToStart());
  observer.observe(processPanel, { childList: true, subtree: true });
  moveActionsToStart();

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-home-process-actions] [data-process-action="change-process"]');
    if (!button) return;
    window.MOLMobileShow?.('process');
    requestAnimationFrame(() => {
      processPanel.querySelector('[data-process-options]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, true);
})();
