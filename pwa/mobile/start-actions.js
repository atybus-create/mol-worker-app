(() => {
  'use strict';

  const host = document.querySelector('[data-home-process-actions]');
  const processPanel = document.querySelector('[data-panel="process"]');
  if (!host || !processPanel) return;

  function moveActionsToStart() {
    const title = processPanel.querySelector('.process-actions-title');
    const actions = processPanel.querySelector('[data-process-actions]');
    if (!actions) return;

    host.replaceChildren();
    if (title) host.append(title);
    host.append(actions);
    host.hidden = false;
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
