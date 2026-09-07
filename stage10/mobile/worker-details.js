(() => {
  const styles = document.createElement('link');
  styles.rel = 'stylesheet';
  styles.href = './worker-details.css';
  document.head.append(styles);

  const shell = document.querySelector('.worker-shell');
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || shell?.dataset.demoRole || 'WORKER');
  const allowedProcesses = window.MOLProcesses.allowedFor(role);
  const process = document.querySelector('[data-panel="process"]');
  const currentProcess = window.MOLProcesses.byCode('PAKOWANIE');
  process.innerHTML = `
    <div class="worker-detail-head"><div><p class="mol-kicker">Praca operacyjna</p><h2>Proces</h2></div><span class="mol-chip mol-chip--success">W PRACY</span></div>
    <section class="mol-card process-current"><small>Aktualny proces</small><strong>${currentProcess.name}</strong><small>Kod: ${currentProcess.code}</small></section>
    <div class="section-title"><h2>Wybierz proces</h2><span>${allowedProcesses.length} dostępnych dla ${role}</span></div>
    <div class="process-grid">
      ${allowedProcesses.map((item) => `<button class="mol-button process-option${item.code === currentProcess.code ? ' is-active' : ''}" type="button" data-process-code="${item.code}"><strong>${item.name}</strong><small>${item.code}${item.normUnitsPerHour ? ` · norma ${item.normUnitsPerHour}/h` : ''}</small></button>`).join('')}
    </div>
    <button class="mol-button mol-button--danger manager-create-user" type="button">Zakończ tylko proces</button>`;

  const messages = document.querySelector('[data-panel="messages"]');
  messages.innerHTML = `
    <div class="worker-detail-head"><div><p class="mol-kicker">Komunikacja</p><h2>Komunikaty</h2></div><span class="mol-chip mol-chip--info">2 nowe</span></div>
    <div class="message-list">
      <button class="mol-card message-card" type="button" data-message-title="Sprawdź strefę odkładczą A3"><i></i><span><strong>Nowy komunikat od lidera</strong><small>Proszę o sprawdzenie strefy odkładczej A3.</small></span><time>28 min</time></button>
      <button class="mol-card message-card" type="button" data-message-title="Przerwa bez procesu"><i></i><span><strong>Przerwa bez procesu &gt; 5 min</strong><small>Brak aktywności od 08:47.</small></span><time>13 min</time></button>
      <button class="mol-card message-card is-read" type="button" data-message-title="Informacja zmianowa"><i></i><span><strong>Informacja zmianowa</strong><small>Przyjęto do wiadomości.</small></span><time>wczoraj</time></button>
    </div>
    <section class="mol-card message-detail" data-message-detail hidden><h3>Komunikat</h3><p>Wybierz wiadomość z listy.</p><button class="mol-button mol-button--primary" type="button">Potwierdzam odbiór</button></section>`;

  const profile = document.querySelector('[data-panel="profile"]');
  profile.innerHTML = `
    <div class="worker-detail-head"><div><p class="mol-kicker">Konto i historia</p><h2>Profil</h2></div><span class="mol-chip mol-chip--success">Sesja aktywna</span></div>
    <div class="profile-grid">
      <section class="mol-card profile-card"><h3>Stan połączenia</h3><div class="connection-state"><span>Backend V2</span><b>ONLINE</b></div><div class="profile-row"><span>Ostatnia synchronizacja</span><strong>teraz</strong></div></section>
      <section class="mol-card profile-card"><h3>Dzisiejsza historia</h3><div class="profile-row"><span>START pracy</span><strong>06:12</strong></div><div class="profile-row"><span>Pakowanie</span><strong>06:15–08:21</strong></div><div class="profile-row"><span>Przerwa</span><strong>08:21–08:34</strong></div><div class="profile-row"><span>Pakowanie</span><strong>od 08:55</strong></div></section>
      <section class="mol-card profile-card"><h3>Korekta czasu pracy</h3><form class="correction-form" data-demo-correction><label>START<input type="datetime-local" value="2026-09-07T06:12"></label><label>STOP<input type="datetime-local"></label><label>Powód<textarea rows="3" minlength="3" maxlength="500" placeholder="Opisz powód korekty"></textarea></label><button class="mol-button" type="submit">Wyślij korektę</button></form></section>
      <button class="mol-button mol-button--danger" type="button">Wyloguj</button>
    </div>`;

  const detail = messages.querySelector('[data-message-detail]');
  messages.querySelectorAll('[data-message-title]').forEach((button) => button.addEventListener('click', () => {
    button.classList.add('is-read');
    detail.hidden = false;
    detail.querySelector('h3').textContent = button.dataset.messageTitle;
    detail.querySelector('p').textContent = button.querySelector('small').textContent;
  }));

  process.querySelectorAll('.process-option').forEach((button) => button.addEventListener('click', () => {
    process.querySelectorAll('.process-option').forEach((candidate) => candidate.classList.toggle('is-active', candidate === button));
    const selected = window.MOLProcesses.byCode(button.dataset.processCode);
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-process-select', { detail: { code: selected.code, name: selected.name, role } }));
  }));

  profile.querySelector('[data-demo-correction]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-correction'));
  });
})();
