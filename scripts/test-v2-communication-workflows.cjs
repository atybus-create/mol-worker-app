'use strict';
// Executes the actual generated Code nodes with mocked input data, never n8n data.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../backend/v2/communication/domain.cjs');
const writer=JSON.parse(fs.readFileSync('backend/v2/workflows/comm-record-writer.json','utf8'));
const batch=JSON.parse(fs.readFileSync('backend/v2/workflows/comm-batch-service.json','utf8'));
const now='2026-09-05T08:00:00.000Z',id='88000000-0000-4000-8000-000000000001';
const row={record_key:'EVENT:'+id,kind:'EVENT',scope_id:'V2_COMM_TEST',version:1,revision:1,payload_json:'{"fixture":true}',last_request_id:id};
const single={lock_owner:'1234',row,expected_version:0};
const multi={lock_owner:'1234',request_id:id,payload_hash:'a'.repeat(64),actor_id:'V2_COMM_TEST',operation:'PROBE',records:[{row,expected_version:0}],response:{ok:true,fixture:true}};
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function code(w,name,items=[],nodes={}){
 const js=w.nodes.find(n=>n.name===name).parameters.jsCode;
 const context={__items:items,__nodes:nodes};
 // Construct JSON data in the VM realm, as n8n does. No require/structuredClone dependency.
 const pre=`const items=JSON.parse(${JSON.stringify(JSON.stringify(items))}),nodes=JSON.parse(${JSON.stringify(JSON.stringify(nodes))});const $input={first:()=>({json:items[0]||{}}),all:()=>items.map(json=>({json}))};const $=name=>({first:()=>({json:(nodes[name]||[])[0]||{}}),all:()=>(nodes[name]||[]).map(json=>({json}))});`;
 return JSON.parse(JSON.stringify(vm.runInNewContext(pre+'(function(){'+js+'})()',context)));
}
for(const w of [writer,batch]){
 test(w.name+' has no public trigger or external HTTP',()=>assert.ok(w.nodes.every(n=>!['n8n-nodes-base.webhook','n8n-nodes-base.scheduleTrigger','n8n-nodes-base.httpRequest'].includes(n.type))));
 test(w.name+' only uses V2 tables',()=>{const allowed=new Set(['uKfyrOkB2zoSEuBH','42jIxvSmSVGdlxB8','7JVuBY9l6ISR2YBz']);for(const n of w.nodes.filter(n=>n.type.endsWith('.dataTable')))assert.ok(allowed.has(n.parameters.dataTableId.value));});
 test(w.name+' read nodes are bounded and run once',()=>{for(const n of w.nodes.filter(n=>n.type.endsWith('.dataTable')&&n.parameters.operation==='get')){assert.equal(n.parameters.limit,2);assert.equal(n.alwaysOutputData,true);assert.equal(n.executeOnce,true);}});
 test(w.name+' Code syntax valid',()=>{for(const n of w.nodes.filter(n=>n.type.endsWith('.code')))new Function('$','$input',n.parameters.jsCode);});
 test(w.name+' connections resolve to unique nodes',()=>{const names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length);for(const [source,c]of Object.entries(w.connections)){assert.ok(names.has(source));for(const a of c.main)for(const e of a)assert.ok(names.has(e.node));}});
}
test('writer rejects missing inherited lock ID',()=>assert.throws(()=>code(writer,'Validate Input',[{...single,lock_owner:''}]),/COMM_RECORD_INVALID/));
test('writer rejects missing owner lock even for replay',()=>assert.throws(()=>code(writer,'Check Lock',[],{'Validate Input':[single]}),/COMM_LOCK_LOST/));
test('writer rejects duplicated lock rows',()=>assert.throws(()=>code(writer,'Check Lock',[{lock_key:'command-writer',owner:'1234'},{lock_key:'command-writer',owner:'1234'}],{'Validate Input':[single]}),/COMM_LOCK_LOST/));
test('writer accepts only matching lock owner',()=>assert.equal(code(writer,'Check Lock',[{lock_key:'command-writer',owner:'1234'}],{'Validate Input':[single]})[0].json.ok,true));
test('generated writer validates new record',()=>assert.equal(code(writer,'Decide Write',[],{'Validate Input':[single]})[0].json.write,true));
test('generated writer exact replay is verified',()=>assert.equal(code(writer,'Decide Write',[{...row,id:123}],{'Validate Input':[single]})[0].json.verified,true));
test('generated writer duplicate record rejected',()=>assert.throws(()=>code(writer,'Decide Write',[row,row],{'Validate Input':[single]}),/COMM_DUPLICATE_RECORD/));
test('generated writer immutable audit enforced',()=>assert.throws(()=>code(writer,'Decide Write',[row],{'Validate Input':[{...single,row:{...row,version:2,revision:2},expected_version:1}]}),/COMM_EVENT_IMMUTABLE/));
test('generated writer exact read-back accepted',()=>assert.equal(code(writer,'Verify Record',[row],{'Validate Input':[single]})[0].json.verified,true));
test('generated writer missing read-back fails',()=>assert.throws(()=>code(writer,'Verify Record',[],{'Validate Input':[single]}),/COMM_WRITE_NOT_CONFIRMED/));
test('generated writer changed persisted payload fails',()=>assert.throws(()=>code(writer,'Verify Record',[{...row,payload_json:'{}'}],{'Validate Input':[single]}),/COMM_WRITE_NOT_CONFIRMED/));
test('batch input validation executes',()=>assert.equal(code(batch,'Validate Input',[multi])[0].json.request_id,id));
const plan=D.chooseBatch(multi,null,[],now);
const journal={request_id:id,payload_hash:multi.payload_hash,actor_id:multi.actor_id,operation:'PROBE',status:'PREPARED',plan_json:JSON.stringify(plan.plan),response_json:JSON.stringify(plan.plan.response),prepared_at:now,committed_at:null};
test('generated batch plans new request',()=>assert.equal(code(batch,'Plan',[],{'Validate Input':[multi],'Read Journal':[]})[0].json.write,true));
test('generated batch detects conflicting pending command',()=>assert.throws(()=>code(batch,'Plan',[{request_id:'other'}],{'Validate Input':[multi],'Read Journal':[]}),/COMM_RECOVERY_REQUIRED/));
test('generated batch frozen retry retains original response',()=>assert.deepEqual(code(batch,'Plan',[journal],{'Validate Input':[{...multi,response:{changed:true}}],'Read Journal':[journal]})[0].json.plan.response,multi.response));
test('generated batch verifies stored intent',()=>assert.equal(code(batch,'Verify Intent',[journal],{'Validate Input':[multi],'Plan':[plan]})[0].json.ok,true));
test('generated batch rejects altered stored intent',()=>assert.throws(()=>code(batch,'Verify Intent',[{...journal,plan_json:'{}'}],{'Validate Input':[multi],'Plan':[plan]}),/COMM_INTENT_NOT_CONFIRMED/));
test('records inherit parent lock owner',()=>assert.equal(code(batch,'Records',[],{'Validate Input':[multi],'Plan':[plan]})[0].json.lock_owner,'1234'));
test('batch refuses partial child success',()=>assert.throws(()=>code(batch,'Verify Results',[],{'Plan':[plan]}),/COMM_BATCH_NOT_CONFIRMED/));
test('batch refuses duplicate writer response',()=>assert.throws(()=>code(batch,'Verify Results',[{verified:true,record_key:row.record_key},{verified:true,record_key:row.record_key}],{'Plan':[plan]}),/COMM_BATCH_NOT_CONFIRMED/));
test('batch checks all written IDs',()=>assert.equal(code(batch,'Verify Results',[{verified:true,record_key:row.record_key}],{'Plan':[plan]})[0].json.ok,true));
test('batch rechecks lock before commit',()=>assert.throws(()=>code(batch,'Check Commit Lock',[],{'Validate Input':[multi]}),/COMM_LOCK_LOST/));
test('commit requires persisted COMMITTED',()=>assert.throws(()=>code(batch,'Verify Commit',[journal],{'Validate Input':[multi],'Plan':[plan]}),/COMM_COMMIT_NOT_CONFIRMED/));
test('commit response verified',()=>assert.equal(code(batch,'Verify Commit',[{...journal,status:'COMMITTED',committed_at:now}],{'Validate Input':[multi],'Plan':[plan]})[0].json.committed,true));
test('child writer runs one record per execution',()=>assert.equal(batch.nodes.find(n=>n.name==='Write Records').parameters.mode,'each'));
console.log(`Communication generated workflows PASS: ${count} isolated cases; persistence simulation only.`);
