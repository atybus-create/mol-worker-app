import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const live = fs.readFileSync(path.join(root, 'web/live.js'), 'utf8');

assert.match(live, /const selectedFor = \(view\) => new Set\(/, 'Wydajność i Czas pracy muszą odczytywać zaznaczenia osobno dla każdego widoku');
assert.match(live, /const reportSelected = selectedFor\(reports\)/, 'Wydajność musi zachowywać własny stan zaznaczeń');
assert.match(live, /const worktimeSelected = selectedFor\(worktime\)/, 'Czas pracy musi zachowywać własny stan zaznaczeń');
assert.match(live, /const checked = selected\.has\(item\.employee\.employee_id\)/, 'Kafelek może być zaznaczony tylko wtedy, gdy użytkownik faktycznie go wybrał');
assert.doesNotMatch(live, /index\s*<\s*3/, 'Pierwszy rząd pracowników nie może zaznaczać się automatycznie');
assert.doesNotMatch(live, /document\.querySelectorAll\(['"]\.report-people-grid input:checked['"]\)/, 'Zaznaczenia z Wydajności i Czasu pracy nie mogą przeciekać między zakładkami');

console.log('MOL App V3 report selection regression: PASS');
