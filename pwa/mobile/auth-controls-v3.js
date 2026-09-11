(() => {
  'use strict';

  const button = document.getElementById('mobileLogoutButton');
  if (!button) return;

  const SESSION_KEY = 'mol.v3.session';
  const LOGOUT_URL = 'https://n8n.estyl.team/webhook/mol-app-v3-auth-logout';

  const clearLocalSession = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* optional storage */ }
    try { window.MOLApi?.clearToken?.(); } catch { /* no-op */ }
  };

  const requestId = () => {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `logout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const redirectToLogin = () => {
    location.replace('./login.html?reason=session&v=20260911.3');
  };

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Wylogowywanie…';

    try {
      if (window.MOLApi?.logout) {
        try { await window.MOLApi.logout({ clearOnFailure: true }); }
        catch { clearLocalSession(); }
      } else {
        let token = '';
        try { token = sessionStorage.getItem(SESSION_KEY) || ''; } catch { /* no-op */ }
        if (token) {
          try {
            await fetch(LOGOUT_URL, {
              method: 'POST',
              cache: 'no-store',
              credentials: 'omit',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ request_id: requestId() }),
            });
          } catch { /* local logout still must complete */ }
        }
        clearLocalSession();
      }
    } finally {
      clearLocalSession();
      button.textContent = original;
      redirectToLogin();
    }
  });
})();
