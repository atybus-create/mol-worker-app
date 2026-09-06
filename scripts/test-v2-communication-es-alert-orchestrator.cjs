'use strict';
const assert=require('node:assert/strict');
const O=require('../backend/v2/communication/es-alert-orchestrator.cjs');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const throws=(fn,code)=>assert.throws(fn,e=>e.code===code||e.message===code);
const config=[{key:'COMMUNICATIONS_CONFIG',value_json:'{}'}];
function invocation(type='WRONG_PROCESS'){return {type,config_rows:config,source:{employee:{employee_id:'MOL004'}},episodes:[]};}
function episode(type='WRONG_PROCESS'){return {episode_id:'MOL004|'+type+'|ps-1',employee_id:'MOL004',type,anchor:'ps-1',status:'OPEN',opened_at:'2026-09-08T08:00:00.000Z',resolved_at:null,resolution_reason:null,version:1,details:{ack_required:true}};}
function openResult(type='WRONG_PROCESS',deliver=true){return {ok:true,status:'OPEN',reason:null,open:episode(type),resolve:[],deliver};}

test('supports exactly three ES types',()=>assert.deepEqual([...O.TYPES].sort(),['NO_ACTIVITY','WORK_OUTSIDE_APP','WRONG_PROCESS']));
test('disabled result normalizes to safe no-op',()=>{const r=O.prepareDecision({invocation:invocation(),rule_result:{ok:true,status:'DISABLED',reason:'RULE_DISABLED'}});assert.equal(r.ok,true);assert.equal(r.persist,false);assert.equal(r.decision.deliver,false);assert.deepEqual(r.decision.resolve,[]);assert.equal(r.decision.open,null);});
test('rule engine failure fails bundle without persistence',()=>{const c={invocations:[invocation()]};const r=O.prepareBundle({context:c,results:[{ok:false,error_code:'COMM_TEST_FAILURE'}]});assert.equal(r.ok,false);assert.equal(r.persist,false);assert.equal(r.error_code,'COMM_TEST_FAILURE');});
test('clear result does not persist',()=>{const r=O.prepareDecision({invocation:invocation(),rule_result:{ok:true,status:'CLEAR',reason:null,open:null,resolve:[],deliver:false}});assert.equal(r.persist,false);});
test('observe-only open episode may persist with no delivery',()=>{const r=O.prepareDecision({invocation:invocation(),rule_result:openResult('WRONG_PROCESS',false)});assert.equal(r.persist,true);assert.deepEqual(r.delivery_intents,[]);});
test('live delivery without approved policy fails closed',()=>throws(()=>O.prepareDecision({invocation:invocation(),rule_result:openResult()}),'COMM_ES_DELIVERY_POLICY_REQUIRED'));
test('explicit delivery policy is accepted when ACK matches',()=>{const r=O.prepareDecision({invocation:invocation(),rule_result:openResult(),delivery_intents:[{recipient_id:'MOL004',content:'Zatwierdzona tresc',ack_required:true}]});assert.equal(r.persist,true);assert.deepEqual(r.delivery_intents,[{recipient_id:'MOL004',content:'Zatwierdzona tresc',ack_required:true,type:'WRONG_PROCESS'}]);});
test('delivery ACK mismatch is rejected',()=>throws(()=>O.prepareDecision({invocation:invocation(),rule_result:openResult(),delivery_intents:[{recipient_id:'MOL004',content:'x',ack_required:false}]}),'COMM_ES_DELIVERY_POLICY_INVALID'));
test('duplicate delivery recipients are rejected',()=>throws(()=>O.prepareDecision({invocation:invocation(),rule_result:openResult(),delivery_intents:[{recipient_id:'MOL004',content:'x',ack_required:true},{recipient_id:'MOL004',content:'y',ack_required:true}]}),'COMM_ES_DELIVERY_POLICY_INVALID'));
test('hidden intents while deliver=false are rejected',()=>throws(()=>O.prepareDecision({invocation:invocation(),rule_result:openResult('WRONG_PROCESS',false),delivery_intents:[{recipient_id:'MOL004',content:'x',ack_required:true}]}),'COMM_ES_DELIVERY_POLICY_INVALID'));
test('unknown successful rule status is rejected',()=>throws(()=>O.prepareDecision({invocation:invocation(),rule_result:{ok:true,status:'MAGIC',open:null,resolve:[],deliver:false}}),'COMM_ES_RULE_RESULT_INVALID'));
test('bundle preserves invocation order',()=>{const c={invocations:[invocation('WRONG_PROCESS'),invocation('WORK_OUTSIDE_APP'),invocation('NO_ACTIVITY')]};const disabled=t=>({ok:true,status:'DISABLED',reason:t});const r=O.prepareBundle({context:c,results:[disabled('A'),disabled('B'),disabled('C')]});assert.equal(r.ok,true);assert.deepEqual(r.prepared.map(x=>x.type),['WRONG_PROCESS','WORK_OUTSIDE_APP','NO_ACTIVITY']);assert.equal(r.persist,false);});
test('source unavailable is accepted as a no-write result',()=>{const r=O.prepareDecision({invocation:invocation('NO_ACTIVITY'),rule_result:{ok:true,status:'SOURCE_UNAVAILABLE',reason:'ES_SOURCE_NOT_FRESH',open:null,resolve:[],deliver:false}});assert.equal(r.ok,true);assert.equal(r.persist,false);});
console.log('TOTAL '+count);
