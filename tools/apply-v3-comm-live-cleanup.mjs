import fs from 'node:fs';

const path = 'pwa/web/live.js';
let src = fs.readFileSync(path, 'utf8');
const before = src;

src = src.replace(/\n  function populateMessageRecipients\(items\) \{[\s\S]*?\n  \}\n\n  const selectedIds/, '\n\n  const selectedIds');
src = src.replace(/\n    populateMessageRecipients\(items\.filter\(\(row\) => row\.attendance\?\.state === 'OPEN'\)\);/, '');
src = src.replace(/\n  async function lockAndPopulateMessages\(\) \{[\s\S]*?\n  \}\n\n  function bindGlobal/, '\n\n  function bindGlobal');
src = src.replace(/\n      await waitFor\('\[data-view="leader-messages"\] \[data-message-recipients\]'\);/, '');
src = src.replace(/,\s*lockAndPopulateMessages\(\)/g, '');
src = src.replace(/lockAndPopulateMessages\(\),\s*/g, '');

for (const forbidden of ['data-message-recipients', 'data-message-status', 'data-message-send', 'mol-app-v2-leader-message-recipients', 'lockAndPopulateMessages', 'populateMessageRecipients']) {
  if (src.includes(forbidden)) throw new Error(`live.js nadal zawiera zależność V2: ${forbidden}`);
}

if (src === before) throw new Error('Nie wykonano żadnej zmiany w live.js — wzorce nie pasują do aktualnego pliku.');
fs.writeFileSync(path, src);
console.log('live.js V2 communication dependencies removed');
