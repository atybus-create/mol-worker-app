(() => {
  const form = document.querySelector('[data-auth-form]');
  const password = document.querySelector('[data-auth-password]');
  const toggle = document.querySelector('[data-auth-toggle]');
  const message = document.querySelector('[data-auth-message]');

  toggle?.addEventListener('click', () => {
    const reveal = password.type === 'password';
    password.type = reveal ? 'text' : 'password';
    toggle.textContent = reveal ? 'Ukryj' : 'Pokaż';
    toggle.setAttribute('aria-pressed', String(reveal));
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = String(new FormData(form).get('username') || '').trim();
    const secret = String(new FormData(form).get('password') || '');
    if (!username || !secret) {
      message.textContent = 'Wpisz login i hasło / PIN.';
      message.className = 'auth-message is-error';
      return;
    }
    message.textContent = 'Ekran gotowy. Połączenie z logowaniem V2 nastąpi w Etapie 11.';
    message.className = 'auth-message is-success';
    window.dispatchEvent(new CustomEvent('mol:stage10-auth-submit', { detail: { username, surface: document.body.dataset.surface || 'unknown' } }));
    password.value = '';
  });
})();
