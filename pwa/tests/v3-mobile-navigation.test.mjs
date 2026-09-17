import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('mobile/index.html');
const app = read('mobile/app.js');
const css = read('mobile/mobile-ui-cleanup.css');
const uiCleanup = read('mobile/mobile-ui-cleanup.js');
const process = read('mobile/stage3.js');
const startActions = read('mobile/start-actions.js');
const messages = read('mobile/stage5.js');

assert.doesNotMatch(html, /Szybkie akcje/i, 'START nie może wrócić do legacy bloku Szybkie akcje');
assert.doesNotMatch(html, /section-block notices|class=["'][^"']*notices/, 'START nie może renderować panelu komunikatów/alertów');
assert.match(app, /worker-hero,\.work-status,\.home-actions-block,\.kpi-grid,\.performance-block/, 'dashboard START musi obejmować dedykowany host akcji');
assert.match(app, /loadScript\(['"]\.\/start-actions\.js['"]\)/, 'mobile runtime musi ładować akcje START');
assert.match(app, /loadScript\(['"]\.\/mobile-ui-cleanup\.js['"]\)/, 'mobile runtime musi ładować cleanup UI po modułach funkcjonalnych');
assert.doesNotMatch(app, /\.section-block,\.active-process|\.v3-comm/, 'dashboard nie może wciągać ekranów operacyjnych ani komunikatów');
assert.match(app, /liveStatus\.hidden\s*=\s*screen\s*!==\s*['"]home['"]/, 'globalny status pracy może być widoczny tylko na START');
assert.match(startActions, /data-home-process-actions/, 'START musi mieć dedykowany host dla akcji pracy');
assert.match(startActions, /cloneNode\(true\)/, 'START musi renderować stabilną kopię kontrolek akcji');
assert.match(startActions, /requestAnimationFrame\(renderStartActions\)/, 'odświeżanie akcji musi być scalane do jednej klatki');
assert.doesNotMatch(startActions, /processPanel\.querySelector\(['"]\.process-screen-head small['"]\)[\s\S]{0,120}textContent/, 'observer START nie może modyfikować obserwowanego processPanel i zapętlać renderu');

const navTargets = [...html.matchAll(/<button[^>]*data-nav=["']([^"']+)["']/g)].map((match) => match[1]);
assert.deepEqual(navTargets, ['home', 'process', 'messages'], 'dolna nawigacja mobile ma zawierać wyłącznie Start, Proces i Komunikaty');
assert.doesNotMatch(html, /data-nav=["'](?:profile|team)["']/, 'Profil i Zespół nie mogą występować w dolnej nawigacji');
assert.match(css, /env\(safe-area-inset-bottom\)/, 'dolna nawigacja i treść muszą obsługiwać safe area telefonu');
assert.match(css, /grid-template-columns:\s*repeat\(3,/, 'dolna nawigacja musi mieć trzy równe kolumny');
assert.match(css, /overflow-x:\s*hidden/, 'strona mobile musi blokować poziomy scroll dokumentu');
assert.match(css, /padding-bottom:\s*calc\(70px \+ env\(safe-area-inset-bottom\)\)/, 'treść musi mieć zapas nad dolną nawigacją');

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
assert.match(process, /const canResume = !busy && state === ['"]CLOSED['"]/, 'Wznów pracę może być aktywne tylko po zamknięciu dnia');
assert.match(process, /runAttendance\(['"]RESUME['"]\)/, 'Wznów pracę musi korzystać z handlera obecności');
assert.match(process, /mol-app-v3-attendance-resume/, 'Wznów pracę musi używać endpointu V3');
assert.doesNotMatch(process, /Backend V3 nie udostępnia jeszcze bezpiecznego wznowienia/, 'frontend nie może oznaczać wznowienia jako niedostępnego');
assert.match(process, /removeAttribute\(['"]disabled['"]\)/, 'zakładka PROCES musi być dostępna niezależnie od stanu dnia');
assert.match(process, /data-process-options/, 'PROCES musi zachować wybór procesu');
assert.match(process, /mol-app-v3-attendance-start/, 'START musi używać istniejącego START V3');
assert.match(process, /mol-app-v3-attendance-stop/, 'START musi używać istniejącego STOP V3');
assert.match(process, /mol-app-v3-process-change/, 'zmiana procesu musi używać istniejącego V3');
assert.match(process, /mol-app-v3-process-stop/, 'zakończenie procesu musi używać istniejącego V3');
assert.match(startActions, /MOLMobileShow\?\.\(['"]process['"]\)/, 'Zmień proces na START musi otwierać ekran wyboru procesu');
assert.match(uiCleanup, /process-screen-status['"]\)\?\.remove\(\)/, 'PROCES ma usuwać powielony blok statusu');
assert.match(uiCleanup, /process-actions-title['"]\)\?\.remove\(\)/, 'PROCES ma zaczynać się bezpośrednio od kontrolek operacyjnych');

assert.match(html, /data-panel=["']messages["']/, 'KOMUNIKATY muszą mieć dedykowany panel');
assert.match(messages, /data-comm-ack/, 'KOMUNIKATY muszą zachować ACK');
assert.match(messages, /data-v3comm-filter/, 'KOMUNIKATY muszą zachować filtry');
assert.match(messages, /HISTORY/, 'KOMUNIKATY muszą zachować historię');
assert.match(messages, /navBadge/, 'KOMUNIKATY muszą zachować badge');
assert.doesNotMatch(messages, /MONITI Rozpocznij pracę|MONITI Zakończ pracę|Zmień proces|Zakończ proces/, 'KOMUNIKATY nie mogą zawierać sterowania pracą/procesem');
assert.match(uiCleanup, /title\.textContent\s*=\s*['"]Komunikaty['"]/, 'KOMUNIKATY muszą mieć kompaktowy nagłówek');
assert.match(css, /\.v3-comm-filters[\s\S]*flex-wrap:\s*wrap\s*!important/, 'filtry komunikatów nie mogą wymuszać poziomego scrolla');

console.log('MOL App V3 mobile navigation regression: PASS');
