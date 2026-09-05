const HEALTH_URL = 'https://n8n.estyl.team/webhook/mol-app-v2-health';

const byId = id => document.getElementById(id);

async function checkHealth() {
  const button = byId('retryButton');
  const chip = byId('statusChip');
  button.disabled = true;
  chip.className = 'status-chip is-loading';
  chip.textContent = 'SPRAWDZANIE';

  try {
    const response = await fetch(`${HEALTH_URL}?check=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const health = await response.json();
    if (health.ok !== true || health.service !== 'MOL_APP_V2') {
      throw new Error('Nieprawidłowa odpowiedź usługi');
    }

    byId('statusTitle').textContent = 'Backend V2 działa poprawnie';
    byId('statusDescription').textContent = 'Oddzielny endpoint testowy odpowiedział prawidłowo. V1 nie została użyta.';
    byId('backendVersion').textContent = health.version || '0.1.0';
    byId('writesState').textContent = health.writes_enabled ? 'WŁĄCZONE' : 'WYŁĄCZONE';
    chip.className = 'status-chip is-ok';
    chip.textContent = 'ONLINE';
  } catch (error) {
    byId('statusTitle').textContent = 'Backend V2 jest niedostępny';
    byId('statusDescription').textContent = `Test połączenia nie przeszedł: ${error.message}`;
    chip.className = 'status-chip is-error';
    chip.textContent = 'BŁĄD';
  } finally {
    button.disabled = false;
  }
}

byId('retryButton').addEventListener('click', checkHealth);
checkHealth();
