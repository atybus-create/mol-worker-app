import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const api = read('shared/api.js');
const auth = read('shared/auth.js');
const mobile = read('mobile/login.html');
const web = read('web/login.html');
const sw = read('sw.js');

for (const source of [api, auth, mobile, web, sw]) {
  assert.match(source, /20260911\.1/, 'każdy punkt startowy musi używać builda Stage 0');
}
assert.match(api, /'mol-app-health': 'mol-app-v3-health'/, 'health musi być przełączony centralnie na V3');
assert.match(api, /auth: false/, 'logowanie musi pozostać wyłączone do osobnego odbioru');
assert.match(auth, /Backend V3 online/, 'oba ekrany logowania muszą pokazać potwierdzenie health V3');
assert.match(mobile, /MOL App <b>V3<\/b>/, 'mobile musi być oznaczone jako V3');
assert.match(web, /MOL App <b>V3<\/b>/, 'WWW musi być oznaczone jako V3');

console.log('MOL App V3 Stage 0 frontend contract: PASS');
