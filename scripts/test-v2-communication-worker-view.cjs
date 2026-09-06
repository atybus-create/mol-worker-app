'use strict';
const assert=require('node:assert/strict');
const {assembleWorkerView}=require('../backend/v2/metrics/worker-view.cjs');
let total=0;function test(name,fn){fn();total++;console.log('PASS '+name)}
const now='2026-09-06T08:00:00.000Z',actor={employee_id:'MOL004',display_name:'Worker',role:'WORKER'};
const base={employee:{employee_id:'MOL004',display_name:'Worker'},work_date:'2026-09-06',attendance:null,open_day:null,active_process:null,process_sessions:[],process_catalog:[],notifications:[],moniti_enabled:false,writes_enabled:true};
const norm={schema_version:1,employee_id:'MOL004',month:'2026-09',days:[],monthly:{pak_percent:null,pick_percent:null,combined_percent:null,eligible_pak:0,eligible_pick:0,outside_pak:0,outside_pick:0,reason:'NO_ELIGIBLE_PROCESS_TIME',freshness:'UNAVAILABLE',has_value:false,coverage:'UNOBSERVED',calculated_at:now,version:1}};
const bundles=[{summary_id:'MOL004:2026-09',version:1,payload_json:JSON.stringify(norm)}];
const delivery=(over={})=>({record_key:'DELIVERY:M1',kind:'DELIVERY',scope_id:'MOL004',revision:5,payload_json:JSON.stringify({message_id:'M1',recipient_id:'MOL004',shown_at:null,valid_until:null,...over})});
const event=(revision=5)=>({record_key:'EVENT:E1',kind:'EVENT',scope_id:'MOL004',revision,payload_json:'{}'});
const view=(extra={})=>assembleWorkerView({base,actor,month:'2026-09',bundles,now,...extra});
test('empty communication state is explicit',()=>{const r=view();assert.equal(r.data.unread_messages,0);assert.equal(r.data.messages_available,false);assert.equal(r.data.communication_revision,0)});
test('unread delivery affects coherent snapshot',()=>{const d=delivery(),r=view({comm_rows:[d],comm_any:[d],comm_events:[event()]});assert.equal(r.data.unread_messages,1);assert.equal(r.data.messages_available,true);assert.equal(r.data.communication_revision,5);assert.equal(r.data.snapshot_version,1)});
test('shown message increments snapshot without clearing norms',()=>{const d=delivery(),first=view({comm_rows:[d],comm_any:[d],comm_events:[event(5)]});const prior=first.row,shown=delivery({shown_at:'2026-09-06T07:59:00.000Z'}),second=view({previous:prior,comm_rows:[],comm_any:[shown],comm_events:[event(6)]});assert.equal(second.data.unread_messages,0);assert.equal(second.data.messages_available,true);assert.equal(second.data.communication_revision,6);assert.equal(second.data.snapshot_version,2);assert.deepEqual(second.data.norm,first.data.norm)});
test('expired unread record is excluded',()=>{const d=delivery({valid_until:'2026-09-06T07:00:00.000Z'}),r=view({comm_rows:[d],comm_any:[d],comm_events:[event()]});assert.equal(r.data.unread_messages,0);assert.equal(r.data.messages_available,true)});
test('foreign delivery cannot increment actor unread count',()=>{const d=delivery({recipient_id:'MOL015'}),r=view({comm_rows:[d],comm_any:[],comm_events:[]});assert.equal(r.data.unread_messages,0);assert.equal(r.data.messages_available,false)});
test('same communication revision and fingerprint reuses snapshot version',()=>{const d=delivery(),first=view({comm_rows:[d],comm_any:[d],comm_events:[event()]});const second=view({previous:first.row,comm_rows:[d],comm_any:[d],comm_events:[event()]});assert.equal(second.reused,true);assert.equal(second.row,null);assert.equal(second.data.snapshot_version,1)});
test('duplicate latest communication rows fail closed',()=>assert.throws(()=>view({comm_events:[event(5),{...event(5),record_key:'EVENT:E2'}]}),/COMM_STATUS_DUPLICATE/));
console.log(`Communication worker view PASS: ${total} cases.`);
