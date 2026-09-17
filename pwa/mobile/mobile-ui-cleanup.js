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
    if (title && title.textContent !== 'Komunikaty') title.textContent = 'Komunikaty';
  }

  function observeTopLevel(panel, compact) {
    if (!panel) return;
    let scheduled = false;
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.target === panel)) return;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        compact();
      });
    });
    observer.observe(panel, { childList: true });
  }

  compactProcess();
  compactMessages();
  observeTopLevel(processPanel, compactProcess);
  observeTopLevel(messagesPanel, compactMessages);
})();
