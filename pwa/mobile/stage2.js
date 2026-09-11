(() => {
  'use strict';

  const api = window.MOLApi;
  if (!api) return;

  const BUILD = '20260911.3';
  const shell = document.querySelector('.worker-shell');
  const startButton = document.querySelector('[data-action="start"]');
  const stopButton = document.querySelector('[data-action="stop"]');
  let session = null;
  let current = null;
  let busy = false;
  let ticker = null;

  const clock = (value) => value ? new Date(value).toLocaleTimeString('pl-PL', {
    timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit'
  }) : '—';

  const elapsed = (start, stop = null) => {
    if (!start) return '00:00:00';
    const from = Date.parse(start);
    const to = stop ? Date.parse(stop) : Date.now();
    if (!Number.isFinite(from) || !Number.isFinite(to)) return '00:00:00';
    const seconds = Math.max(0, Math.floor((to - from) / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
    if (label) label.textContent = `Czas pracy · V3 · build ${BUILD}`;
  }

  function lockNonStage2() {
    document.querySelectorAll('[data-action="process"],[data-action="change-process"],[data-action="process-stop"]').forEach((button) => {
      button.disabled = true;
      button.title = 'Funkcja nie jest częścią Etapu 2.';
    });
    document.querySelectorAll('.bottom-nav [data-nav]:not([data-nav="home"])').forEach((button) => {
      button.disabled = true;
      button.title = 'Funkcja zostanie podłączona w kolejnym etapie.';
    });
    const sourceLabels = document.querySelectorAll('.section-title span,.active-process small,.notice small');
    sourceLabels.forEach((node) => {
      if (/backend V2|Źródło: backend V2/i.test(node.textContent || '')) node.textContent = 'Nieaktywne w Etapie 2';
    });
  }

  function setButtonState(state) {
    if (startButton) {
      startButton.disabled = busy || state !== 'NOT_STARTED';
      const strong = startButton.querySelector('strong');
      const small = startButton.querySelector('small');
      if (strong) strong.textContent = 'MONITI Rozpocznij pracę';
      if (small) small.textContent = state === 'CLOSED' ? 'Dzisiejszy dzień jest już zakończony' : 'Rozpocznij dzisiejszy dzień';
    }
    if (stopButton) {
      stopButton.disabled = busy || state !== 'OPEN';
      const strong = stopButton.querySelector('strong');
      const small = stopButton.querySelector('small');
      if (strong) strong.textContent = 'MONITI Zakończ pracę';
      if (small) small.textContent = state === 'OPEN' ? 'Zakończ dzisiejszy dzień' : 'Dostępne podczas pracy';
    }
  }

  function tick() {
    const attendance = current?.attendance || {};
    const value = attendance.state === 'OPEN'
      ? elapsed(attendance.start_at)
      : attendance.state === 'CLOSED'
        ? elapsed(attendance.start_at, attendance.stop_at)
        : '00:00:00';
    const stats = document.querySelectorAll('.work-status .status-stats strong');
    if (stats[1]) stats[1].textContent = value;
    const kpis = document.querySelectorAll('.kpi-grid article strong');
    if (kpis[0]) kpis[0].textContent = value;
  }

  function render(data) {
    current = data || {};
    const attendance = current.attendance || { state: 'NOT_STARTED', start_at: null, stop_at: null };
    const state = String(attendance.state || 'NOT_STARTED').toUpperCase();
    const title = document.querySelector('.work-status h2');
    const chip = document.querySelector('.work-status .status-head .mol-chip');
    const stats = document.querySelectorAll('.work-status .status-stats strong');
    const kpis = document.querySelectorAll('.kpi-grid article strong');

    if (title) title.textContent = state === 'OPEN' ? 'W PRACY' : state === 'CLOSED' ? 'DZIEŃ ZAKOŃCZONY' : 'NIE ROZPOCZĘTO';
    if (chip) {
      chip.textContent = state === 'OPEN' ? 'MONITI · OPEN' : state === 'CLOSED' ? 'MONITI · CLOSED' : 'MONITI';
      chip.className = `mol-chip ${state === 'OPEN' ? 'mol-chip--success' : state === 'CLOSED' ? 'mol-chip--info' : 'mol-chip--warning'}`;
    }
    if (stats[0]) stats[0].textContent = clock(attendance.start_at);
    if (stats[2]) stats[2].textContent = '—';
    if (kpis[1]) kpis[1].textContent = '—';
    if (kpis[2]) kpis[2].textContent = '—';
    const progress = document.querySelector('.kpi-grid .progress i');
    if (progress) progress.style.width = '0%';

    const activeTitle = document.querySelector('.active-process h2');
    if (activeTitle) activeTitle.textContent = 'ETAP 2 — NIEAKTYWNE';
    setButtonState(state);
    tick();
    if (ticker) clearInterval(ticker);
    ticker = state === 'OPEN' ? setInterval(tick, 1000) : null;

    if (state === 'OPEN') setStatus(`Praca rozpoczęta w Moniti o ${clock(attendance.start_at)}.`, 'ok');
    else if (state === 'CLOSED') setStatus(`Dzień pracy zakończony o ${clock(attendance.stop_at)}.`, 'ok');
    else setStatus('Brak rozpoczętego dnia. Możesz rozpocząć pracę.', 'ok');
  }

  async function loadStatus() {
    setStatus('Sprawdzam dzisiejszy stan pracy…');
    const data = await api.read('mol-app-v3-worker-status');
    render(data);
    return data;
  }

  async function runAction(action) {
    if (busy) return;
    busy = true;
    setButtonState(String(current?.attendance?.state || 'NOT_STARTED').toUpperCase());
    setStatus(action === 'START' ? 'Czekam na potwierdzenie START z Moniti…' : 'Czekam na potwierdzenie STOP z Moniti…');
    try {
      const data = await api.write(action === 'START' ? 'mol-app-v3-attendance-start' : 'mol-app-v3-attendance-stop', {
        request_id: api.requestId()
      });
      render(data);
    } catch (error) {
      setStatus(error?.message || 'Operacja nie została potwierdzona.', 'error');
      try { await loadStatus(); } catch { /* zachowaj ostatni potwierdzony stan */ }
    } finally {
      busy = false;
      setButtonState(String(current?.attendance?.state || 'NOT_STARTED').toUpperCase());
    }
  }

  startButton?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!startButton.disabled) runAction('START');
  }, true);

  stopButton?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!stopButton.disabled) runAction('STOP');
  }, true);

  (async () => {
    try {
      lockNonStage2();
      session = await api.requireSession({ surface: 'mobile' });
      if (!session) return api.redirectLogin('session');
      setIdentity();
      await loadStatus();
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) return api.redirectLogin('session');
      setStatus(error?.message || 'Nie udało się odczytać stanu czasu pracy.', 'error');
      setButtonState('UNKNOWN');
    } finally {
      api.reveal?.();
    }
  })();
})();
