'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const S=require('../backend/v2/communication/alert-source.cjs');
const initial=JSON.parse(fs.readFileSync('backend/v2/communication/config.initial.json','utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function throws(fn,code){assert.throws(fn,e=>e.code===code);}
function enabled(){const c=copy(initial);c.mode='LIVE';c.auto_alert_consumer_enabled=true;c.alert_cutover_outbox_id=10;c.es_verified=true;c.rules.WRONG_PROCESS.enabled=true;c.rules.WRONG_PROCESS.ack_required=false;return c;}
function row(over={}){return {id:11,outbox_id:'ES-123:MOL004:2026-09-08:derived:alerts',request_id:'ES-123',aggregate_id:'MOL004:2026-09-08',type:'ALERT_DERIVED',payload_json:JSON.stringify({employee_id:'MOL004',work_date:'2026-09-08',batch_id:'ES-123'}),status:'PENDING',attempts:0,next_attempt_at:'2026-09-08T08:00:00.000Z',lease_owner:'',lease_until:'1970-01-01T00:00:00.000Z',...over};}
const now='2026-09-08T08:01:00.000Z';
test('consumer off stops before source read',()=>assert.deepEqual(S.sourceGate(initial),{read_source:false,reason:'CONSUMER_DISABLED',cutover:null}));
test('consumer on without ES verification stops',()=>{const c=enabled();c.es_verified=false;assert.deepEqual(S.sourceGate(c),{read_source:false,reason:'ES_VALIDATION_REQUIRED',cutover:10});});
test('consumer on without enabled ES rule stops',()=>{const c=enabled();c.rules.WRONG_PROCESS.enabled=false;assert.deepEqual(S.sourceGate(c),{read_source:false,reason:'ES_RULES_DISABLED',cutover:10});});
test('eligible source requires consumer ES and rule gates',()=>assert.deepEqual(S.sourceGate(enabled()),{read_source:true,reason:null,cutover:10}));
test('legacy row remains held',()=>assert.deepEqual(S.decideRow(enabled(),row({id:10}),now),{consume:false,reason:'LEGACY_HOLD'}));
test('future due row is eligible',()=>assert.deepEqual(S.decideRow(enabled(),row(),now),{consume:true,reason:null,employee_id:'MOL004',work_date:'2026-09-08',batch_id:'ES-123',outbox_id:'ES-123:MOL004:2026-09-08:derived:alerts',id:11}));
test('future row not due remains pending',()=>assert.deepEqual(S.decideRow(enabled(),row({next_attempt_at:'2026-09-08T08:02:00.000Z'}),now),{consume:false,reason:'NOT_DUE'}));
test('leased row is not eligible',()=>assert.deepEqual(S.decideRow(enabled(),row({lease_until:'2026-09-08T08:02:00.000Z'}),now),{consume:false,reason:'LEASED'}));
test('completed row is not eligible',()=>assert.deepEqual(S.decideRow(enabled(),row({status:'DONE'}),now),{consume:false,reason:'NOT_PENDING'}));
test('invalid payload fails closed',()=>throws(()=>S.decideRow(enabled(),row({payload_json:'{}'}),now),'COMM_ALERT_SOURCE_INVALID'));
test('scope mismatch fails closed',()=>throws(()=>S.decideRow(enabled(),row({aggregate_id:'MOL015:2026-09-08'}),now),'COMM_ALERT_SOURCE_SCOPE_INVALID'));
test('bad time fails closed',()=>throws(()=>S.decideRow(enabled(),row(),'bad-time'),'COMM_ALERT_SOURCE_TIME_INVALID'));
console.log('TOTAL '+count);
