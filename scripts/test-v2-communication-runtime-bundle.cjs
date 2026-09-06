'use strict';
// Re-run the same generated graph tests against the exact compiled n8n Code.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const path='backend/v2/communication/candidate-workflows/comm-api-rules.json';
const original=fs.readFileSync(path),wf=JSON.parse(original);
const bundle=fs.readFileSync('backend/v2/communication/runtime.bundle.js','utf8');
const meta=JSON.parse(fs.readFileSync('backend/v2/communication/runtime.bundle.metadata.json'));
assert.equal(crypto.createHash('sha256').update(bundle).digest('hex'),meta.runtime_sha256);
for(const [file,hash]of Object.entries(meta.sources))assert.equal(crypto.createHash('sha256').update(fs.readFileSync('backend/v2/communication/'+file)).digest('hex'),hash);
wf.nodes.find(n=>n.name==='Dispatch').parameters.jsCode=bundle;
fs.writeFileSync(path,JSON.stringify(wf,null,2)+'\n');
try{execFileSync(process.execPath,['scripts/test-v2-communication-adapters.cjs'],{stdio:'inherit'});}finally{fs.writeFileSync(path,original);}
console.log('Compiled runtime PASS against the same 31 graph cases; not 31 additional unique scenarios.');
