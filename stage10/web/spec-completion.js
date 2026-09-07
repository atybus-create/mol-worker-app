(() => {
  const shell = document.querySelector('.web-shell');
  if (!shell) return;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = './spec-completion.css';
  document.head.append(css);

  const rows = [...document.querySelectorAll('#teamRows tr')];
  const table = document.getElementById('teamRows')?.closest('table');
  const head = table?.querySelector('thead tr');
  const demoStart = ['06:04', '06:12', '06:18', '—', '05:58', '06:09', '06:21', '06:15'];
  const demoProcess = ['02:05', '03:07', '00:18', '00:00', '01:42', '01:11', '00:47', '02:33'];

  if (head && !head.querySelector('[data-required-leader-column]')) {
    ['START', 'Aktywność aplikacji', 'Czas procesu', 'Międzyprocesowy', 'Mapowanie ES'].forEach((label) => {
      const th = document.createElement('th');
      th.dataset.requiredLeaderColumn = label;
      th.textContent = label;
      head.append(th);
    });

    rows.forEach((row, index) => {
      const notStarted = row.dataset.status === 'BRAK STARTU';
      const appActive = !notStarted && index % 3 !== 2;
      const esMissing = row.dataset.id === 'MOL033';
      row.dataset.startAtDemo = notStarted ? '—' : (demoStart[index] || '06:10');
      row.dataset.appActivityDemo = appActive ? 'AKTYWNA' : 'BRAK AKTYWNEJ APLIKACJI';
      row.dataset.processTimeDemo = notStarted ? '00:00' : (demoProcess[index] || '00:32');
      row.dataset.esMappingDemo = esMissing ? 'BRAK MAPOWANIA' : 'OK';

      const cells = [
        `<td><strong>${row.dataset.startAtDemo}</strong></td>`,
        `<td><span class="${appActive ? 'team-app-active' : 'team-app-inactive'}">${row.dataset.appActivityDemo}</span></td>`,
        `<td><strong>${row.dataset.processTimeDemo}</strong></td>`,
        `<td><strong>${row.dataset.noProcess || '00:00'}</strong></td>`,
        `<td><span class="${esMissing ? 'team-es-error' : 'team-es-ok'}">${row.dataset.esMappingDemo}</span></td>`
      ];
      row.insertAdjacentHTML('beforeend', cells.join(''));
    });
  }

  const employeeName = document.getElementById('employeeName');
  const employeeCard = employeeName?.closest('.mol-card');
  let detail = document.querySelector('[data-employee-required-detail]');
  if (employeeCard && !detail) {
    detail = document.createElement('section');
    detail.className = 'mol-card employee-required-detail';
    detail.dataset.employeeRequiredDetail = 'true';
    employeeCard.after(detail);
  }

  const renderDetail = (row) => {
    if (!detail || !row) return;
    const alertCell = row.cells[8]?.textContent?.trim() || '—';
    detail.innerHTML = `
      <h3>Pełny podgląd operacyjny pracownika</h3>
      <div class="employee-required-grid">
        <span><small>START</small><strong>${row.dataset.startAtDemo || '—'}</strong></span>
        <span><small>Czas pracy</small><strong>${row.dataset.attendance || '00:00'}</strong></span>
        <span><small>Aktywność aplikacji</small><strong>${row.dataset.appActivityDemo || '—'}</strong></span>
        <span><small>Czas bieżącego procesu</small><strong>${row.dataset.processTimeDemo || '00:00'}</strong></span>
        <span><small>Czas międzyprocesowy</small><strong>${row.dataset.noProcess || '00:00'}</strong></span>
        <span><small>Mapowanie ES</small><strong>${row.dataset.esMappingDemo || '—'}</strong></span>
        <span><small>Aktywne alerty</small><strong>${alertCell}</strong></span>
        <span><small>Proces</small><strong>${row.dataset.process || 'BRAK PROCESU'}</strong></span>
        <span><small>Świeżość norm</small><strong class="freshness-fresh">FRESH</strong></span>
        <span><small>Stan dnia</small><strong>${row.dataset.status === 'BRAK STARTU' ? 'NOT_STARTED' : 'OPEN'}</strong></span>
      </div>
      <div class="employee-event-history">
        <h3>Historia zdarzeń osoby</h3>
        <div><b>Dzisiaj ${row.dataset.startAtDemo || '—'}</b><span>WORK_STARTED</span><small>Data Tables</small></div>
        <div><b>Dzisiaj 08:55</b><span>PROCESS_CHANGED · ${row.dataset.process || 'BRAK PROCESU'}</span><small>PROCESS_SESSIONS</small></div>
        <div><b>06.09.2026 15:01</b><span>WORK_FINISHED</span><small>WORK_EVENTS</small></div>
        <div><b>05.09.2026 09:22</b><span>ATTENDANCE_CORRECTION</span><small>historia korekt</small></div>
      </div>
      <p class="backend-gap-note">W Etapie 10 to komplet powierzchni UI. W Etapie 11 pola aktywności aplikacji, alertów, mapowania ES oraz pełna historia WORK_EVENTS/korekt muszą zostać zwrócone przez API — frontend nie będzie ich zgadywał.</p>`;
  };

  rows.forEach((row) => row.addEventListener('click', () => renderDetail(row)));
  renderDetail(rows.find((row) => row.classList.contains('is-selected')) || rows[0]);
})();
