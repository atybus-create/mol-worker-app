(() => {
  'use strict';

  const form = document.querySelector('[data-auth-form]');
  const password = document.querySelector('[data-auth-password]');
  const toggle = document.querySelector('[data-auth-toggle]');
  const message = document.querySelector('[data-auth-message]');
  const submit = form?.querySelector('[type="submit"]');
  const surface = document.body.dataset.surface || 'mobile';
  let busy = false;

  const setMessage = (text, state = '') => {
    if (!message) return;
    message.textContent = text || '';
    message.className = `auth-message${state ? ` ${state}` : ''}`;
  };

  const setBusy = (value) => {
    busy = value;
    if (submit) submit.disabled = value;
    for (const input of form?.querySelectorAll('input') || []) input.disabled = value;
    if (toggle) toggle.disabled = value;
  };

  const loadApi = () => new Promise((resolve, reject) => {
    if (window.MOLApi) return resolve(window.MOLApi);
    const script = document.createElement('script');
    script.src = '../shared/api.js';
    script.onload = () => resolve(window.MOLApi);
    script.onerror = () => reject(new Error('Nie udało się załadować klienta API V2.'));
    document.head.append(script);
  });

  toggle?.addEventListener('click', () => {
    const reveal = password.type === 'password';
    password.type = reveal ? 'text' : 'password';
    toggle.textContent = reveal ? 'Ukryj' : 'Pokaż';
    toggle.setAttribute('aria-pressed', String(reveal));
  });

  const redirectFor = (role) => location.replace(`./index.html?role=${encodeURIComponent(String(role || '').toUpperCase())}`);
  const reason = new URLSearchParams(location.search).get('reason');
  if (reason === 'session') setMessage('Sesja wygasła lub została zakończona. Zaloguj się ponownie.', 'is-error');
  if (reason === 'worker_web') setMessage('Konto WORKER nie ma dostępu do panelu WWW.', 'is-error');
  if (reason === 'forbidden') setMessage('Brak uprawnień do tego widoku.', 'is-error');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(form);
    const username = String(data.get('username') || '').trim();
    const secret = String(data.get('password') || '');
    if (!username || !secret) return setMessage('Wpisz login i hasło.', 'is-error');
    setBusy(true);
    setMessage('Logowanie…');
    try {
      const api = await loadApi();
      const session = await api.login(username, secret);
      const role = String(session?.user?.role || '').toUpperCase();
      if (surface === 'web' && role === 'WORKER') {
        try { await api.logout({ clearOnFailure: true }); } catch { api.clearToken(); }
        setMessage('Konto WORKER nie ma dostępu do panelu WWW.', 'is-error');
        return;
      }
      setMessage('Logowanie potwierdzone. Otwieram aplikację…', 'is-success');
      redirectFor(role);
    } catch (error) {
      setMessage(error.message || 'Logowanie nie powiodło się.', 'is-error');
    } finally {
      if (password) password.value = '';
      setBusy(false);
    }
  });

  (async () => {
    try {
      const api = await loadApi();
      if (!api.getToken()) return;
      setBusy(true);
      setMessage('Sprawdzanie istniejącej sesji…');
      const session = await api.requireSession({ surface });
      if (!session) return;
      const role = String(session.user.role || '').toUpperCase();
      setMessage('Sesja aktywna. Otwieram aplikację…', 'is-success');
      redirectFor(role);
    } catch (error) {
      if (error.status === 403 && surface === 'web') setMessage('Konto WORKER nie ma dostępu do panelu WWW.', 'is-error');
      else if (error.status === 401) setMessage('Sesja wygasła. Zaloguj się ponownie.', 'is-error');
      else setMessage(error.message || 'Nie udało się sprawdzić sesji.', 'is-error');
      try { window.MOLApi?.clearToken(); } catch { /* no-op */ }
    } finally {
      setBusy(false);
    }
  })();
})();
