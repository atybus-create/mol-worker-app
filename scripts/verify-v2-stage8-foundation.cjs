'use strict';
// Deterministic local verification; no requests, credentials, or live data writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');process.chdir(root);
const run=file=>{console.log('RUN '+file);execFileSync(process.execPath,[file],{stdio:'inherit'});};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const foundation=['backend/v2/schema.json','backend/v2/manifest.json','backend/v2/workflows/comm-record-writer.json','backend/v2/workflows/comm-batch-service.json'];
for(const p of foundation)assert.ok(fs.existsSync(p),'Register and build foundations before verifying: '+p);
const before=new Map(foundation.map(p=>[p,hash(p)]));
run('backend/v2/communication/register-foundation.mjs');run('backend/v2/communication/build-foundation.mjs');
for(const [p,h]of before)assert.equal(hash(p),h,'Foundation output not reproducible: '+p);
const tests=['validate-v2-contract.js','validate-v2-backend.js','test-v2-password.cjs','test-v2-auth.cjs','test-v2-attendance.cjs','test-v2-attendance-ui.cjs','test-v2-processes.cjs','test-v2-process-permissions-service.cjs','test-v2-metrics.cjs','test-v2-metrics-writer.cjs','test-v2-summary-input.cjs','test-v2-scheduler.cjs','test-v2-worker-view.cjs','test-v2-norm-mirror.cjs','test-v2-norms-ui.cjs','test-v2-metrics-reproducible.cjs','test-v2-communication.cjs','test-v2-communication-workflows.cjs'];
for(const p of tests)run('scripts/'+p);
for(const p of ['backend/v2/communication/domain.cjs','backend/v2/communication/build-foundation.mjs',...foundation])console.log('SHA256 '+p+' '+hash(p));
console.log('Stage 8 foundation verification PASS. Fixture suites and reproducibility only; live probe evidence is separate.');
