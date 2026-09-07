(() => {
  const waitForReport = () => {
    const report = document.querySelector('[data-panel="manager-reports"]');
    const generate = report?.querySelector('[data-mobile-report-generate]');
    if (!report || !generate) {
      setTimeout(waitForReport, 25);
      return;
    }

    const toMinutes = (value) => {
      const [hours, minutes] = String(value || '00:00').split(':').map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    };

    const parseMetric = (article, label) => {
      const block = [...article.querySelectorAll('.mobile-norm-grid span')]
        .find((node) => node.querySelector('small')?.textContent.trim() === label);
      if (!block) return null;
      const eligibleText = block.querySelector('em')?.textContent || '';
      const strongText = block.querySelector('strong')?.textContent || '';
      const eligible = Number((eligibleText.match(/Do normy\s+([0-9.]+)/) || [])[1] || 0);
      const time = (strongText.match(/Czas\s+([0-9]{2}:[0-9]{2})/) || [])[1] || '00:00';
      return { eligible, minutes: toMinutes(time) };
    };

    const recalculate = () => {
      const articles = [...report.querySelectorAll('.mobile-norm-report')];
      let pickEligible = 0;
      let packEligible = 0;
      let pickMinutes = 0;
      let packMinutes = 0;
      articles.forEach((article) => {
        const pick = parseMetric(article, 'PICK');
        const pack = parseMetric(article, 'PAK');
        if (pick) { pickEligible += pick.eligible; pickMinutes += pick.minutes; }
        if (pack) { packEligible += pack.eligible; packMinutes += pack.minutes; }
      });
      const combinedEligible = packEligible + pickEligible / 3;
      const combinedMinutes = pickMinutes + packMinutes;
      const weighted = combinedMinutes > 0 ? Math.round((combinedEligible / ((combinedMinutes / 60) * 70)) * 100) : null;
      const node = report.querySelector('[data-mobile-report-norm]');
      if (node) node.textContent = weighted === null ? '—' : `${weighted}%`;
      const label = node?.parentElement?.querySelector('small');
      if (label) label.textContent = 'PICK/PAK grupy · ważone';
      report.dataset.aggregateMethod = 'weighted-numerator-denominator';
    };

    generate.addEventListener('click', () => setTimeout(recalculate, 0));
    report.querySelectorAll('.mobile-report-people input').forEach((input) => input.addEventListener('change', () => setTimeout(recalculate, 0)));
    report.querySelector('[data-mobile-report-all]')?.addEventListener('click', () => setTimeout(recalculate, 0));
    report.querySelector('[data-mobile-report-clear]')?.addEventListener('click', () => setTimeout(recalculate, 0));
    setTimeout(recalculate, 0);
  };

  waitForReport();
})();
