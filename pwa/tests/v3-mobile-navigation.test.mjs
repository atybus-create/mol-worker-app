import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('mobile/index.html');
const app = read('mobile/app.js');
const process = read('mobile/stage3.js');
const startActions = read('mobile/start-actions.js');
const messages = read('mobile/stage5.js');

assert.doesNotMatch(html, /Szybkie akcje/i, 'START nie może wrócić do legacy bloku Szybkie akcje');
assert.doesNotMatch(html, /section-block notices|class=["'][^"']*notices/, 'START nie może renderować panelu komunikatów/alertów');
assert.match(app, /worker-hero,\.work-status,\.home-actions-block,\.kpi-grid,\.performance-block/, 'dashboard START musi obejmować dedykowany host akcji');
assert.match(app, /loadScript\(['"]\.\/start-actions\.js['"]\)/, 'mobile runtime musi ładować relokację akcji na START');
assert.doesNotMatch(app, /\.section-block,\.active-process|\.v3-comm/, 'dashboard nie może wciągać ekranów operacyjnych ani komunikatów');
assert.match(startActions, /data-home-process-actions/, 'START musi mieć dedykowany host dla akcji pracy');
assert.match(startActions, /processPanel\.querySelector\(['"]\[data-process-actions\]['"]\)/, 'akcje muszą być fizycznie przenoszone z PROCES na START');

for (const label of [
  'MONITI Rozpocznij pracę',
  'MONITI Zakończ pracę',
  'Zmień proces',
  'Zakończ proces',
  'Zmień godziny pracy',
  'Wznów pracę'
]) {
  assert.match(process, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `runtime V3 musi zachować akcję: ${label}`);
}
assert.match(process, /removeAttribute\(['"]disabled['"]\)/, 'zakładka PROCES musi być dostępna niezależnie od stanu dnia');
assert.match(process, /data-process-options/, 'PROCES musi zachować wybór procesu');
assert.match(process, /mol-app-v3-attendance-start/, 'START musi używać istniejącego START V3');
assert.match(process, /mol-app-v3-attendance-stop/, 'START musi używać istniejącego STOP V3');
assert.match(process, /mol-app-v3-process-change/, 'zmiana procesu musi używać istniejącego V3');
assert.match(process, /mol-app-v3-process-stop/, 'zakończenie procesu musi używać istniejącego V3');
assert.match(startActions, /MOLMobileShow\?\.\(['"]process['"]\)/, 'Zmień proces na START musi otwierać ekran wyboru procesu');

assert.match(html, /data-panel=["']messages["']/, 'KOMUNIKATY muszą mieć dedykowany panel');
assert.match(messages, /data-comm-ack/, 'KOMUNIKATY muszą zachować ACK');
assert.match(messages, /data-v3comm-filter/, 'KOMUNIKATY muszą zachować filtry');
assert.match(messages, /HISTORY/, 'KOMUNIKATY muszą zachować historię');
assert.match(messages, /navBadge/, 'KOMUNIKATY muszą zachować badge');
assert.doesNotMatch(messages, /MONITI Rozpocznij pracę|MONITI Zakończ pracę|Zmień proces|Zakończ proces/, 'KOMUNIKATY nie mogą zawierać sterowania pracą/procesem');

console.log('MOL App V3 mobile navigation regression: PASS');
