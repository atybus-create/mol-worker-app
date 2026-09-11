(() => {
  'use strict';

  const api = window.MOLApi;
  if (!api) return;

  const BUILD = '20260911.6';
  const shell = document.querySelector('.worker-shell');
  const startButton = document.querySelector('[data-action="start"]');
  const stopButton = document.querySelector('[data-action="stop"]');
  const processButton = document.querySelector('[data-action="process"]');
  const processStopButton = document.querySelector('[data-action="process-stop"]');
  const changeProcessButton = document.querySelector('[data-action="change-process"]');
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
    if (label) label.textContent = `Czas pracy + proces · V3 · build ${BUILD}`;
  }

  function lockLaterStages() {
    document.querySelectorAll('.bottom-nav [data-nav="messages"],.bottom-nav [data-nav="profile"],.bottom-nav [data-nav="team"]').forEach((button) => {
      button.disabled = true;
      button.title = 'Funkcja zostanie podłączona w kolejnym etapie.';
    });
    document.querySelectorAll('[data-nav="messages"]').forEach((button) => {
      button.disabled = true;
      button.title = 'Komunikaty nie są częścią Etapu 3.';
    });
  }

  function processName(code) {
    if (!code) return 'BRAK AKTYWNEGO PROCESU';
    const item = processState?.process_catalog?.find((row) => row.process_code === code);
    return item?.display_name || window.MOLProcesses?.byCode?.(code)?.name || code;
  }

  function renderProcessPanel() {
    if (!processPanel) return;
    const state = String(attendanceState?.attendance?.state || 'NOT_STARTED').toUpperCase();
    const active = processState?.active_process || null;
    const catalog = Array.isArray(processState?.process_catalog) ? processState.process_catalog : [];
    const sessions = Array.isArray(processState?.process_sessions) ? processState.process_sessions : [];
    const disabled = busy || state !== 'OPEN';
    const cards = catalog.map((item) => {
      const current = active?.process_code === item.process_code;
      return `<button type="button" class="mol-button process-option${current ? ' mol-button--primary' : ''}" data-process-code="${item.process_code}" ${disabled || current ? 'disabled' : ''}><span><strong>${item.display_name}</strong><small>${current ? 'Aktywny teraz' : active ? 'Zmień na ten proces' : 'Rozpocznij proces'}</small></span></button>`;
    }).join('');
    const history = sessions.map((item) => {
      const seconds = elapsedSeconds(item.start_at, item.stop_at || null);
      return `<div class="mol-card" style="padding:10px 12px;margin-top:8px"><strong>${processName(item.process_code)}</strong><small style="display:block;margin-top:4px">${clock(item.start_at)}–${item.stop_at ? clock(item.stop_at) : 'teraz'} · ${duration(seconds)}</small></div>`;
    }).join('');
    processPanel.innerHTML = `<p class="mol-kicker">ETAP 3</p><h2>Proces pracy</h2><p>${state === 'OPEN' ? 'Wybierz wykonywany proces. Zmiana zamyka poprzedni proces i od razu rozpoczyna nowy.' : 'Proces można wybrać dopiero po rozpoczęciu dnia pracy.'}</p><div class="action-grid" data-process-options>${cards || '<p>Brak dostępnych procesów.</p>'}</div>${active ? '<button type="button" class="mol-button mol-button--danger" data-panel-process-stop style="width:100%;margin-top:14px">Zakończ aktywny proces</button>' : ''}${history ? `<div style="margin-top:20px"><div class="section-title"><h2>Dzisiejsze procesy</h2><span>odzyskane z backendu V3</span></div>${history}</div>` : ''}`;
    processPanel.querySelectorAll('[data-process-code]').forEach((button) => button.addEventListener('click', () => runProcess(active ? 'CHANGE' : 'START', button.dataset.processCode)));
    processPanel.querySelector('[data-panel-process-stop]')?.addEventListener('click', () => runProcess('STOP'));
  }

  function showProcessScreen(event) {
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    const state = String(attendanceState?.attendance?.state || 'NOT_STARTED').toUpperCase();
    if (busy) return;
    if (state !== 'OPEN') {
      setStatus('Najpierw rozpocznij pracę. Dopiero potem możesz wybrać proces.', 'error');
      return;
    }
    if (!processPanel) {
      setStatus('Nie udało się otworzyć listy procesów.', 'error');
      return;
    }

    renderProcessPanel();
    if (typeof window.MOLMobileShow === 'function') {
      window.MOLMobileShow('process');
      return;
    }

    shell.dataset.screen = 'process';
    document.querySelectorAll('[data-nav]').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === 'process'));
    document.querySelectorAll('.worker-hero,.work-status,.kpi-grid,.section-block,.active-process').forEach((node) => { node.hidden = true; });
    document.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel !== processPanel; });
    processPanel.hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function setButtonState() {
    const state = String(attendanceState?.attendance?.state || 'NOT_STARTED').toUpperCase();
    const active = processState?.active_process || null;
    if (startButton) startButton.disabled = busy || state !== 'NOT_STARTED';
    if (stopButton) stopButton.disabled = busy || state !== 'OPEN';
    if (processButton) {
      processButton.disabled = busy || state !== 'OPEN';
      const strong = processButton.querySelector('strong');
      const small = processButton.querySelector('small');
      if (strong) strong.textContent = active ? 'Zmień proces' : 'Proces';
      if (small) small.textContent = state !== 'OPEN' ? 'Najpierw rozpocznij pracę' : active ? `Aktywny: ${processName(active.process_code)}` : 'Wybierz wykonywany proces';
    }
    if (changeProcessButton) changeProcessButton.disabled = busy || state !== 'OPEN';
    if (processStopButton) processStopButton.disabled = busy || state !== 'OPEN' || !active;
    if (processNav) processNav.disabled = busy || state !== 'OPEN';
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

    const processStart = document.querySelector('[data-active-process-start]');
    const processTimer = document.querySelector('[data-active-process-timer]');
    const noProcess = document.querySelector('[data-active-no-process]');
    if (processStart) processStart.textContent = active ? clock(active.start_at) : '—';
    if (processTimer) processTimer.textContent = active ? duration(elapsedSeconds(active.start_at)) : '—';
    if (noProcess) noProcess.textContent = duration(noProcessSeconds);
  }

  function render() {
    const att = attendanceState?.attendance || { state: 'NOT_STARTED', start_at: null, stop_at: null };
    const state = String(att.state || 'NOT_STARTED').toUpperCase();
    const active = processState?.active_process || null;
    const title = document.querySelector('.work-status h2');
    const chip = document.querySelector('.work-status .status-head .mol-chip');
    const stats = document.querySelectorAll('.work-status .status-stats strong');
    const kpis = document.querySelectorAll('.kpi-grid article strong');
    if (title) title.textContent = state === 'OPEN' ? 'W PRACY' : state === 'CLOSED' ? 'DZIEŃ ZAKOŃCZONY' : 'NIE ROZPOCZĘTO';
    if (chip) {
      chip.textContent = state === 'OPEN' ? 'MONITI · OPEN' : state === 'CLOSED' ? 'MONITI · CLOSED' : 'MONITI';
      chip.className = `mol-chip ${state === 'OPEN' ? 'mol-chip--success' : state === 'CLOSED' ? 'mol-chip--info' : 'mol-chip--warning'}`;
    }
    if (stats[0]) stats[0].textContent = clock(att.start_at);
    if (kpis[2]) kpis[2].textContent = '—';
    const progress = document.querySelector('.kpi-grid .progress i');
    if (progress) progress.style.width = '0%';

    const activeTitle = document.querySelector('.active-process h2');
    const activeSmall = document.querySelector('.active-process small');
    if (activeTitle) activeTitle.textContent = processName(active?.process_code);
    if (activeSmall) activeSmall.textContent = active ? `Od ${clock(active.start_at)} · backend V3` : state === 'OPEN' ? 'Czas bez procesu jest liczony od rozpoczęcia pracy.' : 'Brak aktywnego procesu.';

    const sectionLabel = document.querySelector('.section-title span');
    if (sectionLabel && /Nieaktywne w Etapie 2/i.test(sectionLabel.textContent || '')) sectionLabel.textContent = 'Nieaktywne w Etapie 3';

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
    else if (state === 'CLOSED') setStatus(`Dzień pracy zakończony o ${clock(attendanceState.attendance?.stop_at)}.`, 'ok');
    else setStatus('Brak rozpoczętego dnia. Możesz rozpocząć pracę.', 'ok');
  }

  async function runAttendance(action) {
    if (busy) return;
    busy = true;
    setButtonState();
    showOverlay(action === 'START' ? 'Zapisujemy START' : 'Zapisujemy STOP', 'Czekamy na potwierdzenie w Moniti. Nie klikaj ponownie.');
    try {
      if (action === 'STOP' && processState?.active_process) {
        await api.write('mol-app-v3-process-stop', { request_id: api.requestId() });
      }
      await api.write(action === 'START' ? 'mol-app-v3-attendance-start' : 'mol-app-v3-attendance-stop', { request_id: api.requestId() });
      await loadState();
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
      window.MOLMobileShow?.('home');
    } catch (error) {
      setStatus(error?.message || 'Zmiana procesu nie została potwierdzona.', 'error');
      try { await loadState(); } catch { /* retain last confirmed state */ }
    } finally {
      busy = false;
      hideOverlay();
      setButtonState();
    }
  }

  startButton?.addEventListener('click', (event) => { event.preventDefault(); if (!startButton.disabled) runAttendance('START'); }, true);
  stopButton?.addEventListener('click', (event) => { event.preventDefault(); if (!stopButton.disabled) runAttendance('STOP'); }, true);
  processButton?.addEventListener('click', showProcessScreen, true);
  changeProcessButton?.addEventListener('click', showProcessScreen, true);
  processNav?.addEventListener('click', showProcessScreen, true);
  processStopButton?.addEventListener('click', (event) => { event.preventDefault(); if (!processStopButton.disabled) runProcess('STOP'); }, true);

  (async () => {
    try {
      lockLaterStages();
      session = await api.requireSession({ surface: 'mobile' });
      if (!session) return api.redirectLogin('session');
      setIdentity();
      await loadState();
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) return api.redirectLogin('session');
      setStatus(error?.message || 'Nie udało się odczytać stanu aplikacji.', 'error');
      if (startButton) startButton.disabled = true;
      if (stopButton) stopButton.disabled = true;
      if (processButton) processButton.disabled = true;
    } finally {
      api.reveal?.();
    }
  })();
})();