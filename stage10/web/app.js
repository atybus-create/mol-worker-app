(() => {
  const shell = document.querySelector('.web-shell');
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || 'LEADER');
  const capabilities = window.MOLRoles.get(role);

  if (!capabilities?.web) {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#050b12;color:#f4f8fb;font-family:Inter,system-ui,sans-serif">
        <section style="max-width:620px;padding:28px;border:1px solid rgba(81,178,220,.26);border-radius:18px;background:#091c2b">
          <p style="color:#12c8ff;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:800">MOL App V2</p>
          <h1>Panel WWW niedostępny dla WORKER</h1>
          <p style="color:#9fb6c9;line-height:1.6">Pracownicy korzystają wyłącznie z aplikacji mobilnej. Panel WWW jest przeznaczony dla ról LEADER i ADMIN.</p>
        </section>
      </main>`;
    return;
  }

  const stateScript = document.createElement('script');
  stateScript.src = '../shared/states.js';
  document.body.append(stateScript);

  const detailsStyles = document.createElement('link');
  detailsStyles.rel = 'stylesheet';
  detailsStyles.href = './details.css';
  document.head.append(detailsStyles);

  shell.dataset.role = role;
  document.querySelector('.profile small').textContent = role === 'ADMIN' ? 'Administrator' : 'Lider zespołu';

  const sidebarNav = document.querySelector('.sidebar nav');
  const performanceButton = sidebarNav?.querySelector('[data-section="reports"]');
  if (performanceButton) {
    const label = performanceButton.querySelector('span');
    if (label) label.textContent = 'Wydajność';
    const worktimeButton = document.createElement('button');
    worktimeButton.type = 'button';
    worktimeButton.dataset.section = 'worktime';
    worktimeButton.innerHTML = '◷ <span>Czas pracy</span>';
    performanceButton.after(worktimeButton);
  }

  const performanceView = document.querySelector('[data-view="reports"]');
  if (performanceView && !document.querySelector('[data-view="worktime"]')) {
    const worktimeView = document.createElement('section');
    worktimeView.className = 'view';
    worktimeView.dataset.view = 'worktime';
    worktimeView.hidden = true;
    performanceView.after(worktimeView);
  }

  const sectionButtons = [...document.querySelectorAll('[data-section]')];
  const views = [...document.querySelectorAll('[data-view]')];

  const showSection = (section) => {
    document.querySelectorAll('.sidebar [data-section]').forEach((button) => button.classList.toggle('is-active', button.dataset.section === section));
    views.forEach((view) => { view.hidden = view.dataset.view !== section; view.classList.toggle('is-active', view.dataset.view === section); });
  };

  sectionButtons.forEach((button) => button.addEventListener('click', () => showSection(button.dataset.section)));

  const rows = [...document.querySelectorAll('#teamRows tr')];
  const toMinutes = (value) => {
    const [hours, minutes] = String(value || '00:00').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const fromMinutes = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const roundUnits = (value) => Math.round(value * 10) / 10;
  const normPercent = (eligible, minutes, unitsPerHour) => minutes > 0 ? Math.round((eligible / ((minutes / 60) * unitsPerHour)) * 100) : null;
  const keyFor = (prefix, field) => prefix ? `${prefix}${field.charAt(0).toUpperCase()}${field.slice(1)}` : field;

  const normalizePeriod = (row, prefix = '') => {
    const key = (field) => keyFor(prefix, field);
    const pickTotal = Number(row.dataset[key('pickTotal')] || 0);
    const pickEligible = Number(row.dataset[key('pickEligible')] || 0);
    const pickOutside = Number(row.dataset[key('pickOutside')] || 0);
    const packTotal = Number(row.dataset[key('packTotal')] || 0);
    const packEligible = Number(row.dataset[key('packEligible')] || 0);
    const packOutside = Number(row.dataset[key('packOutside')] || 0);
    const pickMinutes = toMinutes(row.dataset[key('pickTime')]);
    const packMinutes = toMinutes(row.dataset[key('packTime')]);
    const totalMinutes = pickMinutes + packMinutes;
    const total = roundUnits(packTotal + pickTotal / 3);
    const totalEligible = roundUnits(packEligible + pickEligible / 3);
    const totalOutside = roundUnits(packOutside + pickOutside / 3);
    const pickNorm = normPercent(pickEligible, pickMinutes, 210);
    const packNorm = normPercent(packEligible, packMinutes, 70);
    const totalNorm = normPercent(totalEligible, totalMinutes, 70);

    row.dataset[key('pickNorm')] = pickNorm === null ? '' : String(pickNorm);
    row.dataset[key('packNorm')] = packNorm === null ? '' : String(packNorm);
    row.dataset[key('total')] = String(total);
    row.dataset[key('totalEligible')] = String(totalEligible);
    row.dataset[key('totalOutside')] = String(totalOutside);
    row.dataset[key('totalTime')] = fromMinutes(totalMinutes);
    row.dataset[key('totalNorm')] = totalNorm === null ? '' : String(totalNorm);
  };

  rows.forEach((row) => {
    normalizePeriod(row);
    normalizePeriod(row, 'month');
    if (row.cells.length >= 8) {
      const total = row.dataset.total;
      const eligible = row.dataset.totalEligible;
      const outside = row.dataset.totalOutside;
      const norm = row.dataset.totalNorm;
      row.cells[6].innerHTML = `<strong>Łącznie ${total} j.n.</strong><small>Do normy ${eligible} j.n.</small><small>Poza normą ${outside} j.n.</small>`;
      row.cells[7].textContent = norm ? `${norm}%` : '—';
      row.cells[7].className = !norm ? 'muted' : Number(norm) >= 90 ? 'good' : 'warn';
    }
  });

  const employeeName = document.getElementById('employeeName');
  const employeeId = document.getElementById('employeeId');
  const employeeStatus = document.getElementById('employeeStatus');
  const employeeAttendance = document.getElementById('employeeAttendance');
  const employeeNoProcess = document.getElementById('employeeNoProcess');
  const employeeProcess = document.getElementById('employeeProcess');

  const performanceFields = [...document.querySelectorAll('[data-performance-field]')];
  const unitFields = new Set(['total', 'totalEligible', 'totalOutside', 'monthTotal', 'monthTotalEligible', 'monthTotalOutside']);
  const formatPerformance = (field, value) => {
    if (field.toLowerCase().endsWith('norm')) return value === '' || value == null ? '—' : `${value}%`;
    if (unitFields.has(field)) return `${value} j.n.`;
    return value ?? '—';
  };

  const selectEmployee = (row) => {
    rows.forEach((candidate) => candidate.classList.toggle('is-selected', candidate === row));
    employeeName.textContent = row.dataset.employee;
    employeeId.textContent = row.dataset.id;
    employeeStatus.textContent = row.dataset.status;
    employeeAttendance.textContent = row.dataset.attendance;
    employeeNoProcess.textContent = row.dataset.noProcess;
    employeeProcess.textContent = row.dataset.process;
    performanceFields.forEach((fieldNode) => {
      const field = fieldNode.dataset.performanceField;
      fieldNode.textContent = formatPerformance(field, row.dataset[field] ?? '—');
    });
    employeeStatus.className = 'mol-chip ' + (row.dataset.status === 'W PRACY' ? 'mol-chip--success' : row.dataset.status === 'PRZERWA' ? 'mol-chip--warning' : 'mol-chip--danger');
  };

  rows.forEach((row) => row.addEventListener('click', () => selectEmployee(row)));
  const initialRow = rows.find((row) => row.classList.contains('is-selected')) || rows[0];
  if (initialRow) selectEmployee(initialRow);

  const detailsScript = document.createElement('script');
  detailsScript.src = './details.js';
  document.body.append(detailsScript);

  const worktimeScript = document.createElement('script');
  worktimeScript.src = './worktime.js';
  document.body.append(worktimeScript);

  showSection('team');
})();
