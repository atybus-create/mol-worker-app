import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const app = read('web/app.js');
const corrections = read('web/corrections.js');
const sw = read('sw.js');

assert.match(app, /load\(['"]\.\/corrections\.js['"]\)/, 'WWW musi ładować dedykowany moduł korekt V3');
assert.match(corrections, /mol-app-v3-corrections/, 'moduł musi czytać zunifikowaną kolejkę korekt V3');
assert.match(corrections, /mol-app-v3-attendance-correction/, 'BRAK STOP pracy musi korzystać z endpointu korekty czasu V3');
assert.match(corrections, /mol-app-v3-process-correction/, 'korekty procesu muszą korzystać z endpointu procesu V3');
assert.match(corrections, /data-live-correction-pending/, 'licznik korekt musi zasilać KPI zespołu');
assert.match(corrections, /REQUIRES_ADMIN/, 'niebezpieczne przypadki muszą być oznaczone jako wymagające administratora');
assert.match(corrections, /WAITING_ATTENDANCE/, 'korekta procesu musi czekać na ustalenie STOP pracy, gdy jest to konieczne');
assert.match(corrections, /corrected_by|Audyt/, 'historia korekt musi pokazywać audyt');
assert.doesNotMatch(corrections, /mol-app-v2-(correction|corrections)|API CORRECTION/i, 'moduł V3 nie może używać starych endpointów korekt V2');
assert.match(sw, /web\/corrections\.js/, 'moduł korekt musi być częścią cache PWA');
assert.match(sw, /20260915\.2-full-corrections/, 'Service Worker musi mieć nową wersję dla pełnych korekt');

console.log('MOL App V3 full corrections regression: PASS');
