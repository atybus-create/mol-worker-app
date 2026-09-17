import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('web/index.html');
const app = read('web/app.js');
const audit = read('web/audit.js');
const sw = read('sw.js');

assert.match(html, /data-section="audit"/, 'WWW must expose History of operations navigation');
assert.match(html, /data-view="audit"/, 'WWW must expose audit view');
assert.match(html, /audit\.css\?v=20260917\.3/, 'WWW must load audit styles');
assert.match(app, /load\(['"]\.\/audit\.js['"]\)/, 'WWW runtime must load global audit module');
assert.match(audit, /mol-app-v3-audit/, 'audit frontend must use V3 audit endpoint');
assert.match(audit, /data-audit-from/, 'audit must support date-from filtering');
assert.match(audit, /data-audit-to/, 'audit must support date-to filtering');
assert.match(audit, /data-audit-category/, 'audit must support category filtering');
assert.match(audit, /data-audit-actor/, 'audit must support actor filtering');
assert.match(audit, /data-audit-employee/, 'audit must support employee filtering');
assert.match(audit, /WORKTIME/, 'audit must render worktime operations');
assert.match(audit, /CORRECTION/, 'audit must render corrections');
assert.match(audit, /COMMUNICATION/, 'audit must render communication operations');
assert.match(sw, /web\/audit\.js/, 'audit runtime must be cached by PWA');
assert.match(sw, /web\/audit\.css/, 'audit styles must be cached by PWA');
assert.match(sw, /['"]\/web\/audit\.js['"]/, 'audit runtime must be network-fresh');

console.log('MOL App V3 global audit regression: PASS');