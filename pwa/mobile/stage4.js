(() => {
  'use strict';
  const api = window.MOLApi;
  if (!api) return;
  const BUILD = '20260911.7';
  let timer = null;

  const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const qty = (v) => String(Math.round(num(v)));
  const pct = (v) => v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(1)}%`;
  const minutes = (v) => {
    const total = Math.max(0, Math.round(num(v)));
    const h = Math.floor(total / 60), m = total % 60;
    return h ? `${h} h ${String(m).padStart(2,'0')} min` : `${m} min`;
  };

  function setMetric(section, values) {
    const nodes = section?.querySelectorAll('.performance-metrics b') || [];
    values.forEach((value, index) => { if (nodes[index]) nodes[index].textContent = value; });
  }

  function renderDrawer(period, data) {
    const drawer = document.querySelector(`[data-norm-period="${period}"]`);
    if (!drawer || !data) return;
    const summarySmall = drawer.querySelector('summary small');
    const summaryValue = drawer.querySelector('summary > b');
    const heading = drawer.querySelector('.performance-period h3');
    const sections = drawer.querySelectorAll('.performance-breakdown');
    const label = period === 'today' ? (data.date || 'Dzisiaj') : (data.month || 'Bieżący miesiąc');
    if (summarySmall) summarySmall.textContent = period === 'today' ? 'EasyStorage · LIVE' : `${data.days_count || 0} dni · wynik ważony`;
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

  function setStageLabel(text) {
    const node = document.querySelector('.performance-block .section-title span');
    if (node) node.textContent = text;
  }

  async function refresh() {
    try {
      const [daily, monthly] = await Promise.all([
        api.read('mol-app-v3-performance-daily'),
        api.read('mol-app-v3-performance-monthly')
      ]);
      renderDrawer('today', daily);
      renderDrawer('month', monthly);
      renderTop(daily);
      setStageLabel(`EasyStorage · V3 · build ${BUILD}`);
    } catch (error) {
      console.error('Etap 4 / performance', error);
      setStageLabel('Brak aktualnych danych wydajności');
    }
  }

  const start = () => {
    refresh();
    if (timer) clearInterval(timer);
    timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
