(() => {
  'use strict';

  const api = window.MOLApi;
  const view = document.querySelector('[data-view="audit"]');
  if (!api || !view) return;

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const when = (value) => value ? new Date(value).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' }) : '—';
  const clock = (value) => value ? new Date(value).toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDay = (value) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('pl-PL') : '—';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const daysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  };

  const CATEGORY_LABELS = {
    USER: 'Użytkownicy',
    ATTENDANCE: 'Czas pracy',
    PROCESS: 'Procesy',
    WORKTIME: 'Zmiany godzin',
    CORRECTION: 'Korekty',
    COMMUNICATION: 'Komunikaty',
  };

  let loadedOnce = false;
  let loading = false;
  let lastData = null;

  view.innerHTML = `
    <div class="page-title audit-title">
      <div><p class="mol-kicker">Kontrola zmian V3</p><h1>Historia operacji</h1><span>Rzeczywiste zdarzenia zapisane przez backend V3.</span></div>
      <button type="button" class="audit-refresh" data-audit-refresh>Odśwież</button>
    </div>
    <section class="mol-card audit-filters" aria-label="Filtry historii operacji">
      <label>Od <input type="date" data-audit-from></label>
      <label>Do <input type="date" data-audit-to></label>
      <label>Kategoria <select data-audit-category><option value="">Wszystkie</option></select></label>
      <label>Wykonał <select data-audit-actor><option value="">Wszyscy</option></select></label>
      <label>Dotyczy <select data-audit-employee><option value="">Wszyscy</option></select></label>
      <button type="button" data-audit-apply>Zastosuj filtry</button>
      <button type="button" class="audit-reset" data-audit-reset>Wyczyść</button>
    </section>
    <div class="audit-kpis">
      <article class="mol-card"><small>Wyniki</small><strong data-audit-count>—</strong></article>
      <article class="mol-card"><small>Użytkownicy</small><strong data-audit-user>—</strong></article>
      <article class="mol-card"><small>Czas / procesy</small><strong data-audit-work>—</strong></article>
      <article class="mol-card"><small>Korekty / zmiany</small><strong data-audit-corrections>—</strong></article>
      <article class="mol-card"><small>Komunikaty</small><strong data-audit-comm>—</strong></article>
    </div>
    <section class="mol-card audit-card">
      <div class="card-head"><div><h2>Dziennik operacji</h2><span data-audit-status>Nie pobrano danych.</span></div></div>
      <div class="table-wrap"><table class="audit-table"><thead><tr><th>Data</th><th>Wykonał</th><th>Dotyczy</th><th>Operacja</th><th>Status</th><th>Szczegóły</th></tr></thead><tbody data-audit-rows><tr><td colspan="6" class="report-empty">Otwórz Historię operacji, aby pobrać dane.</td></tr></tbody></table></div>
    </section>`;

  const $ = (selector) => view.querySelector(selector);
  $('[data-audit-from]').value = daysAgo(30);
  $('[data-audit-to]').value = today();

  function detailPairs(item) {
    const d = item?.details || {};
    const rows = [];
    const add = (label, value) => { if (value !== undefined && value !== null && value !== '') rows.push([label, value]); };
    switch (item.category) {
      case 'USER':
        add('Login', d.login); add('Rola', d.role);
        if (d.before_active !== null && d.before_active !== undefined) add('Aktywny przed', d.before_active ? 'tak' : 'nie');
        if (d.after_active !== null && d.after_active !== undefined) add('Aktywny po', d.after_active ? 'tak' : 'nie');
        break;
      case 'WORKTIME':
        add('Dzień', fmtDay(d.work_date)); add('START przed', clock(d.before_start_at)); add('STOP przed', clock(d.before_stop_at)); add('START po', clock(d.after_start_at)); add('STOP po', clock(d.after_stop_at)); add('Moniti', d.moniti_sync);
        break;
      case 'CORRECTION':
        add('Dzień', fmtDay(d.work_date)); add('Proces', d.process_code); add('STOP przed', clock(d.before_stop_at)); add('STOP po', clock(d.after_stop_at)); add('Powód', d.reason); add('Kod', d.issue_code);
        break;
      case 'COMMUNICATION':
        add('Odbiorcy', d.recipient_count); add('ID odbiorców', Array.isArray(d.recipient_ids) ? d.recipient_ids.join(', ') : '');
        break;
      case 'ATTENDANCE': {
        const before = d.before || {}, after = d.after || {};
        add('Dzień', fmtDay(after.work_date || before.work_date)); add('START przed', clock(before.start_at)); add('STOP przed', clock(before.stop_at)); add('START po', clock(after.start_at)); add('STOP po', clock(after.stop_at));
        break;
      }
      case 'PROCESS': {
        const before = d.before || {}, after = d.after || {};
        add('Proces przed', before.process_code); add('Proces po', after.process_code); add('START', clock(after.start_at || before.start_at)); add('STOP', clock(after.stop_at || before.stop_at));
        break;
      }
      default:
        Object.entries(d).slice(0, 8).forEach(([key, value]) => add(key, typeof value === 'object' ? JSON.stringify(value) : value));
    }
    add('Źródło', item.source); add('Request ID', item.request_id);
    return rows;
  }

  function renderDetails(item) {
    const pairs = detailPairs(item);
    if (!pairs.length) return '<span class="audit-muted">—</span>';
    return `<details class="audit-details"><summary>Pokaż</summary><dl>${pairs.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></details>`;
  }

  function render(data) {
    lastData = data;
    const items = Array.isArray(data?.items) ? data.items : [];
    const employees = Array.isArray(data?.employees) ? data.employees : [];
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const summary = data?.summary?.by_category || {};

    const category = $('[data-audit-category]');
    const currentCategory = category.value;
    category.innerHTML = '<option value="">Wszystkie</option>' + categories.map((code) => `<option value="${esc(code)}">${esc(CATEGORY_LABELS[code] || code)}</option>`).join('');
    category.value = currentCategory;

    const options = employees.slice().sort((a, b) => String(a.display_name).localeCompare(String(b.display_name), 'pl')).map((employee) => `<option value="${esc(employee.employee_id)}">${esc(employee.display_name)} · ${esc(employee.employee_id)}</option>`).join('');
    for (const selector of ['[data-audit-actor]', '[data-audit-employee]']) {
      const select = $(selector); const current = select.value;
      select.innerHTML = `<option value="">Wszyscy</option>${options}`;
      select.value = current;
    }

    $('[data-audit-count]').textContent = String(data?.returned ?? items.length);
    $('[data-audit-user]').textContent = String(summary.USER || 0);
    $('[data-audit-work]').textContent = String((summary.ATTENDANCE || 0) + (summary.PROCESS || 0));
    $('[data-audit-corrections]').textContent = String((summary.WORKTIME || 0) + (summary.CORRECTION || 0));
    $('[data-audit-comm]').textContent = String(summary.COMMUNICATION || 0);
    $('[data-audit-status]').textContent = data?.total > data?.returned ? `Pokazano ${data.returned} z ${data.total} rekordów.` : `${items.length} rekordów.`;

    const body = $('[data-audit-rows]');
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="6" class="report-empty">Brak operacji dla wybranych filtrów.</td></tr>';
      return;
    }
    body.innerHTML = items.map((item) => `
      <tr>
        <td><strong>${esc(when(item.occurred_at))}</strong><small>${esc(item.category || '—')}</small></td>
        <td><strong>${esc(item.actor_name || item.actor_id || '—')}</strong><small>${esc(item.actor_id || '')}</small></td>
        <td><strong>${esc(item.employee_name || item.employee_id || '—')}</strong><small>${esc(item.employee_id || '')}</small></td>
        <td><strong>${esc(item.label || item.action || '—')}</strong><small>${esc(item.action || '')}</small></td>
        <td><span class="audit-status">${esc(item.status || '—')}</span></td>
        <td>${renderDetails(item)}</td>
      </tr>`).join('');
  }

  function query() {
    return {
      date_from: $('[data-audit-from]').value,
      date_to: $('[data-audit-to]').value,
      category: $('[data-audit-category]').value,
      actor_id: $('[data-audit-actor]').value,
      employee_id: $('[data-audit-employee]').value,
      limit: 500,
    };
  }

  async function loadAudit() {
    if (loading) return;
    loading = true;
    $('[data-audit-status]').textContent = 'Pobieranie danych…';
    $('[data-audit-refresh]').disabled = true;
    $('[data-audit-apply]').disabled = true;
    try {
      const data = await api.read('mol-app-v3-audit', query());
      render(data || {});
      loadedOnce = true;
    } catch (error) {
      console.error(error);
      $('[data-audit-status]').textContent = error?.message || 'Nie udało się pobrać historii operacji.';
      $('[data-audit-rows]').innerHTML = `<tr><td colspan="6" class="report-empty">${esc(error?.message || 'Błąd pobierania danych audytu.')}</td></tr>`;
    } finally {
      loading = false;
      $('[data-audit-refresh]').disabled = false;
      $('[data-audit-apply]').disabled = false;
    }
  }

  $('[data-audit-refresh]').addEventListener('click', loadAudit);
  $('[data-audit-apply]').addEventListener('click', loadAudit);
  $('[data-audit-reset]').addEventListener('click', () => {
    $('[data-audit-from]').value = daysAgo(30);
    $('[data-audit-to]').value = today();
    $('[data-audit-category]').value = '';
    $('[data-audit-actor]').value = '';
    $('[data-audit-employee]').value = '';
    loadAudit();
  });

  const nav = document.querySelector('[data-section="audit"]');
  nav?.addEventListener('click', () => { if (!loadedOnce) loadAudit(); });
  window.MOLAudit = Object.freeze({ refresh: loadAudit, getData: () => lastData });
})();
