(() => {
  'use strict';

  const api = window.MOLApi;
  if (!api) return;

  const view = document.querySelector('[data-view="corrections"]');
  if (!view) return;

  const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Warsaw', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  const monthStart = () => `${today().slice(0, 7)}-01`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate = (value) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('pl-PL') : '—';
  const localTime = (value) => value ? new Date(value).toLocaleTimeString('pl-PL', {timeZone:'Europe/Warsaw', hour:'2-digit', minute:'2-digit'}) : '—';
  const localDateTime = (value) => value ? new Date(value).toLocaleString('pl-PL', {timeZone:'Europe/Warsaw', dateStyle:'short', timeStyle:'short'}) : '—';
  const inputTime = (value) => value ? new Date(value).toLocaleTimeString('pl-PL', {timeZone:'Europe/Warsaw', hour:'2-digit', minute:'2-digit', hour12:false}) : '';
  const processName = (code) => window.MOLProcesses?.byCode?.(code)?.name || code || '—';

  const LABEL = {
    MISSING_STOP: 'Brak STOP pracy',
    INVALID_START: 'Błędny START pracy',
    INVALID_STOP: 'Błędny STOP pracy',
    CORRECTION_REQUIRED: 'Wymaga korekty',
    MISSING_PROCESS_STOP: 'Brak STOP procesu',
    INVALID_PROCESS_START: 'Błędny START procesu',
    INVALID_PROCESS_STOP: 'Błędny STOP procesu',
    PROCESS_AFTER_ATTENDANCE_STOP: 'Proces po STOP pracy',
    PROCESS_BEFORE_ATTENDANCE_START: 'Proces przed START pracy',
  };
  const STATUS = {
    PENDING: 'DO KOREKTY',
    WAITING_ATTENDANCE: 'NAJPIERW CZAS PRACY',
    REQUIRES_ADMIN: 'WYMAGA ADMINA',
    APPLIED: 'SKORYGOWANO',
    RESOLVED: 'ROZWIĄZANO',
  };

  const style = document.createElement('style');
  style.textContent = `
    .corr-page{display:grid;gap:16px}.corr-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.corr-head h1{margin:4px 0 4px;font-size:30px}.corr-head small{color:var(--mol-text-muted)}
    .corr-live{display:flex;align-items:center;gap:8px;color:var(--mol-green);font-size:12px}.corr-live i{width:8px;height:8px;border-radius:50%;background:var(--mol-green);box-shadow:0 0 10px var(--mol-green)}
    .corr-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:end}.corr-toolbar label{display:grid;gap:5px;color:var(--mol-text-muted);font-size:11px}.corr-toolbar input,.corr-toolbar select{min-height:40px;padding:8px 10px;border:1px solid var(--mol-border);border-radius:9px;background:rgba(3,18,29,.85);color:var(--mol-text);font:inherit}
    .corr-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.corr-kpis article{padding:16px}.corr-kpis small,.corr-kpis strong{display:block}.corr-kpis small{color:var(--mol-text-muted)}.corr-kpis strong{margin-top:6px;font-size:26px}.corr-kpis article:first-child strong{color:var(--mol-yellow)}.corr-kpis article:last-child strong{color:var(--mol-red)}
    .corr-card{padding:0;overflow:hidden}.corr-card-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:16px 18px;border-bottom:1px solid var(--mol-border)}.corr-card-head h2{margin:0;font-size:18px}.corr-card-head small{color:var(--mol-text-muted)}
    .corr-table-wrap{overflow:auto}.corr-table{width:100%;border-collapse:collapse;min-width:980px}.corr-table th{padding:11px 12px;text-align:left;color:var(--mol-text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em;background:rgba(255,255,255,.02)}.corr-table td{padding:12px;border-top:1px solid rgba(81,178,220,.10);vertical-align:middle;font-size:12px}.corr-table tr[data-pending="true"]{background:rgba(255,188,64,.045)}.corr-table tr[data-admin="true"]{background:rgba(255,82,97,.06)}.corr-table tr[data-actionable="true"]{cursor:pointer}.corr-table tr[data-actionable="true"]:hover{background:rgba(18,200,255,.07)}.corr-table b,.corr-table small{display:block}.corr-table small{color:var(--mol-text-muted);margin-top:3px}.corr-empty{text-align:center;padding:34px!important;color:var(--mol-text-muted)}
    .corr-status{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900;white-space:nowrap;background:rgba(255,255,255,.06);color:var(--mol-text-muted)}.corr-status.pending{background:rgba(255,188,64,.13);color:var(--mol-yellow)}.corr-status.admin{background:rgba(255,82,97,.13);color:#ff8c98}.corr-status.done{background:rgba(34,210,162,.11);color:var(--mol-green)}
    .corr-type{font-weight:900;color:var(--mol-cyan)}.corr-action{border:1px solid rgba(18,200,255,.35);border-radius:8px;background:rgba(18,200,255,.07);color:var(--mol-cyan);padding:7px 9px;cursor:pointer;font-weight:800}.corr-action[disabled]{opacity:.45;cursor:default}
    .corr-modal-backdrop{position:fixed;inset:0;z-index:13000;display:grid;place-items:center;background:rgba(0,0,0,.74);padding:22px}.corr-modal{width:min(620px,100%);max-height:90vh;overflow:auto;border:1px solid rgba(18,200,255,.25);border-radius:18px;background:#07131d;color:var(--mol-text);padding:22px;box-shadow:0 28px 90px rgba(0,0,0,.6)}.corr-modal h2{margin:4px 0 8px}.corr-modal p{color:var(--mol-text-muted);line-height:1.5}.corr-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:16px 0}.corr-detail-grid span{padding:11px;border-radius:10px;background:rgba(255,255,255,.035)}.corr-detail-grid small,.corr-detail-grid strong{display:block}.corr-detail-grid small{color:var(--mol-text-muted);font-size:10px}.corr-detail-grid strong{margin-top:4px}.corr-form{display:grid;gap:12px;margin-top:14px}.corr-form label{display:grid;gap:6px;color:var(--mol-text-muted);font-size:11px}.corr-form input{padding:11px;border:1px solid var(--mol-border);border-radius:10px;background:#031019;color:#fff;font:inherit}.corr-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.corr-error{min-height:1.2em;color:#ff9aa4}.corr-admin-note{padding:13px;border:1px solid rgba(255,82,97,.28);border-radius:10px;background:rgba(255,82,97,.07);color:#ffb2ba!important}
    @media(max-width:900px){.corr-kpis{grid-template-columns:1fr 1fr}}@media(max-width:640px){.corr-head{display:block}.corr-live{margin-top:10px}.corr-kpis{grid-template-columns:1fr}.corr-detail-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);

  view.innerHTML = `
    <div class="corr-page">
      <header class="corr-head"><div><p class="mol-kicker">Kontrola danych V3</p><h1>Korekty</h1><small>Jedna kolejka błędów czasu pracy i sesji procesów. Bez automatycznego zgadywania godzin.</small></div><div class="corr-live"><i></i><span>n8n-estyl-team · V3</span></div></header>
      <div class="corr-toolbar">
        <label>Od<input type="date" data-corr-from value="${monthStart()}"></label>
        <label>Do<input type="date" data-corr-to value="${today()}"></label>
        <label>Status<select data-corr-status><option value="PENDING">Do korekty</option><option value="RESOLVED">Historia</option><option value="REQUIRES_ADMIN">Wymaga admina</option><option value="ALL">Wszystkie</option></select></label>
        <label>Rodzaj<select data-corr-type><option value="ALL">Wszystkie</option><option value="ATTENDANCE">Czas pracy</option><option value="PROCESS">Procesy</option></select></label>
        <label>Szukaj<input type="search" data-corr-search placeholder="Nazwisko / MOL..." autocomplete="off"></label>
        <button class="mol-button mol-button--primary" type="button" data-corr-refresh>Odśwież</button>
      </div>
      <div class="corr-kpis">
        <article class="mol-card"><small>Do korekty</small><strong data-corr-pending>—</strong></article>
        <article class="mol-card"><small>Czas pracy</small><strong data-corr-attendance>—</strong></article>
        <article class="mol-card"><small>Procesy</small><strong data-corr-process>—</strong></article>
        <article class="mol-card"><small>Wymaga administratora</small><strong data-corr-admin>—</strong></article>
      </div>
      <section class="mol-card corr-card"><div class="corr-card-head"><div><h2>Kolejka korekt</h2><small data-corr-caption>Ładowanie…</small></div></div><div class="corr-table-wrap"><table class="corr-table"><thead><tr><th>Data</th><th>Pracownik</th><th>Rodzaj</th><th>Problem</th><th>Stan</th><th>Dane</th><th>Akcja</th></tr></thead><tbody data-corr-body><tr><td colspan="7" class="corr-empty">Ładowanie korekt…</td></tr></tbody></table></div></section>
    </div>`;

  const body = view.querySelector('[data-corr-body]');
  const caption = view.querySelector('[data-corr-caption]');
  const search = view.querySelector('[data-corr-search]');
  let lastData = {items:[], summary:{}};
  let loading = false;

  function statusClass(item) {
    if (item.status === 'REQUIRES_ADMIN') return 'admin';
    if (['PENDING','WAITING_ATTENDANCE'].includes(item.status)) return 'pending';
    return 'done';
  }
  function isPending(item) { return ['PENDING','WAITING_ATTENDANCE','REQUIRES_ADMIN'].includes(item.status); }
  function isActionable(item) { return item.action === 'ENTER_STOP' || item.action === 'ENTER_PROCESS_STOP'; }

  function marker(count) {
    let node = document.querySelector('[data-live-correction-pending]');
    if (!node) { node = document.createElement('span'); node.hidden = true; node.dataset.liveCorrectionPending = 'true'; document.body.append(node); }
    node.dataset.count = String(count ?? 0);
    const teamStats = document.querySelectorAll('[data-view="team"] .kpis article strong');
    if (teamStats[4]) teamStats[4].textContent = String(count ?? 0);
  }

  function render(data) {
    lastData = data || {items:[],summary:{}};
    const items = Array.isArray(lastData.items) ? lastData.items : [];
    const summary = lastData.summary || {};
    view.querySelector('[data-corr-pending]').textContent = String(summary.pending_count ?? 0);
    view.querySelector('[data-corr-attendance]').textContent = String(summary.attendance_count ?? 0);
    view.querySelector('[data-corr-process]').textContent = String(summary.process_count ?? 0);
    view.querySelector('[data-corr-admin]').textContent = String(summary.requires_admin_count ?? 0);
    marker(summary.pending_count ?? 0);
    caption.textContent = `${items.length} pozycji · zakres ${localDate(lastData.date_from)} – ${localDate(lastData.date_to)} · odświeżono ${new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}`;
    const query = String(search.value || '').trim().toLocaleLowerCase('pl');
    const filtered = query ? items.filter((item) => `${item.display_name} ${item.employee_id} ${item.issue_label} ${item.issue_code} ${item.process_code || ''}`.toLocaleLowerCase('pl').includes(query)) : items;
    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="7" class="corr-empty">Brak korekt dla wybranych filtrów.</td></tr>';
      return;
    }
    body.innerHTML = filtered.map((item, index) => {
      const type = item.type === 'ATTENDANCE' ? 'CZAS PRACY' : 'PROCES';
      const data = item.type === 'ATTENDANCE'
        ? `START ${localTime(item.start_at)} · STOP ${localTime(item.stop_at)}`
        : `${esc(processName(item.process_code))}<small>START ${localTime(item.start_at)} · STOP ${localTime(item.stop_at)} · STOP pracy ${localTime(item.attendance_stop_at)}</small>`;
      const action = isActionable(item) ? '<button class="corr-action" type="button" data-corr-open>Popraw</button>' : item.status === 'REQUIRES_ADMIN' ? '<span class="corr-status admin">ADMIN</span>' : item.status === 'WAITING_ATTENDANCE' ? '<span class="corr-status pending">CZEKA NA STOP PRACY</span>' : '—';
      return `<tr data-corr-index="${index}" data-pending="${isPending(item)}" data-admin="${item.status==='REQUIRES_ADMIN'}" data-actionable="${isActionable(item)}"><td><b>${localDate(item.work_date)}</b></td><td><b>${esc(item.display_name)}</b><small>${esc(item.employee_id)}</small></td><td><span class="corr-type">${type}</span>${item.process_code?`<small>${esc(item.process_code)}</small>`:''}</td><td><b>${esc(item.issue_label || LABEL[item.issue_code] || item.issue_code)}</b><small>${esc(item.issue_code)}</small></td><td><span class="corr-status ${statusClass(item)}">${esc(STATUS[item.status] || item.status)}</span></td><td>${data}</td><td>${action}</td></tr>`;
    }).join('');
  }

  async function refresh() {
    if (loading) return lastData;
    loading = true;
    const button = view.querySelector('[data-corr-refresh]');
    if (button) button.disabled = true;
    caption.textContent = 'Pobieranie aktualnej kolejki z backendu V3…';
    try {
      const data = await api.read('mol-app-v3-corrections', {
        date_from: view.querySelector('[data-corr-from]').value,
        date_to: view.querySelector('[data-corr-to]').value,
        status: view.querySelector('[data-corr-status]').value,
        type: view.querySelector('[data-corr-type]').value,
      });
      render(data);
      return data;
    } catch (error) {
      caption.textContent = error?.message || 'Nie udało się pobrać korekt.';
      body.innerHTML = `<tr><td colspan="7" class="corr-empty">${esc(error?.message || 'Błąd pobierania korekt.')}</td></tr>`;
      throw error;
    } finally {
      loading = false;
      if (button) button.disabled = false;
    }
  }

  function openModal(item) {
    const backdrop = document.createElement('div');
    backdrop.className = 'corr-modal-backdrop';
    const actionable = isActionable(item);
    const suggested = inputTime(item.suggested_stop_at || item.stop_at);
    const isAttendance = item.action === 'ENTER_STOP';
    const form = actionable ? `<div class="corr-form"><label>Poprawna godzina STOP<input type="time" step="60" data-corr-stop value="${esc(suggested)}" required></label><label>Powód korekty<input type="text" maxlength="200" data-corr-reason value="${isAttendance?'Brak STOP w danych historycznych':'Korekta STOP procesu'}"></label><div class="corr-error" data-corr-error></div></div>` : '';
    const admin = item.status === 'REQUIRES_ADMIN' ? '<p class="corr-admin-note">Ten błąd nie może być bezpiecznie naprawiony automatyczną korektą. Wymaga weryfikacji danych źródłowych przez administratora.</p>' : item.status === 'WAITING_ATTENDANCE' ? '<p class="corr-admin-note">Najpierw uzupełnij brakujący STOP dnia pracy. Po jego zatwierdzeniu korekta procesu stanie się dostępna.</p>' : '';
    const audit = item.corrected_at ? `<p><strong>Audyt:</strong> ${esc(item.corrected_by || '—')} · ${esc(localDateTime(item.corrected_at))} · ${esc(item.reason || 'bez opisu')}</p>` : '';
    backdrop.innerHTML = `<section class="corr-modal" role="dialog" aria-modal="true"><p class="mol-kicker">${item.type==='ATTENDANCE'?'Czas pracy':'Proces'}</p><h2>${esc(item.issue_label || LABEL[item.issue_code] || item.issue_code)}</h2><p>${esc(item.display_name)} · ${esc(item.employee_id)} · ${localDate(item.work_date)}</p><div class="corr-detail-grid"><span><small>START</small><strong>${localTime(item.start_at)}</strong></span><span><small>STOP obecny</small><strong>${localTime(item.stop_at)}</strong></span>${item.type==='PROCESS'?`<span><small>Proces</small><strong>${esc(processName(item.process_code))}</strong></span><span><small>STOP dnia pracy</small><strong>${localTime(item.attendance_stop_at)}</strong></span>`:''}<span><small>Status</small><strong>${esc(STATUS[item.status]||item.status)}</strong></span><span><small>Źródło</small><strong>${esc(item.source||'V3')}</strong></span></div>${admin}${audit}${form}<div class="corr-modal-actions"><button class="mol-button" type="button" data-corr-cancel>Zamknij</button>${actionable?'<button class="mol-button mol-button--primary" type="button" data-corr-save>Zatwierdź korektę</button>':''}</div></section>`;
    document.body.append(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('[data-corr-cancel]')?.addEventListener('click', close);
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
    backdrop.querySelector('[data-corr-save]')?.addEventListener('click', async () => {
      const stop = backdrop.querySelector('[data-corr-stop]')?.value || '';
      const reason = backdrop.querySelector('[data-corr-reason]')?.value.trim() || 'MANUAL_CORRECTION';
      const errorNode = backdrop.querySelector('[data-corr-error]');
      const save = backdrop.querySelector('[data-corr-save]');
      if (!/^\d{2}:\d{2}$/.test(stop)) { errorNode.textContent = 'Wpisz poprawną godzinę STOP.'; return; }
      save.disabled = true;
      errorNode.textContent = 'Zapisywanie korekty…';
      try {
        if (isAttendance) {
          await api.write('mol-app-v3-attendance-correction', {request_id:api.requestId(), employee_id:item.employee_id, work_date:item.work_date, stop_time:stop, reason});
        } else {
          await api.write('mol-app-v3-process-correction', {request_id:api.requestId(), process_session_id:item.process_session_id, stop_time:stop, reason});
        }
        close();
        await refresh();
      } catch (error) {
        errorNode.textContent = error?.message || 'Nie udało się zapisać korekty.';
        save.disabled = false;
      }
    });
    backdrop.querySelector('[data-corr-stop]')?.focus();
  }

  body.addEventListener('click', (event) => {
    const row = event.target.closest('[data-corr-index]');
    if (!row) return;
    const item = (String(search.value || '').trim() ? null : lastData.items?.[Number(row.dataset.corrIndex)]);
    if (item) openModal(item);
    else {
      const key = row.querySelector('td:nth-child(2) small')?.textContent;
      const issue = row.querySelector('td:nth-child(4) small')?.textContent;
      const found = lastData.items?.find((x) => x.employee_id === key && x.issue_code === issue && localDate(x.work_date) === row.cells[0]?.textContent.trim());
      if (found) openModal(found);
    }
  });

  view.querySelector('[data-corr-refresh]')?.addEventListener('click', () => refresh().catch(() => {}));
  view.querySelector('[data-corr-status]')?.addEventListener('change', () => refresh().catch(() => {}));
  view.querySelector('[data-corr-type]')?.addEventListener('change', () => refresh().catch(() => {}));
  view.querySelector('[data-corr-from]')?.addEventListener('change', () => refresh().catch(() => {}));
  view.querySelector('[data-corr-to]')?.addEventListener('change', () => refresh().catch(() => {}));
  search?.addEventListener('input', () => render(lastData));
  document.querySelector('.sidebar [data-section="corrections"]')?.addEventListener('click', () => refresh().catch(() => {}));

  window.MOLCorrections = Object.freeze({refresh});

  const boot = async () => {
    const started = Date.now();
    while (document.documentElement.dataset.liveReadsReady !== 'true' && Date.now() - started < 12000) await new Promise((resolve) => setTimeout(resolve, 80));
    await refresh();
    setInterval(() => { if (!view.hidden && document.visibilityState === 'visible') refresh().catch(() => {}); }, 60000);
  };
  boot().catch((error) => console.error('MOL V3 corrections:', error));
})();
