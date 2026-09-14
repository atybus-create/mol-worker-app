import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const mobile = read('mobile/stage5.js');
const web = read('web/stage5.js');
const live = read('web/live.js');
const sw = read('sw.js');
const api = read('shared/api.js');

assert.match(mobile, /ack_required\s*&&\s*!x\.ack_at|ack_required===true&&![a-zA-Z0-9_.]+ack_at/, 'MANUAL wymagający ACK musi liczyć się bez cause_status OPEN');
assert.doesNotMatch(mobile, /cause_status\s*===\s*['"]OPEN['"]\s*&&\s*\(!x\.ack_required\|\|!x\.ack_at\)/, 'licznik nie może wymagać OPEN dla MANUAL');
assert.doesNotMatch(mobile, /render\(data\);\s*await\s+markShown\(/, 'poll nie może automatycznie oznaczać wszystkich pobranych wiadomości jako SHOWN');
assert.match(mobile, /IntersectionObserver/, 'MOBILE musi oznaczać SHOWN na podstawie realnej widoczności karty');
assert.match(web, /IntersectionObserver/, 'WWW musi oznaczać SHOWN na podstawie realnej widoczności karty');
assert.match(web, /employee_id:person\.value|employee_id\s*:\s*person\.value/, 'historia lidera musi wysyłać employee_id');
assert.match(web, /limit:100/, 'historia WWW musi pobierać minimum 100 rekordów');
assert.match(web, /active_workers|history_items/, 'lista historii musi korzystać z aktywnych WORKER, nie tylko OPEN');
assert.match(web, /2000/, 'limit treści 2000 znaków musi pozostać w UI');
assert.doesNotMatch(live, /data-message-recipients|data-message-status|data-message-send|mol-app-v2-leader-message-recipients/, 'live.js nie może zależeć od starego UI komunikatów V2');
assert.match(sw, /mobile\/stage5\.js/, 'mobile stage5 musi być criticalFresh');
assert.match(sw, /web\/stage5\.js/, 'web stage5 musi być criticalFresh');
assert.match(api, /20260914\.2/, 'BUILD API musi być 20260914.2');

console.log('MOL App V3 communications regression: PASS');
