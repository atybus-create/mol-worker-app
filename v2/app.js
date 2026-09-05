const HEALTH_URL = 'https://n8n.estyl.team/webhook/mol-app-v2-health';

const byId = id => document.getElementById(id);

async function checkHealth() {
  const button = byId('retryButton');
  const chip = byId('statusChip');
  button.disabled = true;
  chip.className = 'status-chip is-loading';
  chip.textContent = 'SPRAWDZANIE';
  byId('databaseState').textContent = '—';
  byId('writesState').textContent = '—';
  byId('backendVersion').textContent = '—';

  try {
    const response = await fetch(`${HEALTH_URL}?check=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const health = await response.json();
    if (health.ok !== true || health.service !== 'MOL_APP_V2' || health.core_status !== 'READY' || health.database !== 'ONLINE') {
      throw new Error('Nieprawidłowa odpowiedź usługi');
    }

    byId('statusTitle').textContent = 'Backend V2 działa poprawnie';
    byId('statusDescription').textContent = 'Połączenie z bazą V2 działa. Logowanie zapisuje tylko sesje; zapisy czasu pracy pozostają wyłączone.';
    byId('backendVersion').textContent = health.version;
    byId('databaseState').textContent = health.database;
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

const API_BASE = 'https://n8n.estyl.team/webhook/mol-app-v2-auth-';
const SESSION_KEY = 'mol.v2.session';
let sessionToken = '';
let busy = false;
let generation = 0;
let expiryTimer;
let logoutRequestId = null;

function saveToken(token) {
  sessionToken = token;
  try { if (token) sessionStorage.setItem(SESSION_KEY, token); else sessionStorage.removeItem(SESSION_KEY); }
  catch { /* A private-browser storage restriction must not break logout. */ }
}

function showLogin(message = '') {
  clearTimeout(expiryTimer);
  byId('authTitle').textContent = 'Zaloguj się';
  byId('authMessage').textContent = message;
  byId('loginForm').hidden = false;
  byId('sessionPanel').hidden = true;
  byId('sessionRetry').hidden = true;
  for (const id of ['userName', 'userRole', 'sessionExpiry']) byId(id).textContent = '';
}

function showSession(data) {
  if (!data?.user?.employee_id || !['WORKER', 'LEADER', 'ADMIN'].includes(data.user.role) || !(Date.parse(data.expires_at) > Date.now())) {
    throw new Error('Nieprawidłowa odpowiedź sesji. Spróbuj ponownie.');
  }
  byId('authTitle').textContent = 'Sesja aktywna';
  byId('authMessage').textContent = 'Dostęp potwierdzony przez backend V2.';
  byId('loginForm').hidden = true;
  byId('sessionPanel').hidden = false;
  byId('sessionRetry').hidden = true;
  byId('userName').textContent = data.user.display_name;
  byId('userRole').textContent = {WORKER:'Pracownik', LEADER:'Lider', ADMIN:'Administrator'}[data.user.role];
  byId('sessionExpiry').textContent = new Date(data.expires_at).toLocaleString('pl-PL');
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    generation++;
    saveToken('');
    showLogin('Sesja wygasła. Zaloguj się ponownie.');
  }, Math.max(0, Date.parse(data.expires_at) - Date.now()));
}

async function authRequest(action, {body, token} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(API_BASE + action, {
      method: body ? 'POST' : 'GET', cache:'no-store', credentials:'omit',
      headers: {...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {})},
      body: body ? JSON.stringify(body) : undefined, signal:controller.signal,
    });
    let envelope;
    try { envelope = await response.json(); } catch { throw new Error('Backend nie zwrócił poprawnej odpowiedzi. Spróbuj ponownie.'); }
    if (!response.ok || envelope.ok !== true) {
      const error = new Error(envelope.error?.message || 'Operacja nie została potwierdzona. Spróbuj ponownie.');
      error.status = response.status;
      error.code = envelope.error?.code;
      throw error;
    }
    return envelope.data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Brak potwierdzenia z serwera. Sprawdź połączenie i spróbuj ponownie.');
    throw error;
  } finally { clearTimeout(timer); }
}

function setBusy(value) {
  busy = value;
  for (const id of ['loginButton','logoutButton','sessionRetry','login','password']) byId(id).disabled = value;
}

async function restoreSession() {
  if (busy) return;
  if (!sessionToken) return showLogin();
  const current = ++generation;
  setBusy(true);
  byId('authMessage').textContent = 'Sprawdzanie sesji na serwerze…';
  try {
    const data = await authRequest('session', {token:sessionToken});
    if (current === generation) showSession(data);
  } catch (error) {
    if (current !== generation) return;
    if (error.status === 401) { saveToken(''); showLogin('Sesja wygasła lub została zakończona. Zaloguj się ponownie.'); }
    else {
      byId('authTitle').textContent = 'Sesja niepotwierdzona';
      byId('authMessage').textContent = error.message;
      byId('sessionPanel').hidden = true;
      byId('loginForm').hidden = true;
      byId('sessionRetry').hidden = false;
    }
  } finally { setBusy(false); }
}

byId('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const current = ++generation;
  const body = {request_id:crypto.randomUUID(),login:byId('login').value.trim(),password:byId('password').value};
  setBusy(true);
  byId('authMessage').textContent = 'Sprawdzanie danych logowania…';
  try {
    // A single request identifier is retained during transient retries.
    let data;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { data = await authRequest('login',{body}); break; }
      catch (error) {
        if (attempt === 2 || (error.status && error.code !== 'AUTH_BUSY' && error.status < 500)) throw error;
        byId('authMessage').textContent = 'Oczekiwanie na potwierdzenie logowania…';
        await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
      }
    }
    if (current !== generation) return;
    if (!/^[0-9a-f]{64}$/.test(data?.session_token || '')) throw new Error('Nieprawidłowa odpowiedź logowania.');
    showSession(data);
    saveToken(data.session_token);
    logoutRequestId = null;
  } catch (error) { if (current === generation) showLogin(error.message); }
  finally { body.password = ''; byId('password').value = ''; setBusy(false); }
});

byId('logoutButton').addEventListener('click', async () => {
  if (busy || !sessionToken) return;
  const current = ++generation;
  setBusy(true);
  logoutRequestId ||= crypto.randomUUID();
  byId('authMessage').textContent = 'Wylogowywanie na serwerze…';
  try {
    await authRequest('logout',{token:sessionToken,body:{request_id:logoutRequestId}});
    if (current === generation) { saveToken(''); showLogin('Wylogowano. Sesja została unieważniona na serwerze.'); }
  } catch (error) {
    if (current !== generation) return;
    if (error.status === 401) { saveToken(''); showLogin('Sesja jest już nieaktywna.'); }
    else byId('authMessage').textContent = `${error.message} Wylogowanie nie zostało potwierdzone — ponów przyciskiem.`;
  } finally { setBusy(false); }
});
byId('sessionRetry').addEventListener('click', restoreSession);
document.addEventListener('visibilitychange', () => { if (!document.hidden && sessionToken) restoreSession(); });
window.addEventListener('pageshow', event => { if (event.persisted) restoreSession(); });
try { sessionToken = sessionStorage.getItem(SESSION_KEY) || ''; } catch { /* Storage optional. */ }
restoreSession();
