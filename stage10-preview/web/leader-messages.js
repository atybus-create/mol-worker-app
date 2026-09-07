(() => {
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || 'LEADER');
  const capabilities = window.MOLRoles.get(role);
  if (!capabilities?.web) return;

  const view = document.querySelector('[data-view="leader-messages"]');
  if (!view) return;

  const styles = document.createElement('link');
  styles.rel = 'stylesheet';
  styles.href = './leader-messages.css';
  document.head.append(styles);

  const recipients = [...document.querySelectorAll('#teamRows tr')]
    .filter((row) => row.dataset.status !== 'BRAK STARTU')
    .map((row) => ({ id: row.dataset.id, name: row.dataset.employee, status: row.dataset.status, process: row.dataset.process }));

  view.innerHTML = `
    <div class="page-title">
      <div><p class="mol-kicker">Komunikacja z zespołem</p><h1>Komunikaty</h1><small>Wyślij wiadomość do jednego, kilku lub wszystkich pracowników z otwartym dniem pracy.</small></div>
    </div>
    <div class="leader-message-layout">
      <section class="mol-card leader-message-composer">
        <div class="leader-message-head"><div><p class="mol-kicker">Nowy komunikat</p><h2>Odbiorcy i treść</h2></div><span class="mol-chip mol-chip--info">MANUAL</span></div>
        <label class="all-open-toggle"><input type="checkbox" data-message-all-open><span><b>Wszyscy aktualnie w pracy</b><small>Backend zamrozi listę odbiorców w chwili wysłania.</small></span></label>
        <div class="message-recipient-head"><div><b>Wybrani pracownicy</b><small data-message-count>Wybrano 1</small></div><div><button type="button" data-message-select-all>Zaznacz wszystkich</button><button type="button" data-message-clear>Wyczyść</button></div></div>
        <div class="message-recipient-grid" data-message-recipients>
          ${recipients.map((person, index) => `<label class="message-recipient"><input type="checkbox" value="${person.id}" ${index === 0 ? 'checked' : ''}><span><b>${person.name}</b><small>${person.id} · ${person.status} · ${person.process}</small></span></label>`).join('')}
        </div>
        <label class="message-content-label">Treść komunikatu
          <textarea data-message-content rows="6" maxlength="2000" placeholder="Napisz komunikat dla pracownika lub zespołu…"></textarea>
          <small><span data-message-length>0</span>/2000 znaków</small>
        </label>
        <label class="ack-toggle"><input type="checkbox" data-message-ack><span><b>Wymagaj potwierdzenia odbioru</b><small>Pracownik otrzyma przycisk „Potwierdzam odbiór”.</small></span></label>
        <div class="message-send-row"><span data-message-status class="mol-muted" aria-live="polite">Podgląd Etapu 10 — bez realnego wysyłania.</span><button class="mol-button mol-button--primary" type="button" data-message-send>Wyślij komunikat</button></div>
      </section>

      <aside class="leader-message-side">
        <section class="mol-card"><p class="mol-kicker">Zasady V2</p><h2>Zakres wysyłki</h2><ul><li>LEADER i ADMIN mogą wysyłać komunikaty.</li><li>Odbiorcą może być jeden, kilku albo wszyscy aktualnie OPEN.</li><li>WORKER nie może użyć endpointu wysyłającego.</li><li>Wiadomość może mieć do 2000 znaków.</li></ul></section>
        <section class="mol-card"><p class="mol-kicker">Dzisiaj</p><h2>Ostatnio wysłane</h2><div class="sent-message-list"><article><b>Sprawdź strefę odkładczą A3</b><small>3 odbiorców · wymagane ACK · 2/3 potwierdzone</small><time>08:36</time></article><article><b>Po przerwie przejdź na pakowanie.</b><small>1 odbiorca · bez ACK</small><time>07:54</time></article></div></section>
      </aside>
    </div>`;

  const allOpen = view.querySelector('[data-message-all-open]');
  const recipientInputs = [...view.querySelectorAll('[data-message-recipients] input')];
  const content = view.querySelector('[data-message-content]');
  const ack = view.querySelector('[data-message-ack]');
  const send = view.querySelector('[data-message-send]');
  const status = view.querySelector('[data-message-status]');

  const selectedIds = () => recipientInputs.filter((input) => input.checked).map((input) => input.value);
  const sync = () => {
    const count = selectedIds().length;
    view.querySelector('[data-message-count]').textContent = allOpen.checked ? 'Wszyscy aktualnie OPEN' : `Wybrano ${count}`;
    recipientInputs.forEach((input) => { input.disabled = allOpen.checked; });
    view.querySelector('[data-message-select-all]').disabled = allOpen.checked;
    view.querySelector('[data-message-clear]').disabled = allOpen.checked;
    send.disabled = !content.value.trim() || (!allOpen.checked && count === 0);
  };

  allOpen.addEventListener('change', sync);
  recipientInputs.forEach((input) => input.addEventListener('change', sync));
  content.addEventListener('input', () => {
    view.querySelector('[data-message-length]').textContent = String(content.value.length);
    sync();
  });
  view.querySelector('[data-message-select-all]').addEventListener('click', () => {
    recipientInputs.forEach((input) => { input.checked = true; });
    sync();
  });
  view.querySelector('[data-message-clear]').addEventListener('click', () => {
    recipientInputs.forEach((input) => { input.checked = false; });
    sync();
  });
  send.addEventListener('click', () => {
    const detail = {
      requestType: 'leader-message',
      recipientIds: allOpen.checked ? null : selectedIds(),
      allOpen: allOpen.checked,
      content: content.value.trim(),
      ackRequired: ack.checked,
      role
    };
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-leader-message', { detail }));
    status.textContent = allOpen.checked
      ? 'Podgląd: komunikat przygotowany dla wszystkich aktualnie OPEN.'
      : `Podgląd: komunikat przygotowany dla ${detail.recipientIds.length} odbiorców.`;
  });

  const employeeActions = document.querySelector('.employee-actions');
  if (employeeActions && !employeeActions.querySelector('[data-message-employee]')) {
    const quickButton = document.createElement('button');
    quickButton.type = 'button';
    quickButton.className = 'mol-button';
    quickButton.dataset.messageEmployee = 'true';
    quickButton.textContent = 'Komunikat';
    quickButton.addEventListener('click', () => {
      const selectedEmployeeId = document.getElementById('employeeId')?.textContent?.trim();
      allOpen.checked = false;
      recipientInputs.forEach((input) => { input.checked = input.value === selectedEmployeeId; });
      sync();
      document.querySelector('.sidebar [data-section="leader-messages"]')?.click();
      content.focus();
    });
    employeeActions.append(quickButton);
  }

  const loadScript = (src, onload) => {
    const script = document.createElement('script');
    script.src = src;
    if (onload) script.onload = onload;
    document.head.append(script);
  };
  if (!window.ESTYL_LOGO) {
    loadScript('../../logo.js', () => loadScript('../shared/brand.js'));
  } else {
    loadScript('../shared/brand.js');
  }
  ['./weighted-report.js', './worktime-completion.js', './leader-message-history.js', './spec-completion.js']
    .forEach((src) => loadScript(src));

  sync();
})();
