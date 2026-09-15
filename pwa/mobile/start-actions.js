(() => {
  'use strict';

  const BUILD = '20260915.8';
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

  let scheduled = false;
  function renderStartActions() {
    scheduled = false;
    const source = processPanel.querySelector('[data-process-actions]');
    if (!source) return;

    const title = document.createElement('div');
    title.className = 'section-title process-actions-title';
    title.innerHTML = '<h2>Akcje</h2><span>backend V3</span>';

    const actions = source.cloneNode(true);
    actions.dataset.homeProcessActionsGrid = 'true';
    actions.removeAttribute('data-process-actions');

    host.replaceChildren(title, actions);
    host.hidden = document.querySelector('.worker-shell')?.dataset.screen !== 'home';

    const label = document.getElementById('mobilePanelLabel');
    if (label) label.textContent = `MOL App V3 · build ${BUILD}`;
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(renderStartActions);
  }

  const observer = new MutationObserver(scheduleRender);
  observer.observe(processPanel, { childList: true, subtree: true });
  renderStartActions();

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-home-process-actions] [data-process-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.processAction;

    if (action === 'change-process') {
      window.MOLMobileShow?.('process');
      requestAnimationFrame(() => {
        processPanel.querySelector('[data-process-options]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    const original = processPanel.querySelector(`[data-process-action="${action}"]`);
    if (original && !original.disabled) original.click();
  });
})();
