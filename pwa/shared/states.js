(() => {
  const ensureStyles = () => {
    if (document.querySelector('link[data-mol-states]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../shared/states.css';
    link.dataset.molStates = 'true';
    document.head.append(link);
  };

  ensureStyles();

  const layer = document.createElement('div');
  layer.className = 'mol-state-layer';
  layer.hidden = true;
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.innerHTML = '<section class="mol-state-card" data-state-card></section>';
  document.body.append(layer);

  const offline = document.createElement('div');
  offline.className = 'mol-offline-banner';
  offline.hidden = true;
  offline.setAttribute('role', 'status');
  offline.setAttribute('aria-live', 'polite');
  offline.innerHTML = '<span>Brak połączenia. Dane mogą być nieaktualne.</span><button class="mol-button" type="button" data-offline-retry>Ponów</button>';
  document.body.append(offline);

  const card = layer.querySelector('[data-state-card]');

  const templates = {
    loading: { icon: '<span class="mol-state-spinner" aria-hidden="true"></span>', title: 'Ładowanie danych', text: 'Pobieramy aktualny stan z MOL App V2.', retry: false, close: false },
    retry: { icon: '↻', title: 'Nie udało się pobrać danych', text: 'Połączenie mogło zostać przerwane. Spróbuj ponownie.', retry: true, close: true },
    expired: { icon: '⌛', title: 'Sesja wygasła', text: 'Zaloguj się ponownie, aby kontynuować pracę.', retry: false, close: true },
    forbidden: { icon: '⛔', title: 'Brak uprawnień', text: 'Twoja rola nie ma dostępu do tej funkcji.', retry: false, close: true },
    empty: { icon: '—', title: 'Brak danych', text: 'Dla wybranego zakresu nie ma jeszcze danych do pokazania.', retry: false, close: true }
  };

  const hide = () => { layer.hidden = true; card.innerHTML = ''; };
  const show = (type, options = {}) => {
    const base = templates[type] || templates.retry;
    const state = { ...base, ...options };
    card.innerHTML = `<div class="mol-state-icon">${state.icon}</div><h2>${state.title}</h2><p>${state.text}</p><div class="mol-state-actions">${state.retry ? '<button class="mol-button mol-button--primary" type="button" data-state-retry>Ponów</button>' : ''}${state.close ? '<button class="mol-button" type="button" data-state-close>Zamknij</button>' : ''}</div>`;
    layer.hidden = false;
    card.querySelector('[data-state-close]')?.addEventListener('click', hide, { once: true });
    card.querySelector('[data-state-retry]')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('mol:ui-retry', { detail: { type } })), { once: true });
  };

  const setOffline = (value) => { offline.hidden = !value; };
  offline.querySelector('[data-offline-retry]').addEventListener('click', () => window.dispatchEvent(new CustomEvent('mol:ui-retry', { detail: { type: 'offline' } })));

  window.MOLStates = Object.freeze({ show, hide, setOffline });
})();
