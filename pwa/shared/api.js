(() => {
  'use strict';

  const BASE = 'https://n8n.estyl.team/webhook/';
  const SESSION_KEY = 'mol.v3.session';
  const BUILD = '20260911.1';
  const ROUTE_OVERRIDES = Object.freeze({
    'mol-app-health': 'mol-app-v3-health',
  });
  const FEATURES = Object.freeze({
    health: true,
    auth: false,
  });
  const state = { token: '' };

  try { state.token = sessionStorage.getItem(SESSION_KEY) || ''; } catch { /* storage is optional */ }

  class MOLApiError extends Error {
    constructor(message, { status = 0, code = '', retryable = false, details = null } = {}) {
      super(message);
      this.name = 'MOLApiError';
      this.status = status;
      this.code = code;
      this.retryable = retryable;
      this.details = details;
    }
  }

  const requestId = () => {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  const todayISO = () => {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  };

  const setToken = (token) => {
    state.token = String(token || '');
    try {
      if (state.token) sessionStorage.setItem(SESSION_KEY, state.token);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* storage is optional */ }
  };

  const clearToken = () => setToken('');
  const getToken = () => state.token;

  const endpoint = (path) => {
    const normalized = String(path || '').replace(/^\/+/, '');
    if (ROUTE_OVERRIDES[normalized]) return ROUTE_OVERRIDES[normalized];
    if (normalized === 'mol-app-v2-message-send') return 'mol-app-v2-leader-message';
    return normalized;
  };

  const readQuery = (path, query) => {
    const normalized = endpoint(path);
    const q = query && typeof query === 'object' && !Array.isArray(query) ? { ...query } : {};
    const date = todayISO();
    if (normalized === 'mol-app-v2-worker-status' && !q.work_date) q.work_date = date;
    if (normalized === 'mol-app-v2-leader-team' && !q.work_date) q.work_date = date;
    if (normalized === 'mol-app-v2-norms-daily' && !q.date && !q.work_date) q.date = date;
    if (normalized === 'mol-app-v2-norms-monthly' && !q.month) q.month = date.slice(0, 7);
    return q;
  };

  const unwrapEnvelope = (value) => {
    let envelope = value;
    if (typeof envelope === 'string') {
      try { envelope = JSON.parse(envelope); } catch { /* handled by caller */ }
    }
    if (Array.isArray(envelope) && envelope.length === 1 && envelope[0] && typeof envelope[0] === 'object') envelope = envelope[0];
    if (envelope && typeof envelope === 'object' && envelope.ok === undefined && envelope.body && typeof envelope.body === 'object') envelope = envelope.body;
    return envelope;
  };

  async function request(path, {
    method = 'GET',
    query = null,
    body = null,
    auth = true,
    binary = false,
    timeoutMs = 45000,
  } = {}) {
    const normalized = endpoint(path);
    const url = new URL(BASE + normalized);
    const effectiveQuery = String(method).toUpperCase() === 'GET' ? readQuery(normalized, query) : (query || {});
    for (const [key, value] of Object.entries(effectiveQuery)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) url.searchParams.set(key, value.join(','));
      else url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = { Accept: 'application/json' };
    if (auth) {
      if (!state.token) throw new MOLApiError('Brak aktywnej sesji.', { status: 401, code: 'UNAUTHENTICATED' });
      headers.Authorization = `Bearer ${state.token}`;
    }
    if (body !== null) headers['Content-Type'] = 'application/json';

    try {
      const response = await fetch(url, {
        method,
        cache: 'no-store',
        credentials: 'omit',
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (binary) {
        if (!response.ok) {
          let payload = null;
          try { payload = unwrapEnvelope(JSON.parse((await response.text()).replace(/^\uFEFF/, ''))); } catch { /* binary/non-json error */ }
          throw new MOLApiError(payload?.error?.message || `HTTP ${response.status}`, {
            status: response.status,
            code: payload?.error?.code || '',
            retryable: payload?.error?.retryable === true,
            details: payload?.error?.details || null,
          });
        }
        return {
          blob: await response.blob(),
          disposition: response.headers.get('content-disposition') || '',
          contentType: response.headers.get('content-type') || '',
        };
      }

      const raw = (await response.text()).replace(/^\uFEFF/, '');
      if (!raw.trim()) {
        throw new MOLApiError(`Backend V2 ${normalized} zwrócił pustą odpowiedź (HTTP ${response.status}).`, {
          status: response.status,
          code: 'EMPTY_RESPONSE',
          retryable: response.status >= 500,
        });
      }

      let parsed;
      try { parsed = JSON.parse(raw); }
      catch {
        const contentType = response.headers.get('content-type') || 'brak Content-Type';
        throw new MOLApiError(`Backend V2 ${normalized} zwrócił niepoprawny JSON (HTTP ${response.status}, ${contentType}).`, {
          status: response.status,
          code: 'INVALID_JSON',
          retryable: response.status >= 500,
        });
      }
      const envelope = unwrapEnvelope(parsed);

      if (!response.ok || envelope?.ok !== true) {
        throw new MOLApiError(envelope?.error?.message || 'Operacja nie została potwierdzona.', {
          status: response.status,
          code: envelope?.error?.code || '',
          retryable: envelope?.error?.retryable === true,
          details: envelope?.error?.details || null,
        });
      }
      return envelope.data;
    } catch (error) {
      if (error?.name === 'AbortError' || error instanceof TypeError) {
        throw new MOLApiError('Brak potwierdzenia z serwera. Sprawdź połączenie i spróbuj ponownie.', { retryable: true });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function login(loginName, password) {
    const body = {
      request_id: requestId(),
      login: String(loginName || '').trim(),
      password: String(password || ''),
    };
    try {
      const data = await request('mol-app-v2-auth-login', { method: 'POST', body, auth: false, timeoutMs: 30000 });
      if (!/^[0-9a-f]{64}$/.test(String(data?.session_token || '')) || !data?.user?.employee_id) {
        throw new MOLApiError('Backend zwrócił nieprawidłową sesję.');
      }
      setToken(data.session_token);
      return data;
    } finally {
      body.password = '';
    }
  }

  const health = () => request('mol-app-health', { auth: false, timeoutMs: 15000 });

  const session = () => request('mol-app-v2-auth-session', { timeoutMs: 30000 });

  async function logout({ clearOnFailure = false } = {}) {
    if (!state.token) { clearToken(); return { alreadyInactive: true }; }
    const body = { request_id: requestId() };
    try {
      const data = await request('mol-app-v2-auth-logout', { method: 'POST', body, timeoutMs: 30000 });
      clearToken();
      return data;
    } catch (error) {
      if (error.status === 401 || clearOnFailure) clearToken();
      throw error;
    }
  }

  async function requireSession({ surface = 'mobile' } = {}) {
    if (!state.token) return null;
    try {
      const data = await session();
      const role = String(data?.user?.role || '').toUpperCase();
      if (!data?.user?.employee_id || !['WORKER', 'LEADER', 'ADMIN'].includes(role)) {
        throw new MOLApiError('Nieprawidłowy zakres sesji.', { status: 401, code: 'UNAUTHENTICATED' });
      }
      if (surface === 'web' && role === 'WORKER') {
        throw new MOLApiError('Panel WWW jest dostępny tylko dla LEADER/ADMIN.', { status: 403, code: 'FORBIDDEN' });
      }
      return data;
    } catch (error) {
      if (error.status === 401 || error.status === 403) clearToken();
      throw error;
    }
  }

  const read = (path, query = null) => request(path, { query });
  const write = (path, body) => request(endpoint(path), { method: 'POST', body });

  async function download(path, query, fallbackName) {
    const result = await request(path, { query, binary: true });
    const match = /filename="?([^";]+)"?/i.exec(result.disposition);
    const filename = match?.[1] || fallbackName || 'mol-v2-export.bin';
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    return filename;
  }

  function redirectLogin(reason = '') {
    const params = new URLSearchParams();
    if (reason) params.set('reason', reason);
    params.set('v', BUILD);
    location.replace(`./login.html?${params.toString()}`);
  }

  function canonicalizeRole(role) {
    const expected = String(role || '').toUpperCase();
    const params = new URLSearchParams(location.search);
    const current = String(params.get('role') || '').toUpperCase();
    params.set('v', BUILD);
    if (current === expected && new URLSearchParams(location.search).get('v') === BUILD) return false;
    params.set('role', expected);
    location.replace(`${location.pathname}?${params.toString()}${location.hash || ''}`);
    return true;
  }

  function reveal() {
    document.documentElement.classList.remove('mol-live-pending');
    const style = document.getElementById('molLivePendingStyle');
    if (style) style.remove();
  }

  window.MOLApi = Object.freeze({
    BASE,
    BUILD,
    SESSION_KEY,
    ROUTE_OVERRIDES,
    FEATURES,
    MOLApiError,
    requestId,
    todayISO,
    getToken,
    setToken,
    clearToken,
    request,
    read,
    write,
    login,
    health,
    logout,
    session,
    requireSession,
    download,
    redirectLogin,
    canonicalizeRole,
    reveal,
  });
})();
