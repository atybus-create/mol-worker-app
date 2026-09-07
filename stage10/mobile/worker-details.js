(() => {
  const styles = document.createElement('link');
  styles.rel = 'stylesheet';
  styles.href = './worker-details.css';
  document.head.append(styles);

  const warehouseTools = window.MOLWarehouseTools?.items || [];
  const shell = document.querySelector('.worker-shell');
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || shell?.dataset.demoRole || 'WORKER');
  const allowedProcesses = window.MOLProcesses.allowedFor(role);
  const process = document.querySelector('[data-panel="process"]');
  const currentProcess = window.MOLProcesses.byCode('PAKOWANIE');
  const warehouseCards = warehouseTools.length
    ? warehouseTools.map((tool) => `
      <a class="mol-card warehouse-tool-card" href="${tool.url}" target="_blank" rel="noopener noreferrer" data-warehouse-tool="${tool.id}">
        <span class="warehouse-tool-icon${tool.id === 'batchReader' ? ' is-barcode' : ''}" aria-hidden="true">${tool.icon}</span>
        <span class="warehouse-tool-copy"><strong>${tool.title}</strong><small>${tool.description}</small></span>
        <span class="warehouse-tool-arrow" aria-hidden="true">→</span>
      </a>`).join('')
    : '<article class="mol-card warehouse-tool-card"><span class="warehouse-tool-copy"><strong>Narzędzia chwilowo niedostępne</strong><small>Proces MAGAZYN nadal może działać. Narzędzia są wyłącznie dodatkiem.</small></span></article>';

  process.innerHTML = `
    <div class="worker-detail-head"><div><p class="mol-kicker">Praca operacyjna</p><h2>Proces</h2></div><span class="mol-chip mol-chip--success">W PRACY</span></div>
    <section class="mol-card process-current"><small>Aktualny proces</small><strong data-current-process-name>${currentProcess.name}</strong><small>Kod: <span data-current-process-code>${currentProcess.code}</span></small><span class="mol-chip mol-chip--success" data-process-active-state>AKTYWNY</span></section>
    <div class="section-title"><h2>Wybierz proces</h2><span>Kliknięcie od razu aktywuje proces</span></div>
    <div class="process-grid">
      ${allowedProcesses.map((item) => `<button class="mol-button process-option${item.code === currentProcess.code ? ' is-active' : ''}" type="button" data-process-code="${item.code}"><strong>${item.name}</strong><small>${item.code}${item.normUnitsPerHour ? ` · norma ${item.normUnitsPerHour}/h` : ''}</small></button>`).join('')}
    </div>
    <section class="warehouse-tools" data-warehouse-tools hidden aria-labelledby="warehouseToolsTitle">
      <div class="warehouse-tools-head">
        <div><p class="mol-kicker">Proces MAGAZYN jest aktywny</p><h3 id="warehouseToolsTitle">Opcjonalne narzędzia magazynowe</h3></div>
        <span class="mol-chip mol-chip--info">2 narzędzia</span>
      </div>
      <p class="warehouse-tools-note"><strong>MAGAZYN został aktywowany już przez kliknięcie kafla procesu.</strong> Poniższe narzędzia są dodatkowe — pracownik może z nich skorzystać albo kontynuować pracę bez otwierania któregokolwiek.</p>
      <div class="warehouse-tool-grid">${warehouseCards}</div>
    </section>
    <button class="mol-button mol-button--danger manager-create-user" type="button" data-process-logout>Zakończ tylko proces</button>`;

  const currentName = process.querySelector('[data-current-process-name]');
  const currentCode = process.querySelector('[data-current-process-code]');
  const activeState = process.querySelector('[data-process-active-state]');
  const warehouseSection = process.querySelector('[data-warehouse-tools]');

  process.dataset.selectedProcess = currentProcess.code;

  const applyProcessActivation = (selected) => {
    if (!selected) return;
    currentName.textContent = selected.name;
    currentCode.textContent = selected.code;
    activeState.textContent = 'AKTYWNY';
    activeState.className = 'mol-chip mol-chip--success';
    warehouseSection.hidden = selected.code !== 'MAGAZYN';
    process.dataset.selectedProcess = selected.code;
  };

  const messages = document.querySelector('[data-panel="messages"]');
  messages.innerHTML = `
    <div class="worker-detail-head"><div><p class="mol-kicker">Komunikacja</p><h2>Komunikaty</h2></div><span class="mol-chip mol-chip--info">2 nowe</span></div>
    <div class="message-list">
      <button class="mol-card message-card" type="button" data-message-title="Sprawdź strefę odkładczą A3"><i></i><span><strong>Nowy komunikat od lidera</strong><small>Proszę o sprawdzenie strefy odkładczej A3.</small></span><time>28 min</time></button>
      <button class="mol-card message-card" type="button" data-message-title="Przerwa bez procesu"><i></i><span><strong>Brak aktywnego procesu</strong><small>Komunikat przykładowy — próg automatycznego alertu nie jest w Etapie 10 aktywowany.</small></span><time>13 min</time></button>
      <button class="mol-card message-card is-read" type="button" data-message-title="Informacja zmianowa"><i></i><span><strong>Informacja zmianowa</strong><small>Przyjęto do wiadomości.</small></span><time>wczoraj</time></button>
    </div>
    <section class="mol-card message-detail" data-message-detail hidden><h3>Komunikat</h3><p>Wybierz wiadomość z listy.</p><button class="mol-button mol-button--primary" type="button" data-message-ack>Potwierdzam odbiór</button></section>`;

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
  let openedMessage = null;
  messages.querySelectorAll('[data-message-title]').forEach((button) => button.addEventListener('click', () => {
    openedMessage = button;
    button.classList.add('is-read');
    detail.hidden = false;
    detail.querySelector('h3').textContent = button.dataset.messageTitle;
    detail.querySelector('p').textContent = button.querySelector('small').textContent;
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-message-shown', { detail: { title: button.dataset.messageTitle } }));
  }));

  detail.querySelector('[data-message-ack]')?.addEventListener('click', () => {
    if (!openedMessage) return;
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-message-ack', { detail: { title: openedMessage.dataset.messageTitle } }));
    detail.querySelector('[data-message-ack]').textContent = 'Odbiór potwierdzony';
  });

  process.querySelectorAll('.process-option').forEach((button) => button.addEventListener('click', () => {
    const selected = window.MOLProcesses.byCode(button.dataset.processCode);
    if (!selected) return;

    const previousCode = process.dataset.selectedProcess || null;
    if (previousCode === selected.code) {
      applyProcessActivation(selected);
      return;
    }

    process.querySelectorAll('.process-option').forEach((candidate) => candidate.classList.toggle('is-active', candidate === button));
    applyProcessActivation(selected);

    const action = previousCode ? 'process-change' : 'process-start';
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-process-activate', {
      detail: { action, previousCode, code: selected.code, name: selected.name, role }
    }));

    if (selected.code === 'MAGAZYN') {
      requestAnimationFrame(() => warehouseSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }));

  process.querySelectorAll('[data-warehouse-tool]').forEach((link) => link.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-warehouse-tool-open', {
      detail: { tool: link.dataset.warehouseTool, activeProcess: process.dataset.selectedProcess, role }
    }));
  }));

  process.querySelector('[data-process-logout]')?.addEventListener('click', () => {
    const previousCode = process.dataset.selectedProcess || null;
    process.dataset.selectedProcess = '';
    currentName.textContent = 'Brak aktywnego procesu';
    currentCode.textContent = '—';
    activeState.textContent = 'BRAK PROCESU';
    activeState.className = 'mol-chip mol-chip--warning';
    warehouseSection.hidden = true;
    process.querySelectorAll('.process-option').forEach((candidate) => candidate.classList.remove('is-active'));
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-process-logout', { detail: { previousCode, role } }));
  });

  profile.querySelector('[data-demo-correction]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('mol:stage10-demo-correction'));
  });
})();
