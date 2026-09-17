(() => {
  'use strict';

  const processPanel = document.querySelector('[data-panel="process"]');
  const messagesPanel = document.querySelector('[data-panel="messages"]');

  function compactProcess() {
    if (!processPanel) return;
    processPanel.querySelector('.process-screen-status')?.remove();
    processPanel.querySelector('.process-actions-title')?.remove();
    processPanel.querySelector('.process-screen-head .mol-kicker')?.remove();
    processPanel.querySelector('.process-screen-head small')?.remove();
  }

  function compactMessages() {
    if (!messagesPanel) return;
    const head = messagesPanel.querySelector('.v3-comm-screen-head');
    if (!head) return;
    head.querySelector('p')?.remove();
    head.querySelector('small')?.remove();
    const title = head.querySelector('h2');
    if (title) title.textContent = 'Komunikaty';
  }

  const schedule = (() => {
    let pending = false;
    return () => {
      if (pending) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        compactProcess();
        compactMessages();
      });
    };
  })();

  compactProcess();
  compactMessages();

  if (processPanel) new MutationObserver(schedule).observe(processPanel, { childList: true, subtree: true });
  if (messagesPanel) new MutationObserver(schedule).observe(messagesPanel, { childList: true, subtree: true });
})();
