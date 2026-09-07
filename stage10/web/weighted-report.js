(() => {
  const waitForReport = () => {
    const reports = document.querySelector('[data-view="reports"]');
    const generate = reports?.querySelector('[data-report-generate]');
    if (!reports || !generate) {
      setTimeout(waitForReport, 25);
      return;
    }

    const toMinutes = (value) => {
      const [hours, minutes] = String(value || '00:00').split(':').map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    };
    const percent = (eligible, minutes, rate) => minutes > 0
      ? Math.round((eligible / ((minutes / 60) * rate)) * 100)
      : null;
    const writePercent = (selector, value) => {
      const node = reports.querySelector(selector);
      if (node) node.textContent = value === null ? '—' : `${value}%`;
    };

    const recalculate = () => {
      const selectedIds = new Set([...reports.querySelectorAll('.report-people-grid input:checked')].map((input) => input.value));
      const rows = [...document.querySelectorAll('#teamRows tr')].filter((row) => selectedIds.has(row.dataset.id));
      const pickEligible = rows.reduce((sum, row) => sum + Number(row.dataset.monthPickEligible || 0), 0);
      const packEligible = rows.reduce((sum, row) => sum + Number(row.dataset.monthPackEligible || 0), 0);
      const pickMinutes = rows.reduce((sum, row) => sum + toMinutes(row.dataset.monthPickTime), 0);
      const packMinutes = rows.reduce((sum, row) => sum + toMinutes(row.dataset.monthPackTime), 0);
      const combinedEligible = packEligible + pickEligible / 3;
      const combinedMinutes = pickMinutes + packMinutes;

      writePercent('[data-report-pick-norm]', percent(pickEligible, pickMinutes, 210));
      writePercent('[data-report-pack-norm]', percent(packEligible, packMinutes, 70));
      writePercent('[data-report-total-norm]', percent(combinedEligible, combinedMinutes, 70));

      const totalCard = reports.querySelector('.report-process-card.is-total h2');
      if (totalCard) totalCard.textContent = 'PICK/PAK · wynik ważony grupy';
      reports.dataset.aggregateMethod = 'weighted-numerator-denominator';
    };

    generate.addEventListener('click', () => setTimeout(recalculate, 0));
    reports.querySelectorAll('.report-people-grid input').forEach((input) => input.addEventListener('change', () => setTimeout(recalculate, 0)));
    reports.querySelector('[data-report-all]')?.addEventListener('click', () => setTimeout(recalculate, 0));
    reports.querySelector('[data-report-clear]')?.addEventListener('click', () => setTimeout(recalculate, 0));
    recalculate();
  };

  waitForReport();
})();
