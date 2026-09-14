(() => {
  'use strict';
  const api = window.MOLApi;
  if (!api) return;

  async function init() {
    try {
      await window.MOLLiveReady;
      const session = await api.requireSession({ surface: 'web' });
      if (!session) api.redirectLogin('session');
    } catch (error) {
      const status = document.querySelector('[data-live-integration-status]');
      if (status) status.textContent = `Nie udało się potwierdzić sesji: ${error.message}`;
    }
  }

  init();
})();
