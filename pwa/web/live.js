(() => {
  'use strict';

  const api = window.MOLApi;
  if (!api) return;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = async (selector, timeout = 8000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const node = document.querySelector(selector);
      if (node) return node;
      await sleep(35);
    }
    return null;
  };
  const duration = (seconds) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  };
  const clock = (value) => value ? new Date(value).toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' }) : '—';
  const when = (value) => value ? new Date(value).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' }) : '—';
  const day = (value) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('pl-PL') : '—';
  const percent = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 10) / 10}%` : '—';
  const number = (value, digits = 0) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('pl-PL', { maximumFractionDigits: digits }) : '0';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const monthStart = () => `${today().slice(0, 7)}-01`;
  const processName = (code) => window.MOLProcesses?.byCode(code)?.name || code || 'Brak procesu';
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

  let session = null;
  let role = '';
  let teamData = null;
  let currentEmployee = '';
  let initialised = false;

  function ensureStatusBar() {
    let bar = document.querySelector('[data-live-integration-status]');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.dataset.liveIntegrationStatus = 'true';
    bar.style.cssText = 'position:fixed;z-index:9999;left:300px;right:24px;bottom:18px;padding:9px 12px;border:1px solid rgba(18,200,255,.28);border-radius:10px;background:rgba(3,20,31,.96);color:#bfefff;font:600 12px/1.35 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.25)';
    document.body.append(bar);
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
    const profileName = document.querySelector('.profile strong');
    const profileRole = document.querySelector('.profile small');
    const avatar = document.querySelector('.profile-avatar');
    if (profileName) profileName.textContent = user.display_name || user.employee_id || 'Użytkownik';
    if (profileRole) profileRole.textContent = role === 'ADMIN' ? 'Administrator' : 'Lider zespołu';
    if (avatar) avatar.textContent = String(user.display_name || user.employee_id || 'M').trim().charAt(0).toUpperCase();
    const badges = document.querySelector('.role-badges');
    if (badges) badges.innerHTML = `<span class="mol-chip ${role === 'ADMIN' ? 'mol-chip--warning' : 'mol-chip--info'}">${esc(role)}</span>`;
  }

  function ensureTeamColumns() {
    const table = document.getElementById('teamRows')?.closest('table');
    const head = table?.querySelector('thead tr');
    if (!head) return;
    const labels = ['START', 'Aktywność aplikacji', 'Czas procesu', 'Międzyprocesowy', 'Mapowanie ES'];
    const existing = [...head.querySelectorAll('th')].map((th) => th.textContent.trim());
    for (const label of labels) {
      if (existing.includes(label)) continue;
      const th = document.createElement('th');
      th.dataset.requiredLeaderColumn = label;
      th.textContent = label;
      head.append(th);
    }
  }

  const cellProduction = (total, eligible, outside, unit = '') => `<td class="production-split"><strong>Łącznie ${number(total, unit ? 1 : 0)}${unit}</strong><small>Do normy ${number(eligible, unit ? 1 : 0)}${unit}</small><small>Poza normą ${number(outside, unit ? 1 : 0)}${unit}</small></td>`;

  function rowDataset(row) {
    const n = row.norm || {};
    const m = row.monthly_norm || {};
    return {
      employee: row.employee.display_name,
      id: row.employee.employee_id,
      status: row.attendance?.state === 'OPEN' ? 'W PRACY' : row.attendance?.state === 'CLOSED' ? 'ZAKOŃCZONY' : 'BRAK STARTU',
      process: row.process?.state === 'ACTIVE' ? processName(row.process.process_code) : 'Brak procesu',
      attendance: duration(row.presence_seconds),
      noProcess: duration(row.no_process_seconds),
      pickTotal: n.total_pick || 0,
      pickEligible: n.eligible_pick || 0,
      pickOutside: n.outside_pick || 0,
      pickTime: duration(n.pick_seconds),
      pickNorm: n.pick_percent ?? '',
      packTotal: n.total_pak || 0,
      packEligible: n.eligible_pak || 0,
      packOutside: n.outside_pak || 0,
      packTime: duration(n.pak_seconds),
      packNorm: n.pak_percent ?? '',
      total: n.total_combined_units || 0,
      totalEligible: n.eligible_combined_units || 0,
      totalOutside: n.outside_combined_units || 0,
      totalTime: duration(n.combined_seconds),
      totalNorm: n.combined_percent ?? '',
      monthPickTotal: m.total_pick || 0,
      monthPickEligible: m.eligible_pick || 0,
      monthPickOutside: m.outside_pick || 0,
      monthPickTime: duration(m.pick_seconds),
      monthPickNorm: m.pick_percent ?? '',
      monthPackTotal: m.total_pak || 0,
      monthPackEligible: m.eligible_pak || 0,
      monthPackOutside: m.outside_pak || 0,
      monthPackTime: duration(m.pak_seconds),
      monthPackNorm: m.pak_percent ?? '',
      monthTotal: m.total_combined_units || 0,
      monthTotalEligible: m.eligible_combined_units || 0,
      monthTotalOutside: m.outside_combined_units || 0,
      monthTotalTime: duration(m.combined_seconds),
      monthTotalNorm: m.combined_percent ?? '',
    };
  }

  function renderTeam(data) {
    teamData = data;
    ensureTeamColumns();
    const body = document.getElementById('teamRows');
    if (!body) return;
    const items = Array.isArray(data?.items) ? data.items : [];
    body.replaceChildren();
    for (const item of items) {
      const n = item.norm || {};
      const ds = rowDataset(item);
      const tr = document.createElement('tr');
      Object.entries(ds).forEach(([key, value]) => { tr.dataset[key] = String(value ?? ''); });
      tr.dataset.liveEmployee = item.employee.employee_id;
      if (item.employee.employee_id === currentEmployee) tr.classList.add('is-selected');
      const stateClass = item.attendance?.state === 'OPEN' ? 'success' : item.attendance?.state === 'CLOSED' ? 'warning' : 'muted';
      const active = item.process?.state === 'ACTIVE';
      const processSeconds = active && item.process?.start_at ? Math.max(0, Math.floor((Date.now() - Date.parse(item.process.start_at)) / 1000)) : 0;
      tr.innerHTML = `
        <td><b>${esc(item.employee.display_name)}</b><small>${esc(item.employee.employee_id)}</small></td>
        <td><span class="status ${stateClass}">${esc(ds.status)}</span></td>
        <td>${active ? esc(processName(item.process.process_code)) : '—'}<small>${active ? esc(item.process.process_code) : ''}</small></td>
        <td>${duration(item.presence_seconds)}</td>
        ${cellProduction(n.total_pick, n.eligible_pick, n.outside_pick)}
        ${cellProduction(n.total_pak, n.eligible_pak, n.outside_pak)}
        ${cellProduction(n.total_combined_units, n.eligible_combined_units, n.outside_combined_units, ' j.n.')}
        <td class="${Number(n.combined_percent) >= 90 ? 'good' : 'warn'}">${percent(n.combined_percent)}</td>
        <td>${Number(item.active_alert_count || 0) ? `<span class="alert">▲ ${Number(item.active_alert_count)}</span>` : '—'}</td>
        <td><strong>${clock(item.attendance?.start_at)}</strong></td>
        <td><span class="${item.app_activity?.status === 'ONLINE' ? 'team-app-active' : 'team-app-inactive'}">${esc(item.app_activity?.status || 'OFFLINE')}</span></td>
        <td><strong>${duration(processSeconds)}</strong></td>
        <td><strong>${duration(item.no_process_seconds)}</strong></td>
        <td><span class="${item.es_mapping?.status === 'MAPPED' ? 'team-es-ok' : 'team-es-error'}">${esc(item.es_mapping?.status || '—')}</span></td>`;
      tr.addEventListener('click', () => selectEmployee(item));
      body.append(tr);
    }

    const kpis = document.querySelectorAll('[data-view="team"] .kpis article strong');
    const open = items.filter((row) => row.attendance?.state === 'OPEN');
    if (kpis[0]) kpis[0].textContent = String(open.length);
    if (kpis[1]) kpis[1].textContent = String(open.filter((row) => row.process?.state !== 'ACTIVE').length);
    if (kpis[2]) kpis[2].textContent = String(items.reduce((total, row) => total + Number(row.active_alert_count || 0), 0));
    if (kpis[4]) kpis[4].textContent = document.querySelector('[data-live-correction-pending]')?.dataset.count || '—';
    api.read('mol-app-v2-report-performance', { date_from: data.work_date || today(), date_to: data.work_date || today() }).then((report) => {
      if (kpis[3]) kpis[3].textContent = percent(report?.summary?.combined_percent);
    }).catch(() => { if (kpis[3]) kpis[3].textContent = '—'; });

    const subtitle = document.querySelector('.team-card .card-head span');
    if (subtitle) subtitle.textContent = `${items.length} osób · dane z backendu V3`;
    populateReportPeople(items);
    if (!currentEmployee && items[0]) selectEmployee(items[0]);
  }

  function updateEmployeeCard(item) {
    const ds = rowDataset(item);
    const name = document.getElementById('employeeName');
    const id = document.getElementById('employeeId');
    const status = document.getElementById('employeeStatus');
    const attendance = document.getElementById('employeeAttendance');
    const noProcess = document.getElementById('employeeNoProcess');
    const process = document.getElementById('employeeProcess');
    if (name) name.textContent = item.employee.display_name;
    if (id) id.textContent = item.employee.employee_id;
    if (status) { status.textContent = ds.status; status.className = `mol-chip ${item.attendance?.state === 'OPEN' ? 'mol-chip--success' : 'mol-chip--warning'}`; }
    if (attendance) attendance.textContent = duration(item.presence_seconds);
    if (noProcess) noProcess.textContent = duration(item.no_process_seconds);
    if (process) process.textContent = ds.process;
    document.querySelectorAll('[data-performance-field]').forEach((node) => {
      const field = node.dataset.performanceField;
      const value = ds[field];
      if (/norm$/i.test(field)) node.textContent = value === '' ? '—' : percent(value);
      else if (/^(total|totalEligible|totalOutside|monthTotal|monthTotalEligible|monthTotalOutside)$/.test(field)) node.textContent = `${number(value, 1)} j.n.`;
      else node.textContent = value ?? '—';
    });
  }

  async function selectEmployee(item) {
    currentEmployee = item.employee.employee_id;
    document.querySelectorAll('#teamRows tr').forEach((tr) => tr.classList.toggle('is-selected', tr.dataset.liveEmployee === currentEmployee));
    updateEmployeeCard(item);
    const detail = document.querySelector('[data-employee-required-detail]') || (() => {
      const card = document.getElementById('employeeName')?.closest('.mol-card');
      if (!card) return null;
      const section = document.createElement('section');
      section.className = 'mol-card employee-required-detail';
      section.dataset.employeeRequiredDetail = 'true';
      card.after(section);
      return section;
    })();
    if (!detail) return;
    const active = item.process?.state === 'ACTIVE';
    detail.innerHTML = `
        <h3>Pełny podgląd operacyjny pracownika</h3>
        <div class="employee-required-grid">
          <span><small>START</small><strong>${clock(item.attendance?.start_at)}</strong></span>
          <span><small>Czas pracy</small><strong>${duration(item.presence_seconds)}</strong></span>
          <span><small>Aktywność aplikacji</small><strong>${esc(item.app_activity?.status || 'OFFLINE')}</strong></span>
          <span><small>Czas bieżącego procesu</small><strong>${active && item.process?.start_at ? duration((Date.now() - Date.parse(item.process.start_at)) / 1000) : '00:00'}</strong></span>
          <span><small>Czas międzyprocesowy</small><strong>${duration(item.no_process_seconds)}</strong></span>
          <span><small>Mapowanie ES</small><strong>${esc(item.es_mapping?.status || '—')}</strong></span>
          <span><small>Aktywne alerty</small><strong>${Number(item.active_alert_count || 0)}</strong></span>
          <span><small>Proces</small><strong>${active ? esc(processName(item.process.process_code)) : 'BRAK PROCESU'}</strong></span>
          <span><small>Świeżość norm</small><strong>${esc(item.norm?.freshness || 'UNAVAILABLE')}</strong></span>
          <span><small>Stan dnia</small><strong>${esc(item.attendance?.state || 'NOT_STARTED')}</strong></span>
        </div>
        <div class="employee-event-history"><h3>Sesje procesów</h3>${Object.entries(item.time_by_process || {}).map(([code, seconds]) => `<div><b>${esc(processName(code))}</b><span>${duration(seconds)}</span><small>${esc(code)}</small></div>`).join('') || '<p class="mol-muted">Brak sesji procesu dla wybranego dnia.</p>'}</div>`;
  }

  async function loadTeam(silent = false) {
    if (!silent) setStatus('Odczytuję monitoring zespołu…');
    const dateInput = document.querySelector('[data-view="team"] .date-chip input');
    if (dateInput) { if (!dateInput.value || dateInput.value === '2026-09-07') dateInput.value = today(); dateInput.max = today(); }
    const data = await api.read('mol-app-v2-leader-team', { work_date: dateInput?.value || today() });
    renderTeam(data);
    if (!silent) setStatus('Monitoring zespołu potwierdzony przez backend.', 'ok');
    return data;
  }

  function populateReportPeople(items) {
    const reports = document.querySelector('[data-view="reports"]');
    const worktime = document.querySelector('[data-view="worktime"]');
    const directory = Array.isArray(window.MOLUsers?.items) ? window.MOLUsers.items : [];
    const liveById = new Map((items || []).map((item) => [item.employee.employee_id, item]));
    const source = directory.length ? directory.map((user) => liveById.get(user.employee_id) || { employee: user, norm: {}, monthly_norm: {} }) : items;
    const selectedFor = (view) => new Set([...view?.querySelectorAll('.report-people-grid input:checked') || []].map((input) => input.value));
    const reportSelected = selectedFor(reports);
    const worktimeSelected = selectedFor(worktime);
    const html = (selected, withOutput) => source.map((item) => {
      const m = item.monthly_norm || item.norm || {};
      const inactive = item.employee.active === false;
      const checked = selected.has(item.employee.employee_id);
      return `<label class="report-person"><input type="checkbox" value="${esc(item.employee.employee_id)}" ${checked ? 'checked' : ''}><span><b>${esc(item.employee.display_name)}</b><small>${esc(item.employee.employee_id)}${inactive ? ' · NIEAKTYWNY' : ''}</small></span>${withOutput ? `<span class="report-person-output" title="Wynik ważony: PAK + PICK ÷ 3"><i>Ważone <strong>${number(m.total_combined_units, 1)}</strong></i><i>Do normy <strong>${number(m.eligible_combined_units, 1)}</strong></i><i>Poza normą <strong>${number(m.outside_combined_units, 1)}</strong></i></span>` : ''}</label>`;
    }).join('');
    const reportGrid = reports?.querySelector('.report-people-grid');
    const workGrid = worktime?.querySelector('.report-people-grid');
    if (reportGrid) reportGrid.innerHTML = html(reportSelected, true);
    if (workGrid) workGrid.innerHTML = html(worktimeSelected, false);
    syncReportCounts();
  }


  const selectedIds = (view) => [...view.querySelectorAll('.report-people-grid input:checked')].map((input) => input.value);
  function syncReportCounts() {
    for (const [selector, countSelector, generateSelector, exportSelector] of [
      ['[data-view="reports"]', '[data-report-count]', '[data-report-generate]', '[data-report-export]'],
      ['[data-view="worktime"]', '[data-worktime-count]', '[data-worktime-generate]', '[data-worktime-export]'],
    ]) {
      const view = document.querySelector(selector);
      if (!view) continue;
      const count = selectedIds(view).length;
      const label = view.querySelector(countSelector);
      if (label) label.textContent = `Wybrano ${count}`;
      const generate = view.querySelector(generateSelector);
      if (generate) generate.disabled = count === 0;
      view.querySelectorAll(exportSelector).forEach((button) => { button.disabled = count === 0; });
    }
  }

  function bindSelector(view, allSelector, clearSelector) {
    if (!view || view.dataset.liveSelectorBound) return;
    view.dataset.liveSelectorBound = 'true';
    view.addEventListener('change', (event) => {
      if (event.target.matches('.report-people-grid input')) syncReportCounts();
    });
    view.querySelector(allSelector)?.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      view.querySelectorAll('.report-people-grid input').forEach((input) => { input.checked = true; });
      syncReportCounts();
    }, true);
    view.querySelector(clearSelector)?.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      view.querySelectorAll('.report-people-grid input').forEach((input) => { input.checked = false; });
      syncReportCounts();
    }, true);
  }

  function syncPerformancePeople(view, data) {
    const totals = new Map();
    for (const row of data?.rows || []) {
      const current = totals.get(row.employee_id) || { pick: 0, pickEligible: 0, pickOutside: 0, pak: 0, pakEligible: 0, pakOutside: 0 };
      current.pick += Number(row.pick_total || 0);
      current.pickEligible += Number(row.pick_eligible || 0);
      current.pickOutside += Number(row.pick_outside || 0);
      current.pak += Number(row.pak_total || 0);
      current.pakEligible += Number(row.pak_eligible || 0);
      current.pakOutside += Number(row.pak_outside || 0);
      totals.set(row.employee_id, current);
    }
    view.querySelectorAll('.report-person').forEach((label) => {
      const id = label.querySelector('input')?.value;
      const value = totals.get(id) || { pick: 0, pickEligible: 0, pickOutside: 0, pak: 0, pakEligible: 0, pakOutside: 0 };
      const weighted = [
        value.pak + value.pick / 3,
        value.pakEligible + value.pickEligible / 3,
        value.pakOutside + value.pickOutside / 3,
      ];
      label.querySelectorAll('.report-person-output strong').forEach((node, index) => {
        node.textContent = number(weighted[index] || 0, 1);
      });
    });
  }

  function renderPerformance(view, data) {
    const summary = data?.summary || {};
    const set = (selector, value) => { const node = view.querySelector(selector); if (node) node.textContent = value; };
    set('[data-report-pick-total]', number(summary.pick_total));
    set('[data-report-pick-eligible]', number(summary.pick_eligible));
    set('[data-report-pick-outside]', number(summary.pick_outside));
    set('[data-report-pick-time]', duration(summary.pick_seconds));
    set('[data-report-pick-norm]', percent(summary.pick_percent));
    set('[data-report-pack-total]', number(summary.pak_total));
    set('[data-report-pack-eligible]', number(summary.pak_eligible));
    set('[data-report-pack-outside]', number(summary.pak_outside));
    set('[data-report-pack-time]', duration(summary.pak_seconds));
    set('[data-report-pack-norm]', percent(summary.pak_percent));
    set('[data-report-total]', number(summary.combined_total_units, 1));
    set('[data-report-total-eligible]', number(summary.combined_eligible_units, 1));
    set('[data-report-total-outside]', number(summary.combined_outside_units, 1));
    set('[data-report-total-time]', duration(summary.combined_seconds));
    set('[data-report-total-norm]', percent(summary.combined_percent));
    syncPerformancePeople(view, data);
    const body = view.querySelector('[data-report-body]');
    if (body) body.innerHTML = (data?.rows || []).map((row) => `<tr><td><b>${esc(row.display_name)}</b><small>${esc(row.employee_id)} · ${esc(row.work_date)}</small></td><td>${number(row.pick_total)}</td><td class="good">${number(row.pick_eligible)}</td><td class="warn">${number(row.pick_outside)}</td><td>${duration(row.pick_seconds)}</td><td>${percent(row.pick_percent)}</td><td>${number(row.pak_total)}</td><td class="good">${number(row.pak_eligible)}</td><td class="warn">${number(row.pak_outside)}</td><td>${duration(row.pak_seconds)}</td><td>${percent(row.pak_percent)}</td><td>${number(row.combined_total_units, 1)}</td><td class="good">${number(row.combined_eligible_units, 1)}</td><td class="warn">${number(row.combined_outside_units, 1)}</td><td>${duration(row.combined_seconds)}</td><td>${percent(row.combined_percent)}</td><td>${esc(row.freshness || 'UNAVAILABLE')}</td></tr>`).join('') || '<tr><td colspan="17" class="report-empty">Brak danych dla wybranego zakresu.</td></tr>';
    const generated = view.querySelector('[data-report-generated]');
    if (generated) generated.textContent = `Backend V3 · ${day(data.date_from)} – ${day(data.date_to)} · ${summary.employees || 0} osób · wynik ważony: PAK + PICK ÷ 3`;
  }

  async function generatePerformance() {
    const view = document.querySelector('[data-view="reports"]');
    const ids = selectedIds(view);
    if (!ids.length) return;
    setStatus('Generuję raport wydajności z backendu…');
    const data = await api.read('mol-app-v2-report-performance', { date_from: view.querySelector('[data-report-from]')?.value, date_to: view.querySelector('[data-report-to]')?.value, employee_ids: ids });
    renderPerformance(view, data);
    setStatus('Raport wydajności: live backend, agregacja ważona.', 'ok');
  }

  function ensureWorktimeColumns(view) {
    const head = view?.querySelector('.worktime-report-table thead tr');
    if (!head) return;
    const labels = ['Czasy procesów', 'Czas międzyprocesowy', 'Korekty', 'Synchronizacja', 'Historia'];
    const existing = [...head.querySelectorAll('th')].map((th) => th.textContent.trim());
    for (const label of labels) {
      if (existing.includes(label)) continue;
      const th = document.createElement('th'); th.dataset.worktimeExtra = label; th.textContent = label; head.append(th);
    }
  }

  function processTimes(value) {
    if (!value || typeof value !== 'object') return '—';
    const entries = Object.entries(value).filter(([, seconds]) => Number(seconds) > 0);
    return entries.length ? entries.map(([code, seconds]) => `${processName(code)} ${duration(seconds)}`).join(' · ') : '—';
  }

  function renderAttendance(view, data) {
    ensureWorktimeColumns(view);
    const rows = data?.rows || [];
    const summary = data?.summary || {};
    const set = (selector, value) => { const node = view.querySelector(selector); if (node) node.textContent = value; };
    set('[data-worktime-selected]', String(summary.employees || 0));
    set('[data-worktime-days]', String(rows.length));
    set('[data-worktime-total]', duration(summary.total_presence_seconds));
    set('[data-worktime-average]', rows.length ? duration(Number(summary.total_presence_seconds || 0) / rows.length) : '00:00');
    const body = view.querySelector('[data-worktime-body]');
    if (body) body.innerHTML = rows.map((row) => `<tr data-live-history-id="${esc(row.employee_id)}"><td>${day(row.work_date)}</td><td><b>${esc(row.display_name)}</b><small>${esc(row.employee_id)}</small></td><td><span class="status ${row.attendance_state === 'OPEN' ? 'success' : row.attendance_state === 'CLOSED' ? 'muted' : 'warning'}">${esc(row.attendance_state)}</span></td><td>${clock(row.start_at)}</td><td>${clock(row.stop_at)}</td><td><strong>${duration(row.presence_seconds)}</strong></td><td><small>${esc(processTimes(row.time_by_process))}</small></td><td><strong>${duration(row.no_process_seconds)}</strong></td><td>${(row.corrections?.length || 0) + (row.direct_correction_events?.length || 0)}</td><td><small>Moniti ${esc(row.moniti_sync || '—')} · Drive ${esc(row.drive_sync || '—')}</small></td><td><button class="mol-button" type="button" data-live-history-button="${esc(row.employee_id)}">Historia</button></td></tr>`).join('') || '<tr><td colspan="11" class="report-empty">Brak danych dla wybranego zakresu.</td></tr>';
    const generated = view.querySelector('[data-worktime-generated]');
    if (generated) generated.textContent = `Backend V3 · ${day(data.date_from)} – ${day(data.date_to)} · ${summary.employees || 0} osób · ${rows.length} wierszy`;
    body?.querySelectorAll('[data-live-history-button]').forEach((button) => button.addEventListener('click', () => {
      const item = teamData?.items?.find((entry) => entry.employee.employee_id === button.dataset.liveHistoryButton);
      if (item) {
        document.querySelector('.sidebar [data-section="team"]')?.click();
        selectEmployee(item);
      }
    }));
    const statusFilter = view.querySelector('[data-worktime-status]');
    if (statusFilter && statusFilter.value !== 'ALL') {
      body?.querySelectorAll('tr').forEach((tr) => { if (!tr.querySelector('.report-empty')) tr.hidden = tr.cells[2]?.textContent.trim() !== statusFilter.value; });
    }
  }

  async function generateAttendance() {
    const view = document.querySelector('[data-view="worktime"]');
    const ids = selectedIds(view);
    if (!ids.length) return;
    const status = view.querySelector('[data-worktime-status]')?.value || 'ALL';
    setStatus('Generuję raport czasu pracy z backendu…');
    const data = await api.read('mol-app-v2-report-attendance', { date_from: view.querySelector('[data-worktime-from]')?.value, date_to: view.querySelector('[data-worktime-to]')?.value, employee_ids: ids, status: status === 'ALL' ? null : status });
    renderAttendance(view, data);
    setStatus('Raport czasu pracy potwierdzony przez backend.', 'ok');
  }

  async function exportReport(reportType, format, view) {
    const ids = selectedIds(view);
    if (!ids.length) return;
    const isAttendance = reportType === 'attendance';
    const from = view.querySelector(isAttendance ? '[data-worktime-from]' : '[data-report-from]')?.value;
    const to = view.querySelector(isAttendance ? '[data-worktime-to]' : '[data-report-to]')?.value;
    const status = isAttendance ? (view.querySelector('[data-worktime-status]')?.value || 'ALL') : 'ALL';
    const buttons = [...view.querySelectorAll(isAttendance ? '[data-worktime-export]' : '[data-report-export]')];
    buttons.forEach((button) => { button.disabled = true; });
    setStatus(`Generuję ${format} — ${isAttendance ? 'czas pracy' : 'wydajność'}…`);
    try {
      const fallback = `MOL_${isAttendance ? 'czas_pracy' : 'wydajnosc'}_${from}_${to}.${String(format).toLowerCase()}`;
      const filename = await api.download('mol-app-v3-report-export', {
        report_type: reportType,
        format: String(format).toLowerCase(),
        date_from: from,
        date_to: to,
        employee_ids: ids,
        ...(isAttendance && status !== 'ALL' ? { status } : {}),
      }, fallback);
      setStatus(`Pobrano plik ${filename}.`, 'ok');
    } catch (error) {
      setStatus(error.message || 'Nie udało się pobrać raportu.', 'error');
      throw error;
    } finally {
      syncReportCounts();
    }
  }

  function bindReports() {
    const reports = document.querySelector('[data-view="reports"]');
    const worktime = document.querySelector('[data-view="worktime"]');
    if (reports) {
      bindSelector(reports, '[data-report-all]', '[data-report-clear]');
      const from = reports.querySelector('[data-report-from]');
      const to = reports.querySelector('[data-report-to]');
      if (from && (from.value === '2026-09-01' || !from.value)) from.value = monthStart();
      if (to && (to.value === '2026-09-07' || !to.value)) to.value = today();
      reports.querySelector('[data-report-generate]')?.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); generatePerformance().catch((error) => setStatus(error.message, 'error')); }, true);
      reports.querySelectorAll('[data-report-export]').forEach((button) => button.addEventListener('click', (event) => {
        event.preventDefault(); event.stopImmediatePropagation();
        exportReport('performance', button.dataset.reportExport, reports).catch(() => {});
      }, true));
    }
    if (worktime) {
      bindSelector(worktime, '[data-worktime-all]', '[data-worktime-clear]');
      ensureWorktimeColumns(worktime);
      const from = worktime.querySelector('[data-worktime-from]');
      const to = worktime.querySelector('[data-worktime-to]');
      if (from && (from.value === '2026-09-01' || !from.value)) from.value = monthStart();
      if (to && (to.value === '2026-09-07' || !to.value)) to.value = today();
      worktime.querySelector('[data-worktime-generate]')?.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); generateAttendance().catch((error) => setStatus(error.message, 'error')); }, true);
      worktime.querySelectorAll('[data-worktime-export]').forEach((button) => button.addEventListener('click', (event) => {
        event.preventDefault(); event.stopImmediatePropagation();
        exportReport('attendance', button.dataset.worktimeExport, worktime).catch(() => {});
      }, true));
      worktime.querySelector('[data-worktime-status]')?.addEventListener('change', () => generateAttendance().catch(() => {}));
    }
  }

  async function loadUsers() {
    const view = await waitFor('[data-view="users"]');
    const list = view?.querySelector('.user-list-card');
    if (list) list.innerHTML = '<h2>Użytkownicy</h2><p class="mol-muted">Zarządzanie kontami nie należy do odebranych etapów V3. Nie uruchomiono starych zapisów V2.</p>';
    return { items: [] };
  }

  function correctionLabel(status) {
    return ({ PENDING: 'PENDING', CHANGED: 'CHANGED', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CONFLICT: 'CONFLICT', RETRY_PENDING: 'RETRY_PENDING', SYSTEM_REJECTED: 'SYSTEM_REJECTED' })[status] || status || '—';
  }

  async function loadCorrections() {
    const view = await waitFor('[data-view="corrections"]');
    const body = view?.querySelector('tbody');
    if (body) body.innerHTML = '<tr><td colspan="7">Korekty nie należą do odebranych etapów V3.</td></tr>';
    const stats = view?.querySelectorAll('.web-stat-grid article strong') || [];
    if (stats[0]) stats[0].textContent = '—';
    const oldMarker = document.querySelector('[data-live-correction-pending]');
    oldMarker?.remove();
    const marker = document.createElement('span'); marker.hidden = true; marker.dataset.liveCorrectionPending = 'true'; marker.dataset.count = '—'; document.body.append(marker);
    const refresh = view?.querySelector('.view-toolbar button');
    refresh?.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); loadCorrections().catch((error) => setStatus(error.message, 'error')); }, true);
    return { items: [], pending_count: 0 };
  }

  async function loadAudit() {
    const view = await waitFor('[data-view="audit"]');
    const list = view?.querySelector('.audit-list');
    if (list) list.innerHTML = '<p class="mol-muted">Historia operacji będzie podłączona w osobnym etapie V3. Stary odczyt V2 pozostaje wyłączony.</p>';
    return { items: [] };
  }


  function bindGlobal() {
    const dateInput = document.querySelector('[data-view="team"] .date-chip input');
    dateInput?.addEventListener('change', () => loadTeam().catch((error) => setStatus(error.message, 'error')));
    const search = document.querySelector('.topbar .search input');
    search?.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('pl');
      document.querySelectorAll('#teamRows tr').forEach((row) => {
        row.hidden = query && !`${row.dataset.employee} ${row.dataset.id} ${row.dataset.process}`.toLocaleLowerCase('pl').includes(query);
      });
    });
    const profileButton = document.querySelector('.profile button');
    if (profileButton) {
      profileButton.textContent = 'Wyloguj';
      profileButton.setAttribute('aria-label', 'Wyloguj');
      profileButton.addEventListener('click', async (event) => {
        event.preventDefault(); event.stopImmediatePropagation();
        profileButton.disabled = true;
        setStatus('Wylogowywanie…');
        try { await api.logout(); } catch (error) { if (error.status !== 401) { setStatus(error.message, 'error'); profileButton.disabled = false; return; } }
        api.redirectLogin('session');
      }, true);
    }
  }


  async function init() {
    removeEstylLogo();
    try {
      session = await api.requireSession({ surface: 'web' });
      if (!session) return api.redirectLogin('session');
      role = String(session.user.role || '').toUpperCase();
      if (role === 'WORKER') return api.redirectLogin('worker_web');
      if (api.canonicalizeRole(role)) return;
      updateIdentity();
      api.reveal();
      initialised = true;

      await waitFor('[data-view="reports"] .report-people-grid');
      await waitFor('[data-view="worktime"] .report-people-grid');
      removeEstylLogo();
      bindGlobal();
      bindReports();
      await loadTeam();
      await Promise.all([loadUsers(), loadCorrections(), loadAudit()]);
      document.documentElement.dataset.liveReadsReady = 'true';
      setStatus('Panel V3 gotowy: zespół, wydajność i czas pracy są podłączone do backendu V3.', 'ok');
    } catch (error) {
      if (error.status === 401) return api.redirectLogin('session');
      if (error.status === 403) return api.redirectLogin('worker_web');
      setStatus(error.message || 'Nie udało się uruchomić integracji.', 'error');
      api.reveal();
    }
  }

  setInterval(() => {
    if (!initialised || document.hidden) return;
    loadTeam(true).catch(() => {});
  }, 30000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && initialised) loadTeam(true).catch(() => {});
  });

  window.MOLRefreshReportPeople = () => populateReportPeople(teamData?.items || []);
  window.MOLLiveReady = init();
})();
