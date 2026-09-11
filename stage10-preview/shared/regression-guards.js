(() => {
  'use strict';

  const base = window.MOLApi;
  if (!base || window.MOLRegressionGuards) return;

  const inflightReads = new Map();
  let redirectScheduled = false;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const stableValue = (value) => {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  };

  const readKey = (path, query) => `${String(path || '')}|${JSON.stringify(stableValue(query || {}))}`;

  function handleSessionFailure(error, auth = true) {
    if (!auth || Number(error?.status || 0) !== 401) return;
    base.clearToken();
    if (redirectScheduled) return;
    redirectScheduled = true;
    setTimeout(() => {
      try { base.redirectLogin('session_expired'); }
      catch { redirectScheduled = false; }
    }, 0);
  }

  async function guardedRequest(path, options = {}) {
    try {
      return await base.request(path, options);
    } catch (error) {
      handleSessionFailure(error, options.auth !== false);
      throw error;
    }
  }

  async function guardedRead(path, query = null) {
    const key = readKey(path, query);
    if (inflightReads.has(key)) return inflightReads.get(key);
    const task = (async () => {
      try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            return await base.read(path, query);
          } catch (error) {
            handleSessionFailure(error, true);
            if (!error?.retryable || attempt === 1) throw error;
            await sleep(400);
          }
        }
        throw new Error('Nie udało się wykonać odczytu.');
      } finally {
        inflightReads.delete(key);
      }
    })();
    inflightReads.set(key, task);
    return task;
  }

  async function guardedWrite(path, body) {
    try {
      return await base.write(path, body);
    } catch (error) {
      handleSessionFailure(error, true);
      throw error;
    }
  }

  async function guardedSession() {
    try { return await base.session(); }
    catch (error) { handleSessionFailure(error, true); throw error; }
  }

  async function guardedDownload(path, query, fallbackName) {
    try { return await base.download(path, query, fallbackName); }
    catch (error) { handleSessionFailure(error, true); throw error; }
  }

  window.MOLApi = Object.freeze({
    ...base,
    request: guardedRequest,
    read: guardedRead,
    write: guardedWrite,
    session: guardedSession,
    download: guardedDownload,
  });

  window.MOLRegressionGuards = Object.freeze({
    readRetry: 'GET_ONCE',
    writeRetry: 'MANUAL_ONLY',
    inflightReadDeduplication: true,
    session401Redirect: true,
    staleWriteProtection: 'EXPECTED_VERSION_BACKEND_AUTHORITY',
  });
})();
