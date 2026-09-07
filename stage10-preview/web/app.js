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

  const sectionButtons = [...document.querySelectorAll('[data-section]')];
  const views = [...document.querySelectorAll('[data-view]')];

  const showSection = (section) => {
    document.querySelectorAll('.sidebar [data-section]').forEach((button) => button.classList.toggle('is-active', button.dataset.section === section));
    views.forEach((view) => { view.hidden = view.dataset.view !== section; view.classList.toggle('is-active', view.dataset.view === section); });
  };

  sectionButtons.forEach((button) => button.addEventListener('click', () => showSection(button.dataset.section)));

  const rows = [...document.querySelectorAll('#teamRows tr')];
  const employeeName = document.getElementById('employeeName');
  const employeeId = document.getElementById('employeeId');
  const employeeStatus = document.getElementById('employeeStatus');
  const employeeAttendance = document.getElementById('employeeAttendance');
  const employeeNoProcess = document.getElementById('employeeNoProcess');
  const employeeNorm = document.getElementById('employeeNorm');
  const employeeProcess = document.getElementById('employeeProcess');

  const selectEmployee = (row) => {
    rows.forEach((candidate) => candidate.classList.toggle('is-selected', candidate === row));
    employeeName.textContent = row.dataset.employee;
    employeeId.textContent = row.dataset.id;
    employeeStatus.textContent = row.dataset.status;
    employeeAttendance.textContent = row.dataset.attendance;
    employeeNoProcess.textContent = row.dataset.noProcess;
    employeeNorm.textContent = `${row.dataset.norm}%`;
    employeeProcess.textContent = row.dataset.process;
    employeeStatus.className = 'mol-chip ' + (row.dataset.status === 'W PRACY' ? 'mol-chip--success' : row.dataset.status === 'PRZERWA' ? 'mol-chip--warning' : 'mol-chip--danger');
  };

  rows.forEach((row) => row.addEventListener('click', () => selectEmployee(row)));

  const detailsScript = document.createElement('script');
  detailsScript.src = './details.js';
  document.body.append(detailsScript);

  showSection('team');
})();
