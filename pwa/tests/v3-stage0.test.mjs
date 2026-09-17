import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const api = read('shared/api.js');
const auth = read('shared/auth.js');
const live = read('web/live.js');
const mobile = read('mobile/login.html');
const web = read('web/login.html');
const sw = read('sw.js');

assert.match(api, /20260917\.6-v3-cutover/, 'klient API musi używać aktualnego builda V3');
assert.match(api, /'mol-app-health': 'mol-app-v3-health'/, 'health musi być przełączony centralnie na V3');
assert.match(api, /request\(['"]mol-app-v3-auth-login['"]/, 'login musi wołać bezpośrednio endpoint V3');
assert.match(api, /request\(['"]mol-app-v3-auth-session['"]/, 'sesja musi wołać bezpośrednio endpoint V3');
assert.match(api, /request\(['"]mol-app-v3-auth-logout['"]/, 'logout musi wołać bezpośrednio endpoint V3');
assert.match(live, /api\.read\(['"]mol-app-v3-leader-team['"]/, 'panel zespołu musi używać endpointu V3');
assert.match(live, /api\.read\(['"]mol-app-v3-report-performance['"]/, 'raport wydajności musi używać endpointu V3');
assert.match(live, /api\.read\(['"]mol-app-v3-report-attendance['"]/, 'raport czasu pracy musi używać endpointu V3');
assert.match(api, /auth: true/, 'logowanie V3 musi pozostać aktywne');
assert.match(auth, /Logowanie V3/, 'logowanie musi korzystać z interfejsu V3');
assert.match(mobile, /MOL App <b>V3<\/b>/, 'mobile musi być oznaczone jako V3');
assert.match(web, /MOL App <b>V3<\/b>/, 'WWW musi być oznaczone jako V3');

console.log('MOL App V3 Stage 0 frontend contract: PASS');
