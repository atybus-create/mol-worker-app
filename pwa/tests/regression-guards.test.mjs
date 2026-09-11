import assert from 'node:assert/strict';

let mode = 'dedupe';
let readCount = 0;
let writeCount = 0;
let clearCount = 0;
let redirectReason = '';

const retryable = () => Object.assign(new Error('offline'), { retryable: true, status: 0 });
const unauthorized = () => Object.assign(new Error('expired'), { retryable: false, status: 401 });

const base = {
  request: async () => ({ ok: true }),
  read: async () => {
    readCount += 1;
    if (mode === 'dedupe') {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { source: 'dedupe' };
    }
    if (mode === 'retry') {
      if (readCount === 1) throw retryable();
      return { source: 'retry' };
    }
    return { source: 'plain' };
  },
  write: async () => {
    writeCount += 1;
    throw retryable();
  },
  session: async () => ({ user: { employee_id: 'MOLTEST', role: 'WORKER' } }),
  download: async () => 'test.csv',
  clearToken: () => { clearCount += 1; },
  redirectLogin: (reason) => { redirectReason = reason; },
};

globalThis.window = { MOLApi: base };
await import(`../shared/regression-guards.js?test=${Date.now()}`);
const api = globalThis.window.MOLApi;

const [first, second] = await Promise.all([
  api.read('mol-app-v2-worker-status', { work_date: '2026-09-08' }),
  api.read('mol-app-v2-worker-status', { work_date: '2026-09-08' }),
]);
assert.equal(readCount, 1, 'identyczne równoległe odczyty powinny zostać zduplikowane do jednego requestu');
assert.deepEqual(first, second);

mode = 'retry';
readCount = 0;
const retried = await api.read('mol-app-v2-leader-team', { work_date: '2026-09-08' });
assert.equal(readCount, 2, 'retryable GET powinien zostać ponowiony dokładnie raz');
assert.equal(retried.source, 'retry');

writeCount = 0;
await assert.rejects(() => api.write('mol-app-v2-attendance-start', { request_id: 'x' }));
assert.equal(writeCount, 1, 'zapis nie może być ponawiany automatycznie');

base.write = async () => {
  writeCount += 1;
  throw unauthorized();
};
await assert.rejects(() => api.write('mol-app-v2-process-start', { request_id: 'y' }));
await new Promise((resolve) => setTimeout(resolve, 10));
assert.ok(clearCount >= 1, '401 powinno wyczyścić token sesji');
assert.equal(redirectReason, 'session_expired', '401 powinno skierować aplikację do logowania');

assert.equal(window.MOLRegressionGuards.readRetry, 'GET_ONCE');
assert.equal(window.MOLRegressionGuards.writeRetry, 'MANUAL_ONLY');
assert.equal(window.MOLRegressionGuards.inflightReadDeduplication, true);
assert.equal(window.MOLRegressionGuards.session401Redirect, true);
assert.equal(window.MOLRegressionGuards.staleWriteProtection, 'EXPECTED_VERSION_BACKEND_AUTHORITY');

console.log('Stage 11 regression guards: PASS');
