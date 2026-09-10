(() => {
  'use strict';

  const api = window.MOLApi;
  if (!api) return;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = async (selector, timeout = 6000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const node = document.querySelector(selector);
      if (node) return node;
      await sleep(30);
    }
    return null;
  };
  const duration = (seconds) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  };
  const clock = (value) => value ? new Date(value).toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' }) : '—';
  const date = (value) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('pl-PL') : '—';
  const percent = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 10) / 10}%` : '—';
  const number = (value, digits = 0) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('pl-PL', { maximumFractionDigits: digits }) : '0';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const monthStart = () => `${today().slice(0, 7)}-01`;
  const processName = (code) => window.MOLProcesses?.byCode(code)?.name || code || 'Brak procesu';
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

  let session = null;
  let role = '';
  let workerStatus = null;
  let teamData = null;
  let initialised = false;

  function ensureStatusBar() {
    let bar = document.querySelector('[data-live-integration-status]');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.dataset.liveIntegrationStatus = 'true';
    bar.style.cssText = 'position:sticky;top:0;z-index:80;margin:0 auto 10px;max-width:560px;padding:9px 12px;border:1px solid rgba(18,200,255,.28);border-radius:10px;background:rgba(3,20,31,.96);color:#bfefff;font:600 12px/1.35 system-ui';
    const shell = document.querySelector('.worker-shell');
    shell?.prepend(bar);
    return bar;
  }

  function setStatus(text, state = 'info') {
    const bar = ensureStatusBar();
    bar.textContent = text;
    bar.style.borderColor = state === 'error' ? 'rgba(255,82,97,.65)' : state === 'ok' ? 'rgba(25,231,160,.55)' : 'rgba(18,200,255,.28)';
    bar.style.color = state === 'error' ? '#ff9aa4' : state === 'ok' ? '#86f4c9' : '#bfefff';
  }

  function removeEstylLogo() {
    document.querySelectorAll('.estyl-brand-logo').forEach((node) => node.remove());
    document.querySelectorAll('.brand-mark').forEach((node) => { node.replaceChildren(); node.textContent = '◆'; });
  }

  function updateIdentity() {
    const user = session?.user || {};
    const name = user.display_name || user.employee_id || 'Użytkownik';
    const h1 = document.querySelector('.worker-identity h1');
    const avatar = document.querySelector('.worker-identity .avatar');
    const roleChip = document.getElementById('mobileRoleChip');
    const panelLabel = document.getElementById('mobilePanelLabel');
    if (h1) h1.textContent = name;
    if (avatar) avatar.textContent = name.trim().charAt(0).toUpperCase() || 'M';
    if (roleChip) { roleChip.textContent = role; roleChip.className = `mol-chip role-chip ${role === 'ADMIN' ? 'mol-chip--warning' : 'mol-chip--info'}`; }
    if (panelLabel) panelLabel.textContent = role === 'WORKER' ? 'Panel pracownika' : 'Panel mobilny · tryb roli';
  }

  function setNorm(drawer, norm, periodLabel) {
    if (!drawer) return;
    const summary = drawer.querySelector('summary');
    const summaryValue = summary?.querySelector('b');
    const summaryDate = summary?.querySelector('small');
    if (summaryValue) summaryValue.textContent = percent(norm?.combined_percent);
    if (summaryDate && periodLabel) summaryDate.textContent = periodLabel;
    const blocks = drawer.querySelectorAll('.performance-breakdown');
    const writeBlock = (block, values) => {
      if (!block) return;
      const nodes = block.querySelectorAll('.performance-metrics span b');
      values.forEach((value, index) => { if (nodes[index]) nodes[index].textContent = value; });
    };
    writeBlock(blocks[0], [number(norm?.total_pak), number(norm?.eligible_pak), number(norm?.outside_pak), duration(norm?.pak_seconds), percent(norm?.pak_percent)]);
    writeBlock(blocks[1], [number(norm?.total_pick), number(norm?.eligible_pick), number(norm?.outside_pick), duration(norm?.pick_seconds), percent(norm?.pick_percent)]);
    writeBlock(blocks[2], [number(norm?.total_combined_units, 1), number(norm?.eligible_combined_units, 1), number(norm?.outside_combined_units, 1), duration(norm?.combined_seconds), percent(norm?.combined_percent)]);
  }

  async function renderProcessPanel(data) {
    const panel = await waitFor('[data-panel="process"]');
    if (!panel) return;
    const active = data?.active_process || null;
    const name = panel.querySelector('[data-current-process-name]');
    const code = panel.querySelector('[data-current-process-code]');
    const state = panel.querySelector('[data-process-active-state]');
    const warehouse = panel.querySelector('[data-warehouse-tools]');
    panel.dataset.selectedProcess = active?.process_code || '';
    if (name) name.textContent = active ? processName(active.process_code) : 'Brak aktywnego procesu';
    if (code) code.textContent = active?.process_code || '—';
    if (state) {
      state.textContent = active ? 'AKTYWNY' : 'BRAK PROCESU';
      state.className = `mol-chip ${active ? 'mol-chip--success' : 'mol-chip--warning'}`;
    }
    if (warehouse) warehouse.hidden = active?.process_code !== 'MAGAZYN';
    panel.querySelectorAll('.process-option').forEach((button) => button.classList.toggle('is-active', button.dataset.processCode === active?.process_code));
  }

  async function renderProfile(data) {
    const profile = await waitFor('[data-panel="profile"] .profile-grid');
    if (!profile) return;
    const cards = profile.querySelectorAll('.profile-card');
    if (cards[0]) {
      const state = cards[0].querySelector('.connection-state b');
      const sync = cards[0].querySelector('.profile-row strong');
      if (state) state.textContent = 'ONLINE';
      if (sync) sync.textContent = 'teraz';
    }
    if (cards[1]) {
      const sessions = Array.isArray(data?.process_sessions) ? data.process_sessions : [];
      cards[1].innerHTML = `<h3>Dzisiejsza historia</h3><div class="profile-row"><span>START pracy</span><strong>${clock(data?.attendance?.start_at)}</strong></div>${sessions.map((item) => `<div class="profile-row"><span>${esc(processName(item.process_code))}</span><strong>${clock(item.start_at)}–${item.stop_at ? clock(item.stop_at) : 'teraz'}</strong></div>`).join('') || '<div class="profile-row"><span>Procesy</span><strong>brak</strong></div>'}`;
    }
    const correction = profile.querySelector('[data-worker-correction]');
    if (correction) {
      correction.querySelectorAll('input,textarea,button').forEach((node) => { node.disabled = true; });
      correction.title = 'Korekta czasu jest dostępna po wczytaniu bieżącego stanu.';
    }
    const logout = [...profile.querySelectorAll('button')].find((button) => /Wyloguj/i.test(button.textContent));
    if (logout && !logout.dataset.liveBound) {
      logout.dataset.liveBound = 'true';
      logout.disabled = false;
      logout.addEventListener('click', async (event) => {
        event.preventDefault(); event.stopImmediatePropagation();
        logout.disabled = true;
        setStatus('Wylogowywanie…');
        try { await api.logout(); }
        catch (error) { if (error.status !== 401) { setStatus(error.message, 'error'); logout.disabled = false; return; } }
        api.redirectLogin('session');
      }, true);
    }
  }

  function renderWorker(data) {
    workerStatus = data;
    const attendance = data?.attendance || null;
    const active = data?.active_process || null;
    const workState = attendance?.state === 'OPEN' ? 'W PRACY' : attendance?.state === 'CLOSED' ? 'DZIEŃ ZAKOŃCZONY' : 'NIE ROZPOCZĘTO';
    const workTitle = document.querySelector('.work-status h2');
    const processChip = document.querySelector('.work-status .status-head .mol-chip');
    if (workTitle) workTitle.textContent = workState;
    if (processChip) {
      processChip.textContent = active?.process_code || (attendance?.moniti_source === 'LIVE' && attendance.state === 'OPEN' ? 'MONITI · BEZ PROCESU' : 'BRAK PROCESU');
      processChip.className = `mol-chip ${active ? 'mol-chip--success' : 'mol-chip--warning'}`;
    }
    const stats = document.querySelectorAll('.work-status .status-stats strong');
    if (stats[0]) stats[0].textContent = clock(attendance?.start_at);
    if (stats[1]) stats[1].textContent = duration(data?.presence_seconds);
    if (stats[2]) stats[2].textContent = active?.start_at ? duration((Date.now() - Date.parse(active.start_at)) / 1000) : '00:00';
    const kpis = document.querySelectorAll('.kpi-grid article strong');
    if (kpis[0]) kpis[0].textContent = duration(data?.presence_seconds);
    if (kpis[1]) kpis[1].textContent = duration(data?.no_process_seconds);
    if (kpis[2]) kpis[2].textContent = percent(data?.norm?.combined_percent);
    const progress = document.querySelector('.kpi-grid .progress i');
    if (progress) progress.style.width = `${Math.max(0, Math.min(100, Number(data?.norm?.combined_percent) || 0))}%`;

    const activeCard = document.querySelector('.active-process');
    if (activeCard) {
      const title = activeCard.querySelector('h2');
      const small = activeCard.querySelector('small:last-of-type');
      if (title) title.textContent = active ? processName(active.process_code).toUpperCase() : 'BRAK PROCESU';
      if (small) small.textContent = active ? `Kod procesu: ${active.process_code}` : 'Brak aktywnego procesu';
    }

    const workDate = data?.work_date || today();
    const monthLabel = `${date(`${workDate.slice(0, 7)}-01`)}–${date(workDate)}`;
    setNorm(document.querySelector('[data-norm-period="today"]'), data?.norm, date(workDate));
    setNorm(document.querySelector('[data-norm-period="month"]'), data?.monthly_norm, monthLabel);
    renderProcessPanel(data);
    renderProfile(data);
  }

  async function loadWorker(silent = false) {
    if (!silent) setStatus('Odczytuję bieżący stan pracownika…');
    const data = await api.read('mol-app-v2-worker-status');
    renderWorker(data);
    if (!silent) {
      const attendance = data?.attendance;
      if (attendance?.moniti_source === 'LIVE' && attendance.state === 'OPEN') {
        setStatus(`Aktywna praca w Moniti od ${clock(attendance.start_at)}. Wybierz proces — wcześniejszy czas liczymy jako międzyprocesowy.`, 'ok');
      } else if (attendance?.moniti_source === 'LIVE' && attendance.state === 'CLOSED') {
        setStatus(`Dzień w Moniti zakończony o ${clock(attendance.stop_at)}. Możesz wznowić pracę.`, 'ok');
      } else if (data?.moniti_read_error) {
        setStatus('Stan lokalny jest dostępny, ale odczyt Moniti chwilowo się nie powiódł.', 'error');
      } else {
        setStatus('Stan pracownika potwierdzony przez backend V2.', 'ok');
      }
    }
    return data;
  }

  async function loadMessages() {
    const data = await api.read('mol-app-v2-messages', { limit: 25 });
    const panel = await waitFor('[data-panel="messages"]');
    if (!panel) return data;
    const list = panel.querySelector('.message-list');
    const detail = panel.querySelector('[data-message-detail]');
    const items = Array.isArray(data?.items) ? data.items : [];
    const labels = { MANUAL: 'Wiadomość lidera', NO_PROCESS: 'Brak procesu', NO_ACTIVITY: 'Brak aktywności', WRONG_PROCESS: 'Niewłaściwy proces', WORK_OUTSIDE_APP: 'Praca bez START', ATTENDANCE_CORRECTION: 'Korekta czasu', FORGOTTEN_STOP: 'Przypomnienie STOP' };
    if (list) {
      list.innerHTML = items.length ? items.map((item) => `<button class="mol-card message-card${item.shown_at ? ' is-read' : ''}" type="button" data-live-message="${esc(item.message_id)}"><i></i><span><strong>${esc(labels[item.type] || item.type || 'Komunikat')}</strong><small>${esc(item.content)}</small></span><time>${item.sent_at ? new Date(item.sent_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' }) : '—'}</time></button>`).join('') : '<article class="mol-card"><small>Brak komunikatów.</small></article>';
      list.querySelectorAll('[data-live-message]').forEach((button) => button.addEventListener('click', () => {
        const item = items.find((entry) => entry.message_id === button.dataset.liveMessage);
        if (!item || !detail) return;
        detail.hidden = false;
        detail.querySelector('h3').textContent = labels[item.type] || item.type || 'Komunikat';
        detail.querySelector('p').textContent = item.content;
        const ack = detail.querySelector('[data-message-ack]');
        if (ack) {
          ack.disabled = true;
          ack.textContent = item.ack_at ? 'Odbiór potwierdzony' : item.ack_required ? 'Potwierdzam odbiór' : 'Potwierdzenie niewymagane';
        }
      }));
    }
    const newCount = items.filter((item) => !item.shown_at && !item.expired).length;
    const headerChip = panel.querySelector('.worker-detail-head .mol-chip');
    if (headerChip) headerChip.textContent = `${newCount} nowe`;
    const navBadge = document.querySelector('[data-nav="messages"] .badge');
    if (navBadge) { navBadge.textContent = String(newCount); navBadge.hidden = newCount === 0; }
    return data;
  }

  function teamCard(row) {
    const active = row.process?.state === 'ACTIVE';
    const status = row.attendance?.state === 'OPEN' ? 'W PRACY' : row.attendance?.state === 'CLOSED' ? 'ZAKOŃCZONY' : 'BRAK STARTU';
    const norm = row.norm || {};
    return `<div class="manager-person" data-live-employee="${esc(row.employee.employee_id)}"><div><b>${esc(row.employee.display_name)}</b><small>${status} · ${active ? esc(processName(row.process.process_code)) : 'brak procesu'} · aplikacja ${esc(row.app_activity?.status || 'OFFLINE')} · ES ${esc(row.es_mapping?.status || '—')}</small></div><div class="manager-person-metrics"><span><small>PICK dziś</small><strong>Łącznie ${number(norm.total_pick)}</strong><em>Do normy ${number(norm.eligible_pick)} · Poza normą ${number(norm.outside_pick)}</em><b>Czas ${duration(norm.pick_seconds)} · Norma ${percent(norm.pick_percent)}</b></span><span><small>PAK dziś</small><strong>Łącznie ${number(norm.total_pak)}</strong><em>Do normy ${number(norm.eligible_pak)} · Poza normą ${number(norm.outside_pak)}</em><b>Czas ${duration(norm.pak_seconds)} · Norma ${percent(norm.pak_percent)}</b></span><span><small>PICK/PAK dziś</small><strong>Łącznie ${number(norm.total_combined_units, 1)} j.n.</strong><em>Do normy ${number(norm.eligible_combined_units, 1)} j.n. · Poza normą ${number(norm.outside_combined_units, 1)} j.n.</em><b>Czas ${duration(norm.combined_seconds)} · Norma ${percent(norm.combined_percent)}</b></span></div></div>`;
  }

  async function showEmployeeHistory(employeeId, displayName) {
    const teamPanel = document.querySelector('[data-panel="team"]');
    if (!teamPanel) return;
    let holder = teamPanel.querySelector('[data-live-history]');
    if (!holder) {
      holder = document.createElement('section');
      holder.className = 'mol-card';
      holder.dataset.liveHistory = 'true';
      teamPanel.append(holder);
    }
    holder.innerHTML = `<h3>Historia · ${esc(displayName || employeeId)}</h3><p class="mol-muted">Odczytuję…</p>`;
    try {
      const data = await api.read('mol-app-v2-employee-history', { employee_id: employeeId, date_from: monthStart(), date_to: today(), limit: 50 });
      const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
      holder.innerHTML = `<h3>Historia · ${esc(data?.employee?.display_name || displayName || employeeId)}</h3>${timeline.slice(0, 12).map((entry) => `<div class="profile-row"><span>${esc(entry.kind)} · ${entry.occurred_at ? new Date(entry.occurred_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }) : '—'}</span><strong>${esc(entry.data?.event_type || entry.data?.work_date || entry.data?.status || '')}</strong></div>`).join('') || '<p class="mol-muted">Brak wpisów w wybranym okresie.</p>'}`;
    } catch (error) {
      holder.innerHTML = `<h3>Historia · ${esc(displayName || employeeId)}</h3><p class="mol-muted">${esc(error.message)}</p>`;
    }
  }

  function populatePeople(container, items, checkedCount = 3) {
    if (!container) return;
    container.innerHTML = items.map((row, index) => `<label><input type="checkbox" value="${esc(row.employee.employee_id)}" ${index < checkedCount ? 'checked' : ''}><span><b>${esc(row.employee.display_name)}</b><small>${esc(row.employee.employee_id)} · ${row.attendance?.state || 'NOT_STARTED'}</small></span></label>`).join('');
  }

  async function renderManagerTeam(data) {
    teamData = data;
    const items = Array.isArray(data?.items) ? data.items : [];
    const panel = await waitFor('[data-panel="team"]');
    const list = panel?.querySelector('.manager-list');
    if (list) {
      list.innerHTML = items.map(teamCard).join('') || '<p class="mol-muted">Brak osób w operacyjnym zespole dla wybranej daty.</p>';
      list.querySelectorAll('[data-live-employee]').forEach((node) => node.addEventListener('click', () => {
        const row = items.find((item) => item.employee.employee_id === node.dataset.liveEmployee);
        showEmployeeHistory(node.dataset.liveEmployee, row?.employee?.display_name);
      }));
    }
    const metrics = panel?.querySelectorAll('.manager-mobile-grid article strong') || [];
    const open = items.filter((row) => row.attendance?.state === 'OPEN');
    if (metrics[0]) metrics[0].textContent = String(open.length);
    if (metrics[1]) metrics[1].textContent = String(open.filter((row) => row.process?.state !== 'ACTIVE').length);
    if (metrics[2]) metrics[2].textContent = String(items.reduce((sum, row) => sum + Number(row.active_alert_count || 0), 0));
    try {
      const performance = await api.read('mol-app-v2-report-performance', { date_from: data.work_date || today(), date_to: data.work_date || today() });
      if (metrics[3]) metrics[3].textContent = percent(performance?.summary?.combined_percent);
    } catch { if (metrics[3]) metrics[3].textContent = '—'; }

    const reportPanel = document.querySelector('[data-panel="manager-reports"]');
    populatePeople(reportPanel?.querySelector('.mobile-report-people'), items);
    syncManagerReport(reportPanel);
    const messagePanel = document.querySelector('[data-panel="manager-messages"]');
    populatePeople(messagePanel?.querySelector('[data-mobile-message-recipients]'), items.filter((row) => row.attendance?.state === 'OPEN'), 1);
  }

  async function loadManagerReads() {
    const team = await api.read('mol-app-v2-leader-team', { work_date: today() });
    await renderManagerTeam(team);
    await Promise.allSettled([loadUsers(), loadCorrections()]);
    bindManagerReport();
    return team;
  }

  async function loadUsers() {
    const data = await api.read('mol-app-v2-user-list');
    const panel = await waitFor('[data-panel="manager-users"]');
    const list = panel?.querySelector('.manager-user-list');
    if (list) {
      list.innerHTML = (data?.items || []).map((user) => `<article class="mol-card"><div><b>${esc(user.display_name)}</b><small>${esc(user.role)} · ${esc(user.employee_id)} · ${esc(user.login || '')} · ${user.active ? 'aktywna' : 'nieaktywna'}</small></div><button class="mol-button" type="button" disabled>Ładowanie akcji…</button></article>`).join('') || '<p class="mol-muted">Brak kont.</p>';
    }
    return data;
  }

  async function loadCorrections() {
    const data = await api.read('mol-app-v2-corrections-queue');
    const panel = await waitFor('[data-panel="manager-corrections"]');
    const list = panel?.querySelector('.manager-correction-list');
    if (list) {
      list.innerHTML = (data?.items || []).map((item) => `<article class="mol-card correction-item"><div><b>${esc(item.employee_id)}</b><small>${esc(item.work_date)} · ${esc(item.status)}</small><p>${esc(item.reason || '')}</p></div><div class="correction-actions"><button class="accept" disabled>Ładowanie…</button><button class="reject" disabled>Ładowanie…</button></div></article>`).join('') || '<p class="mol-muted">Brak korekt.</p>';
    }
    return data;
  }

  function reportSelected(panel) {
    return [...panel.querySelectorAll('.mobile-report-people input:checked')].map((input) => input.value);
  }

  function syncManagerReport(panel) {
    if (!panel) return;
    const count = reportSelected(panel).length;
    const countLabel = panel.querySelector('[data-mobile-report-count]');
    if (countLabel) countLabel.textContent = `Wybrano ${count}`;
    const selected = panel.querySelector('[data-mobile-report-selected]');
    if (selected) selected.textContent = String(count);
    const generate = panel.querySelector('[data-mobile-report-generate]');
    if (generate) generate.disabled = count === 0;
    panel.querySelectorAll('[data-mobile-export]').forEach((button) => { button.disabled = count === 0; });
  }

  function renderMobilePerformance(panel, data) {
    const summary = data?.summary || {};
    const selected = panel.querySelector('[data-mobile-report-selected]');
    const norm = panel.querySelector('[data-mobile-report-norm]');
    if (selected) selected.textContent = String(summary.employees || 0);
    if (norm) norm.textContent = percent(summary.combined_percent);
    const list = panel.querySelector('[data-mobile-report-list]');
    if (list) list.innerHTML = (data?.rows || []).map((row) => `<article class="mobile-norm-report"><div><b>${esc(row.display_name)}</b><small>${esc(row.employee_id)} · ${esc(row.work_date)}</small></div><div class="mobile-norm-grid"><span><small>PICK</small><b>Łącznie ${number(row.pick_total)}</b><em>Do normy ${number(row.pick_eligible)} · Poza ${number(row.pick_outside)}</em><strong>Czas ${duration(row.pick_seconds)} · ${percent(row.pick_percent)}</strong></span><span><small>PAK</small><b>Łącznie ${number(row.pak_total)}</b><em>Do normy ${number(row.pak_eligible)} · Poza ${number(row.pak_outside)}</em><strong>Czas ${duration(row.pak_seconds)} · ${percent(row.pak_percent)}</strong></span><span><small>PICK/PAK</small><b>Łącznie ${number(row.combined_total_units, 1)} j.n.</b><em>Do normy ${number(row.combined_eligible_units, 1)} · Poza ${number(row.combined_outside_units, 1)}</em><strong>Czas ${duration(row.combined_seconds)} · ${percent(row.combined_percent)}</strong></span></div></article>`).join('') || '<p class="mol-muted">Brak danych dla wybranego zakresu.</p>';
  }

  async function generateManagerReport(panel) {
    const ids = reportSelected(panel);
    if (!ids.length) return;
    const from = panel.querySelector('[data-mobile-report-from]')?.value;
    const to = panel.querySelector('[data-mobile-report-to]')?.value;
    setStatus('Generuję raport wydajności z backendu…');
    const data = await api.read('mol-app-v2-report-performance', { date_from: from, date_to: to, employee_ids: ids });
    renderMobilePerformance(panel, data);
    setStatus('Raport wydajności potwierdzony przez backend.', 'ok');
  }

  function bindManagerReport() {
    const panel = document.querySelector('[data-panel="manager-reports"]');
    if (!panel || panel.dataset.liveBound) return;
    panel.dataset.liveBound = 'true';
    const from = panel.querySelector('[data-mobile-report-from]');
    const to = panel.querySelector('[data-mobile-report-to]');
    if (from && !from.value) from.value = monthStart();
    if (to && !to.value) to.value = today();
    const sync = () => syncManagerReport(panel);
    panel.querySelector('.mobile-report-people')?.addEventListener('change', sync);
    panel.querySelector('[data-mobile-report-all]')?.addEventListener('click', (event) => {
      event.preventDefault();
      panel.querySelectorAll('.mobile-report-people input').forEach((input) => { input.checked = true; });
      sync();
    });
    panel.querySelector('[data-mobile-report-clear]')?.addEventListener('click', (event) => {
      event.preventDefault();
      panel.querySelectorAll('.mobile-report-people input').forEach((input) => { input.checked = false; });
      sync();
    });
    const generate = panel.querySelector('[data-mobile-report-generate]');
    generate?.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      generateManagerReport(panel).catch((error) => setStatus(error.message, 'error'));
    }, true);
    panel.querySelectorAll('[data-mobile-export]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      const ids = reportSelected(panel);
      const format = String(button.dataset.mobileExport || '').toLowerCase();
      setStatus(`Przygotowuję plik ${format.toUpperCase()}…`);
      api.download('mol-app-v2-report-export', { report_type: 'performance', format, date_from: from?.value, date_to: to?.value, employee_ids: ids }, `mol_v2_performance.${format}`)
        .then((filename) => setStatus(`Pobrano ${filename}.`, 'ok'))
        .catch((error) => setStatus(error.message, 'error'));
    }, true));
    sync();
  }


  async function init() {
    removeEstylLogo();
    try {
      session = await api.requireSession({ surface: 'mobile' });
      if (!session) return api.redirectLogin('session');
      role = String(session.user.role || '').toUpperCase();
      if (api.canonicalizeRole(role)) return;
      updateIdentity();
      api.reveal();
      initialised = true;
      await loadWorker();
      const optionalReads = [loadMessages()];
      if (role !== 'WORKER') optionalReads.push(loadManagerReads());
      const optionalResults = await Promise.allSettled(optionalReads);
      const optionalFailures = optionalResults.filter((result) => result.status === 'rejected');
      document.documentElement.dataset.liveReadsReady = 'true';
      if (optionalFailures.length) setStatus(`Podstawowe funkcje są gotowe. Nie wczytano ${optionalFailures.length} opcjonalnych sekcji.`, 'error');
      else setStatus('Podstawowe funkcje i sekcje dodatkowe są gotowe.', 'ok');
    } catch (error) {
      if (error.status === 401) return api.redirectLogin('session');
      setStatus(error.message || 'Nie udało się uruchomić integracji.', 'error');
      api.reveal();
    }
  }

  setInterval(() => {
    if (!initialised || document.hidden) return;
    loadWorker(true).catch((error) => setStatus(error.message, 'error'));
    if (role !== 'WORKER') api.read('mol-app-v2-leader-team', { work_date: today() }).then(renderManagerTeam).catch(() => {});
  }, 30000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && initialised) loadWorker(true).catch(() => {});
  });

  window.MOLLiveReady = init();
})();
