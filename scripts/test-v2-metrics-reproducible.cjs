'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');const dir=path.join(__dirname,'../backend/v2/workflows');
const before=new Map(fs.readdirSync(dir).map(n=>[n,fs.readFileSync(path.join(dir,n),'utf8')]));
execFileSync(process.execPath,[path.join(__dirname,'../backend/v2/metrics/build-all.mjs')],{stdio:'pipe'});
for(const [n,s]of before)assert.equal(fs.readFileSync(path.join(dir,n),'utf8'),s,'Generator not reproducible: '+n);
const w=JSON.parse(before.get('attendance-service.json'));assert.equal(w.nodes.length,76);assert.ok(w.nodes.some(n=>n.name==='ES Boundary Capture'));assert.ok(w.nodes.some(n=>n.name==='Build Worker View'));
console.log('Stage 7 deterministic exports PASS: '+before.size+' workflows; stage 6 process logic retained.');
