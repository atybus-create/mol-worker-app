(() => {
  'use strict';
  const api = window.MOLApi;
  if (!api) return;
  const BUILD = '20260911.9';
  let timer = null;
  let lastDailyVersion = 0;
  let lastMonthlyVersion = 0;

  const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const qty = (v) => String(Math.round(num(v)));
  const pct = (v) => v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(1)}%`;
  const minutes = (v) => {
    const total = Math.max(0, Math.round(num(v)));
    const h = Math.floor(total / 60), m = total % 60;
    return h ? `${h} h ${String(m).padStart(2,'0')} min` : `${m} min`;
  };
  const hhmm = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pl-PL', { timeZone:'Europe/Warsaw', hour:'2-digit', minute:'2-digit' });
  };

  function setMetric(section, values) {
    const nodes = section?.querySelectorAll('.performance-metrics b') || [];
    values.forEach((value, index) => { if (nodes[index]) nodes[index].textContent = value; });
  }

  function stateLabel(data) {
    const s = data?.source?.performance_state || {};
    if (s.mapping_ok === false) return 'Brak mapowania operatora ES';
    if (s.freshness === 'FRESH') return `EasyStorage · świeże ${hhmm(s.last_success_at)}`;
    if (s.freshness === 'STALE') return `EasyStorage · STALE · ostatnio ${hhmm(s.last_success_at)}`;
    return `EasyStorage · UNAVAILABLE · ostatnio ${hhmm(s.last_success_at)}`;
  }

  function renderDrawer(period, data) {
    const drawer = document.querySelector(`[data-norm-period="${period}"]`);
    if (!drawer || !data) return;
    const summarySmall = drawer.querySelector('summary small');
    const summaryValue = drawer.querySelector('summary > b');
    const heading = drawer.querySelector('.performance-period h3');
    const sections = drawer.querySelectorAll('.performance-breakdown');
    const label = period === 'today' ? (data.date || 'Dzisiaj') : (data.month || 'Bieżący miesiąc');
    if (summarySmall) summarySmall.textContent = period === 'today' ? stateLabel(data) : `${data.days_count || 0} dni · wynik ważony`;
    if (summaryValue) summaryValue.textContent = pct(data.combined?.norm_pct);
    if (heading) heading.textContent = label;
    setMetric(sections[0], [qty(data.pak?.total), qty(data.pak?.eligible), qty(data.pak?.outside), minutes(data.pak?.minutes), pct(data.pak?.norm_pct)]);
    setMetric(sections[1], [qty(data.pick?.total), qty(data.pick?.eligible), qty(data.pick?.outside), minutes(data.pick?.minutes), pct(data.pick?.norm_pct)]);
    setMetric(sections[2], [qty(data.combined?.total_units), qty(data.combined?.eligible_units), qty(data.combined?.outside_units), minutes(data.combined?.minutes), pct(data.combined?.norm_pct)]);
  }

  function renderTop(data) {
    const kpis = document.querySelectorAll('.kpi-grid article strong');
    if (kpis[2]) kpis[2].textContent = pct(data?.combined?.norm_pct);
    const progress = document.querySelector('.kpi-grid .progress i');
    if (progress) progress.style.width = `${Math.max(0, Math.min(100, num(data?.combined?.norm_pct)))}%`;
  }

  function renderActiveProcessExecution(data) {
    const host = document.querySelector('.active-process');
    if (!host || !data) return;
    const activeName = host.querySelector('h2')?.textContent?.toUpperCase() || '';
    const candidates = [...host.querySelectorAll('strong')].filter((node) => node !== host.querySelector('h2'));
    const valueNode = candidates.at(-1);
    if (!valueNode) return;
    if (activeName.includes('PAK')) valueNode.textContent = qty(data.pak?.eligible);
    else if (activeName.includes('KOMPLET')) valueNode.textContent = qty(data.pick?.eligible);
  }

  function setStageLabel(text) {
    const node = document.querySelector('.performance-block .section-title span');
    if (node) node.textContent = text;
  }

  async function refreshDaily() {
    const daily = await api.request('mol-app-v3-performance-daily', { timeoutMs: 20000 });
    const dv = num(daily?.snapshot_version);
    if (!lastDailyVersion || dv >= lastDailyVersion) {
      lastDailyVersion = dv;
      renderDrawer('today', daily);
      renderTop(daily);
      renderActiveProcessExecution(daily);
      setStageLabel(`${stateLabel(daily)} · V3 · build ${BUILD}`);
    }
  }

  async function refreshMonthly() {
    try {
      const monthly = await api.request('mol-app-v3-performance-monthly', { timeoutMs: 30000 });
      const mv = num(monthly?.snapshot_version);
      if (!lastMonthlyVersion || mv >= lastMonthlyVersion) {
        lastMonthlyVersion = mv;
        renderDrawer('month', monthly);
      }
    } catch (error) {
      console.warn('Etap 4 / monthly', error);
      const drawer = document.querySelector('[data-norm-period="month"] summary small');
      if (drawer) drawer.textContent = 'Błąd odświeżenia miesiąca';
    }
  }

  async function refresh() {
    try {
      await refreshDaily();
      refreshMonthly();
    } catch (error) {
      console.error('Etap 4 / daily', error);
      setStageLabel(`Błąd odświeżenia normy: ${error?.message || 'brak odpowiedzi backendu'}`);
    }
  }

  const start = () => {
    setStageLabel(`Ładowanie normy V3 · build ${BUILD}…`);
    refresh();
    if (timer) clearInterval(timer);
    timer = setInterval(refresh, 300000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('mol-v3-process-changed', refresh);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
