'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../backend/v2/communication/alert-cutover.cjs');
const initial=JSON.parse(fs.readFileSync('backend/v2/communication/config.initial.json','utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function throws(fn,code){assert.throws(fn,e=>e.code===code);}

test('initial policy is fail closed',()=>assert.deepEqual(C.alertSourceDecision(initial,{id:11,type:'ALERT_DERIVED',status:'PENDING'}),{consume:false,reason:'CONSUMER_DISABLED'}));
test('enabled consumer requires explicit cutover',()=>{const c=copy(initial);c.auto_alert_consumer_enabled=true;throws(()=>C.alertSourceDecision(c,{id:11,type:'ALERT_DERIVED',status:'PENDING'}),'COMM_ALERT_CUTOVER_REQUIRED');});
test('legacy row at cutover is held',()=>{const c=copy(initial);c.auto_alert_consumer_enabled=true;c.alert_cutover_outbox_id=10;assert.deepEqual(C.alertSourceDecision(c,{id:10,type:'ALERT_DERIVED',status:'PENDING'}),{consume:false,reason:'LEGACY_HOLD'});});
test('legacy row below cutover is held',()=>{const c=copy(initial);c.auto_alert_consumer_enabled=true;c.alert_cutover_outbox_id=10;assert.deepEqual(C.alertSourceDecision(c,{id:9,type:'ALERT_DERIVED',status:'PENDING'}),{consume:false,reason:'LEGACY_HOLD'});});
test('new pending row after cutover is eligible',()=>{const c=copy(initial);c.auto_alert_consumer_enabled=true;c.alert_cutover_outbox_id=10;assert.deepEqual(C.alertSourceDecision(c,{id:11,type:'ALERT_DERIVED',status:'PENDING'}),{consume:true,reason:null});});
test('new completed row is not consumed',()=>{const c=copy(initial);c.auto_alert_consumer_enabled=true;c.alert_cutover_outbox_id=10;assert.deepEqual(C.alertSourceDecision(c,{id:11,type:'ALERT_DERIVED',status:'DONE'}),{consume:false,reason:'NOT_PENDING'});});
test('other outbox type is not consumed',()=>{const c=copy(initial);c.auto_alert_consumer_enabled=true;c.alert_cutover_outbox_id=10;assert.deepEqual(C.alertSourceDecision(c,{id:11,type:'ES_DERIVED',status:'PENDING'}),{consume:false,reason:'NOT_ALERT_DERIVED'});});
test('invalid source id fails closed',()=>{const c=copy(initial);c.auto_alert_consumer_enabled=true;c.alert_cutover_outbox_id=10;throws(()=>C.alertSourceDecision(c,{id:'11',type:'ALERT_DERIVED',status:'PENDING'}),'COMM_ALERT_SOURCE_INVALID');});
test('history policy must remain HOLD',()=>{const c=copy(initial);c.history_policy='PROCESS_OLD';throws(()=>C.alertSourceDecision(c,{id:11,type:'ALERT_DERIVED',status:'PENDING'}),'COMM_ALERT_CUTOVER_INVALID');});
console.log('TOTAL '+count);
