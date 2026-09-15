import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('mobile/index.html');
const app = read('mobile/app.js');
const process = read('mobile/stage3.js');
const messages = read('mobile/stage5.js');

assert.doesNotMatch(html, /Szybkie akcje/i, 'START nie może zawierać bloku Szybkie akcje');
assert.doesNotMatch(html, /data-action=["'](?:start|stop|process|change-process|process-stop)["']/, 'START nie może renderować przycisków Moniti/proces');
assert.doesNotMatch(html, /section-block notices|class=["'][^"']*notices/, 'START nie może renderować panelu komunikatów/alertów');
assert.match(app, /worker-hero,\.work-status,\.kpi-grid,\.performance-block/, 'dashboard START musi mieć zamkniętą listę sekcji');
assert.doesNotMatch(app, /\.section-block,\.active-process|\.v3-comm/, 'dashboard nie może wciągać ekranów operacyjnych ani komunikatów');

for (const label of [
  'MONITI Rozpocznij pracę',
  'MONITI Zakończ pracę',
  'Zmień proces',
  'Zakończ proces',
  'Zmień godziny pracy',
  'Wznów pracę'
]) {
  assert.match(process, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `PROCES musi zawierać: ${label}`);
}
assert.match(process, /removeAttribute\(['"]disabled['"]\)/, 'zakładka PROCES musi być dostępna niezależnie od stanu dnia');
assert.match(process, /data-process-options/, 'PROCES musi zachować istniejący wybór procesu');
assert.match(process, /mol-app-v3-attendance-start/, 'PROCES musi używać istniejącego START V3');
assert.match(process, /mol-app-v3-attendance-stop/, 'PROCES musi używać istniejącego STOP V3');
assert.match(process, /mol-app-v3-process-change/, 'PROCES musi używać istniejącej zmiany procesu V3');
assert.match(process, /mol-app-v3-process-stop/, 'PROCES musi używać istniejącego zakończenia procesu V3');

assert.match(html, /data-panel=["']messages["']/, 'KOMUNIKATY muszą mieć dedykowany panel');
assert.match(messages, /data-comm-ack/, 'KOMUNIKATY muszą zachować ACK');
assert.match(messages, /data-v3comm-filter/, 'KOMUNIKATY muszą zachować filtry');
assert.match(messages, /HISTORY/, 'KOMUNIKATY muszą zachować historię');
assert.match(messages, /navBadge/, 'KOMUNIKATY muszą zachować badge');
assert.doesNotMatch(messages, /MONITI Rozpocznij pracę|MONITI Zakończ pracę|Zmień proces|Zakończ proces/, 'KOMUNIKATY nie mogą zawierać sterowania pracą/procesem');

console.log('MOL App V3 mobile navigation regression: PASS');
