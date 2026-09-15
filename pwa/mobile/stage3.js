(() => {
  'use strict';

  const api = window.MOLApi;
  if (!api) return;

  const BUILD = '20260915.6';
  const shell = document.querySelector('.worker-shell');
  const processNav = document.querySelector('.bottom-nav [data-nav="process"]');
  const processPanel = document.querySelector('[data-panel="process"]');

  let session = null;
  let attendanceState = null;
  let processState = null;
  let busy = false;
  let ticker = null;

  const clock = (value) => value ? new Date(value).toLocaleTimeString('pl-PL', {
    timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit'
  }) : '—';

  const duration = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const elapsedSeconds = (start, stop = null) => {
    if (!start) return 0;
    const from = Date.parse(start);
    const to = stop ? Date.parse(stop) : Date.now();
    if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
    return Math.max(0, Math.floor((to - from) / 1000));
  };

  function statusBar() {
    let bar = document.querySelector('[data-live-integration-status]');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.dataset.liveIntegrationStatus = 'true';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.style.cssText = 'position:sticky;top:0;z-index:90;margin:0 auto 10px;max-width:560px;padding:9px 12px;border:1px solid rgba(18,200,255,.28);border-radius:10px;background:rgba(3,20,31,.96);font:600 12px/1.35 system-ui;color:#bfefff';
    shell?.prepend(bar);
    return bar;
  }

  function setStatus(text, state = 'info') {
    const bar = statusBar();
    bar.textContent = text;
    bar.style.color = state === 'error' ? '#ff9aa4' : state === 'ok' ? '#86f4c9' : '#bfefff';
    bar.style.borderColor = state === 'error' ? 'rgba(255,82,97,.65)' : state === 'ok' ? 'rgba(25,231,160,.55)' : 'rgba(18,200,255,.28)';
  }

  function overlay() {
    let node = document.querySelector('[data-action-overlay]');
    if (node) return node;
    node = document.createElement('div');
    node.className = 'action-overlay';
    node.dataset.actionOverlay = 'true';
    node.hidden = true;
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'assertive');
    node.innerHTML = '<div class="action-overlay__card"><span class="action-overlay__spinner" aria-hidden="true"></span><strong data-action-overlay-title>Trwa zapis</strong><small data-action-overlay-text>Nie zamykaj aplikacji.</small></div>';
    document.body.append(node);
    return node;
  }

  function showOverlay(title, text) {
    const node = overlay();
    node.querySelector('[data-action-overlay-title]').textContent = title;
    node.querySelector('[data-action-overlay-text]').textContent = text;
    node.hidden = false;
    document.body.classList.add('is-action-busy');
  }

  function hideOverlay() {
    const node = document.querySelector('[data-action-overlay]');
    if (node) node.hidden = true;
    document.body.classList.remove('is-action-busy');
  }

  function setIdentity() {
    const user = session?.user || {};
    const role = String(user.role || '').toUpperCase();
    const name = user.display_name || user.employee_id || 'Użytkownik';
    const h1 = document.querySelector('.worker-identity h1');
    const avatar = document.querySelector('.worker-identity .avatar');
    const chip = document.getElementById('mobileRoleChip');
    const label = document.getElementById('mobilePanelLabel');
    if (h1) h1.textContent = name;
    if (avatar) avatar.textContent = name.trim().charAt(0).toUpperCase() || 'M';
    if (chip) chip.textContent = role;
    if (label) label.textContent = `MOL App V3 · build ${BUILD}`;
  }

  function lockLaterStages() {
    document.querySelectorAll('.bottom-nav [data-nav="messages"],.bottom-nav [data-nav="profile"],.bottom-nav [data-nav="team"]').forEach((button) => {
      button.disabled = true;
      button.title = 'Funkcja jest aktywowana przez własny moduł V3.';
    });
  }

  function processName(code) {
    if (!code) return 'BRAK AKTYWNEGO PROCESU';
    const item = processState?.process_catalog?.find((row) => row.process_code === code);
    return item?.display_name || window.MOLProcesses?.byCode?.(code)?.name || code;
  }

  function workStateLabel(state) {
    if (state === 'OPEN') return 'W PRACY';
    if (state === 'CLOSED') return 'DZIEŃ ZAKOŃCZONY';
    return 'NIE ROZPOCZĘTO';
  }

  function renderProcessPanel() {
    if (!processPanel) return;
    const state = String(attendanceState?.attendance?.state || 'NOT_STARTED').toUpperCase();
    const active = processState?.active_process || null;
    const catalog = Array.isArray(processState?.process_catalog) ? processState.process_catalog : [];
    const sessions = Array.isArray(processState?.process_sessions) ? processState.process_sessions : [];
    const working = state === 'OPEN';
    const canStart = !busy && state === 'NOT_STARTED';
    const canStop = !busy && working;
    const canChange = !busy && working;
    const canEndProcess = !busy && working && !!active;
    const canResume = !busy && state === 'CLOSED';

    const cards = catalog.map((item) => {
      const current = active?.process_code === item.process_code;
      return `<button type="button" class="mol-button process-option${current ? ' mol-button--primary' : ''}" data-process-code="${item.process_code}" ${busy || !working || current ? 'disabled' : ''}><span><strong>${item.display_name}</strong><small>${current ? 'Aktywny teraz' : active ? 'Zmień na ten proces' : 'Rozpocznij proces'}</small></span></button>`;
    }).join('');
    const history = sessions.map((item) => {
      const seconds = elapsedSeconds(item.start_at, item.stop_at || null);
      return `<div class="mol-card process-history-row"><strong>${processName(item.process_code)}</strong><small>${clock(item.start_at)}–${item.stop_at ? clock(item.stop_at) : 'teraz'} · ${duration(seconds)}</small></div>`;
    }).join('');

    processPanel.classList.add('process-screen');
    processPanel.innerHTML = `
      <div class="process-screen-head"><div><p class="mol-kicker">Praca operacyjna</p><h2>Proces</h2><small>Tu sterujesz pracą w Moniti i bieżącym procesem.</small></div><span class="mol-chip ${working ? 'mol-chip--success' : 'mol-chip--info'}">${workStateLabel(state)}</span></div>
      <section class="mol-card process-screen-status">
        <div><small>Status pracy</small><strong>${workStateLabel(state)}</strong></div>
        <div><small>Aktywny proces</small><strong>${active ? processName(active.process_code) : 'Brak'}</strong></div>
        <div><small>Proces od</small><strong>${active ? clock(active.start_at) : '—'}</strong></div>
      </section>
      <div class="section-title process-actions-title"><h2>Akcje</h2><span>backend V3</span></div>
      <div class="action-grid process-actions" data-process-actions>
        <button type="button" class="mol-button mol-button--primary" data-process-action="attendance-start" ${canStart ? '' : 'disabled'}><span><strong>MONITI Rozpocznij pracę</strong><small>${state === 'NOT_STARTED' ? 'Rozpocznij dzisiejszy dzień' : state === 'OPEN' ? 'Praca już trwa' : 'Dzień został zakończony'}</small></span></button>
        <button type="button" class="mol-button mol-button--danger" data-process-action="attendance-stop" ${canStop ? '' : 'disabled'}><span><strong>MONITI Zakończ pracę</strong><small>${working ? 'Zakończ dzisiejszy dzień' : 'Dostępne podczas pracy'}</small></span></button>
        <button type="button" class="mol-button" data-process-action="change-process" ${canChange ? '' : 'disabled'}><span><strong>Zmień proces</strong><small>${active ? `Aktywny: ${processName(active.process_code)}` : working ? 'Wybierz proces poniżej' : 'Najpierw rozpocznij pracę'}</small></span></button>
        <button type="button" class="mol-button mol-button--danger" data-process-action="process-stop" ${canEndProcess ? '' : 'disabled'}><span><strong>Zakończ proces</strong><small>${active ? 'Zakończ aktywny proces bez kończenia pracy' : 'Brak aktywnego procesu'}</small></span></button>
        <button type="button" class="mol-button" data-process-action="change-hours" disabled><span><strong>Zmień godziny pracy</strong><small>Korekta godzin wymaga zatwierdzenia lidera w V3</small></span></button>
        <button type="button" class="mol-button" data-process-action="resume" ${canResume ? '' : 'disabled'}><span><strong>Wznów pracę</strong><small>${state === 'CLOSED' ? 'Cofnij dzisiejsze zakończenie pracy' : 'Dostępne po zakończeniu dnia'}</small></span></button>
      </div>
      <div class="section-title process-picker-title"><h2>Wybierz proces</h2><span>${working ? 'Zmiana zamyka poprzedni proces' : 'Najpierw rozpocznij pracę'}</span></div>
      <div class="action-grid process-picker" data-process-options>${cards || '<p class="mol-muted">Brak dostępnych procesów.</p>'}</div>
      ${history ? `<div class="process-history"><div class="section-title"><h2>Dzisiejsze procesy</h2><span>backend V3</span></div>${history}</div>` : ''}
    `;

    processPanel.querySelector('[data-process-action="attendance-start"]')?.addEventListener('click', () => runAttendance('START'));
    processPanel.querySelector('[data-process-action="attendance-stop"]')?.addEventListener('click', () => runAttendance('STOP'));
    processPanel.querySelector('[data-process-action="resume"]')?.addEventListener('click', () => runAttendance('RESUME'));
    processPanel.querySelector('[data-process-action="process-stop"]')?.addEventListener('click', () => runProcess('STOP'));
    processPanel.querySelector('[data-process-action="change-process"]')?.addEventListener('click', () => {
      processPanel.querySelector('[data-process-options]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    processPanel.querySelectorAll('[data-process-code]').forEach((button) => button.addEventListener('click', () => runProcess(active ? 'CHANGE' : 'START', button.dataset.processCode)));
  }

  function showProcessScreen(event) {
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    if (busy) return;
    renderProcessPanel();
    if (typeof window.MOLMobileShow === 'function') {
      window.MOLMobileShow('process');
      return;
    }
    shell.dataset.screen = 'process';
    document.querySelectorAll('[data-nav]').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === 'process'));
    document.querySelectorAll('.worker-hero,.work-status,.home-actions-block,.kpi-grid,.performance-block').forEach((node) => { node.hidden = true; });
    document.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel !== processPanel; });
    processPanel.hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function setButtonState() {
    if (processNav) {
      processNav.disabled = false;
      processNav.title = 'Praca i proces';
    }
    renderProcessPanel();
  }

  function tick() {
    const att = attendanceState?.attendance || {};
    const active = processState?.active_process || null;
    const presence = att.state === 'OPEN' ? elapsedSeconds(att.start_at) : elapsedSeconds(att.start_at, att.stop_at);
    let processSeconds = Number(processState?.process_seconds || 0);
    let noProcessSeconds = Number(processState?.no_process_seconds || 0);
    if (att.state === 'OPEN' && active?.start_at) {
      const live = elapsedSeconds(active.start_at);
      const snapshotLive = elapsedSeconds(active.start_at, processState?._snapshot_at || active.start_at);
      processSeconds += Math.max(0, live - snapshotLive);
      noProcessSeconds = Math.max(0, presence - processSeconds);
    } else if (att.state === 'OPEN') {
      noProcessSeconds = Math.max(0, presence - processSeconds);
    }
    const stats = document.querySelectorAll('.work-status .status-stats strong');
    const kpis = document.querySelectorAll('.kpi-grid article strong');
    if (stats[1]) stats[1].textContent = duration(presence);
    if (stats[2]) stats[2].textContent = active ? clock(active.start_at) : '—';
    if (kpis[0]) kpis[0].textContent = duration(presence);
    if (kpis[1]) kpis[1].textContent = duration(noProcessSeconds);
  }

  function render() {
    const att = attendanceState?.attendance || { state: 'NOT_STARTED', start_at: null, stop_at: null };
    const state = String(att.state || 'NOT_STARTED').toUpperCase();
    const active = processState?.active_process || null;
    const title = document.querySelector('.work-status h2');
    const chip = document.querySelector('.work-status .status-head .mol-chip');
    const stats = document.querySelectorAll('.work-status .status-stats strong');
    const kpis = document.querySelectorAll('.kpi-grid article strong');
    if (title) title.textContent = workStateLabel(state);
    if (chip) {
      chip.textContent = state === 'OPEN' ? 'MONITI · OPEN' : state === 'CLOSED' ? 'MONITI · CLOSED' : 'MONITI';
      chip.className = `mol-chip ${state === 'OPEN' ? 'mol-chip--success' : state === 'CLOSED' ? 'mol-chip--info' : 'mol-chip--warning'}`;
    }
    if (stats[0]) stats[0].textContent = clock(att.start_at);
    if (stats[2]) stats[2].textContent = active ? clock(active.start_at) : '—';
    if (kpis[2]) kpis[2].textContent = '—';
    const progress = document.querySelector('.kpi-grid .progress i');
    if (progress) progress.style.width = '0%';
    setButtonState();
    tick();
    if (ticker) clearInterval(ticker);
    ticker = state === 'OPEN' ? setInterval(tick, 1000) : null;
  }

  async function loadState() {
    setStatus('Sprawdzam czas pracy i aktywny proces…');
    const [attendance, process] = await Promise.all([
      api.read('mol-app-v3-worker-status'),
      api.read('mol-app-v3-process-status')
    ]);
    attendanceState = attendance || {};
    processState = { ...(process || {}), _snapshot_at: new Date().toISOString() };
    render();
    const state = String(attendanceState?.attendance?.state || 'NOT_STARTED').toUpperCase();
    if (state === 'OPEN' && processState.active_process) setStatus(`Praca trwa. Aktywny proces: ${processName(processState.active_process.process_code)}.`, 'ok');
    else if (state === 'OPEN') setStatus('Praca trwa. Wybierz proces; czas bez procesu jest liczony.', 'ok');
    else if (state === 'CLOSED') setStatus(`Dzień pracy zakończony o ${clock(attendanceState.attendance?.stop_at)}. Możesz cofnąć zakończenie przyciskiem Wznów pracę.`, 'ok');
    else setStatus('Brak rozpoczętego dnia. Pracę rozpoczniesz przyciskiem MONITI Rozpocznij pracę.', 'ok');
  }

  async function runAttendance(action) {
    if (busy) return;
    busy = true;
    setButtonState();
    const title = action === 'START' ? 'Zapisujemy START' : action === 'RESUME' ? 'Wznawiamy pracę' : 'Zapisujemy STOP';
    showOverlay(title, 'Czekamy na potwierdzenie w Moniti. Nie klikaj ponownie.');
    try {
      if (action === 'STOP' && processState?.active_process) {
        await api.write('mol-app-v3-process-stop', { request_id: api.requestId() });
      }
      const path = action === 'START'
        ? 'mol-app-v3-attendance-start'
        : action === 'RESUME'
          ? 'mol-app-v3-attendance-resume'
          : 'mol-app-v3-attendance-stop';
      await api.write(path, { request_id: api.requestId() });
      await loadState();
      window.MOLMobileShow?.('home');
    } catch (error) {
      setStatus(error?.message || 'Operacja nie została potwierdzona.', 'error');
      try { await loadState(); } catch { /* retain last confirmed state */ }
    } finally {
      busy = false;
      hideOverlay();
      setButtonState();
    }
  }

  async function runProcess(action, code = null) {
    if (busy) return;
    busy = true;
    setButtonState();
    showOverlay(action === 'STOP' ? 'Kończymy proces' : action === 'CHANGE' ? 'Zmieniamy proces' : 'Rozpoczynamy proces', 'Czekamy na potwierdzenie zapisu w backendzie V3.');
    try {
      const path = action === 'START' ? 'mol-app-v3-process-start' : action === 'CHANGE' ? 'mol-app-v3-process-change' : 'mol-app-v3-process-stop';
      await api.write(path, { request_id: api.requestId(), ...(code ? { process_code: code } : {}) });
      await loadState();
      window.dispatchEvent(new CustomEvent('mol-v3-process-changed'));
      window.MOLMobileShow?.('process');
    } catch (error) {
      setStatus(error?.message || 'Zmiana procesu nie została potwierdzona.', 'error');
      try { await loadState(); } catch { /* retain last confirmed state */ }
    } finally {
      busy = false;
      hideOverlay();
      setButtonState();
    }
  }

  processNav?.addEventListener('click', showProcessScreen, true);

  (async () => {
    try {
      lockLaterStages();
      session = await api.requireSession({ surface: 'mobile' });
      if (!session) return api.redirectLogin('session');
      setIdentity();
      if (processNav) processNav.removeAttribute('disabled');
      await loadState();
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) return api.redirectLogin('session');
      setStatus(error?.message || 'Nie udało się odczytać stanu aplikacji.', 'error');
      if (processNav) processNav.disabled = true;
    } finally {
      api.reveal?.();
    }
  })();
})();
