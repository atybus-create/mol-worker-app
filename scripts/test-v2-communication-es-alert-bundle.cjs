'use strict';
const assert=require('node:assert/strict');
const B=require('../backend/v2/communication/es-alert-bundle.cjs');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const UUID='11111111-1111-4111-8111-111111111111',HASH='a'.repeat(64),NOW='2026-09-08T08:00:00.000Z';
function episode(type,anchor){return {episode_id:'MOL004|'+type+'|'+anchor,employee_id:'MOL004',type,anchor,status:'OPEN',opened_at:NOW,resolved_at:null,resolution_reason:null,version:1,details:{ack_required:true}};}
function item(type,anchor,deliver=false){const ep=episode(type,anchor);return {type,decision:{ok:true,status:'OPEN',reason:null,open:ep,resolve:[],deliver},delivery_intents:deliver?[{recipient_id:'MOL004',content:'Alert '+type,ack_required:true,type}]:[]};}
function plan(prepared,records=[]){return B.planBundle({prepared,records,request_id:UUID,payload_hash:HASH,lock_owner:'123',now:NOW});}

test('two rule observations create one atomic global revision',()=>{const r=plan([item('WRONG_PROCESS','ps-1'),item('NO_ACTIVITY','ps-2')]);assert.equal(r.execute,true);const keys=r.batch.records.map(x=>x.row.record_key);assert.equal(keys.filter(k=>k==='STATE:COMM_GLOBAL').length,1);assert.equal(new Set(keys).size,keys.length);assert.equal(new Set(r.batch.records.map(x=>x.row.revision)).size,1);assert.equal(r.batch.response.revision,1);assert.deepEqual(r.batch.response.types,['WRONG_PROCESS','NO_ACTIVITY']);});
test('three distinct rules may share one batch',()=>{const r=plan([item('WRONG_PROCESS','a'),item('WORK_OUTSIDE_APP','b'),item('NO_ACTIVITY','c')]);assert.equal(r.batch.records.filter(x=>x.row.kind==='EPISODE').length,3);assert.equal(r.batch.records.filter(x=>x.row.kind==='STATE').length,1);});
test('multiple deliveries remain unique in one batch',()=>{const r=plan([item('WRONG_PROCESS','a',true),item('WORK_OUTSIDE_APP','b',true)]);const ds=r.batch.records.filter(x=>x.row.kind==='DELIVERY');assert.equal(ds.length,2);assert.equal(new Set(ds.map(x=>x.row.record_key)).size,2);});
test('duplicate rule type is rejected',()=>assert.throws(()=>plan([item('WRONG_PROCESS','a'),item('WRONG_PROCESS','b')]),e=>e.code==='COMM_ES_BUNDLE_DUPLICATE_TYPE'));
test('no-change decisions do not create a batch',()=>{const disabled=t=>({type:t,decision:{ok:true,status:'DISABLED',reason:'RULE_DISABLED',open:null,resolve:[],deliver:false},delivery_intents:[]});const r=plan([disabled('WRONG_PROCESS'),disabled('NO_ACTIVITY')]);assert.equal(r.execute,false);assert.equal(r.revision,0);});
console.log('TOTAL '+count);
