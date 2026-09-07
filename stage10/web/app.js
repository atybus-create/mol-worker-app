(() => {
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

  showSection('team');
})();
