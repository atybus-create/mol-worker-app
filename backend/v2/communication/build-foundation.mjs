import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {graph,ex,manifest} from '../metrics/graph.mjs';
const require=createRequire(import.meta.url),D=require('./domain.cjs');
const fn=names=>names.map(n=>D[n].toString()).join('\n')+'\n';
const base=fn(['requireValue','object','canonical','integer','requestId']);
const records=base+'const RECORD_FIELDS='+JSON.stringify(D.RECORD_FIELDS)+';\n'+fn(['validateRecord','sameRecord','decideRecord']);
const batches=records+fn(['iso','validateBatch','chooseBatch']);
const ref=n=>`$('${n}').first().json`;
function checkLock(g,inputNode,name='Read Lock',check='Check Lock') {
  g.table(name,'LOCKS','get',[['lock_key','command-writer'],['owner',ex(ref(inputNode)+'.lock_owner')]]);
  g.code(check,`const rows=$input.all().map(x=>x.json).filter(r=>r.lock_key),i=${ref(inputNode)};if(rows.length!==1||rows[0].owner!==i.lock_owner)throw Error('COMM_LOCK_LOST');return [{json:{ok:true}}];`);
  g.link(name,check);
}
export function communicationRecordWriter(){
  const g=graph('COMM RECORD WRITER',30);g.input();
  g.code('Validate Input',String.raw`const i=$input.first().json;if(typeof i.lock_owner!=='string'||!/^\d+$/.test(i.lock_owner)||!i.row||typeof i.row.record_key!=='string'||!i.row.record_key)throw Error('COMM_RECORD_INVALID');return [{json:i}];`);
  checkLock(g,'Validate Input');
  g.table('Read Existing','COMM_RECORDS','get',[['record_key',ex(ref('Validate Input')+'.row.record_key')]]);
  g.code('Decide Write',records+`const i=${ref('Validate Input')},rows=$input.all().map(x=>x.json).filter(r=>r.record_key);requireValue(rows.length<=1,'COMM_DUPLICATE_RECORD');const d=decideRecord(rows[0],i.row,i.expected_version);return [{json:{...d,verified:!d.write,record_key:i.row.record_key}}];`);
  g.test('Write Needed','$json.write === true');
  g.table('Write Record','COMM_RECORDS','upsert',[['record_key',ex(ref('Validate Input')+'.row.record_key')]],g.map('COMM_RECORDS',ref('Validate Input')+'.row'));
  g.table('Read Back','COMM_RECORDS','get',[['record_key',ex(ref('Validate Input')+'.row.record_key')]]);
  g.code('Verify Record',`const i=${ref('Validate Input')},rows=$input.all().map(x=>x.json).filter(r=>r.record_key),fields=${JSON.stringify(D.RECORD_FIELDS)};if(rows.length!==1||fields.some(k=>rows[0][k]!==i.row[k]))throw Error('COMM_WRITE_NOT_CONFIRMED');return [{json:{ok:true,verified:true,replayed:false,record_key:i.row.record_key}}];`);
  g.code('Return','return $input.all();');
  g.chain('Input','Validate Input','Read Lock');g.chain('Check Lock','Read Existing','Decide Write','Write Needed');g.link('Write Needed','Write Record');g.link('Write Needed','Return',1);g.chain('Write Record','Read Back','Verify Record','Return');return g;
}
export function communicationBatchService(writerId=manifest.workflows.comm_record_writer){
  if(!writerId)throw Error('COMM_WRITER_ID_REQUIRED');
  const g=graph('COMM BATCH SERVICE',120);g.input();
  g.code('Validate Input',base+fn(['validateBatch']).replace('validateRecord(r.row);','')+`const i=$input.first().json;validateBatch(i);return [{json:i}];`);
  // Full record and frozen-plan validation occurs after lock and journal reads below.
  checkLock(g,'Validate Input');
  g.table('Read Journal','COMM_COMMANDS','get',[['request_id',ex(ref('Validate Input')+'.request_id')]]);
  g.table('Read Pending','COMM_COMMANDS','get',[['status','PREPARED']]);
  g.code('Plan',batches+`const i=${ref('Validate Input')},old=$('Read Journal').all().map(x=>x.json).filter(r=>r.request_id),pending=$input.all().map(x=>x.json).filter(r=>r.request_id);requireValue(old.length<=1,'COMM_JOURNAL_DUPLICATE');return [{json:chooseBatch(i,old[0],pending,new Date().toISOString())}];`);
  g.test('Write Needed','$json.write === true');
  const i=ref('Validate Input'),p=ref('Plan');
  g.table('Save Intent','COMM_COMMANDS','upsert',[['request_id',ex(i+'.request_id')]],{
    request_id:ex(i+'.request_id'),payload_hash:ex(i+'.payload_hash'),actor_id:ex(i+'.actor_id'),operation:ex(i+'.operation'),status:'PREPARED',
    plan_json:ex('JSON.stringify('+p+'.plan)'),response_json:ex('JSON.stringify('+p+'.plan.response)'),prepared_at:ex(p+'.prepared_at'),committed_at:null});
  g.table('Read Intent','COMM_COMMANDS','get',[['request_id',ex(i+'.request_id')]]);
  g.code('Verify Intent',`const i=${i},p=${p},rows=$input.all().map(x=>x.json).filter(r=>r.request_id),r=rows[0];if(rows.length!==1||r.request_id!==i.request_id||r.payload_hash!==i.payload_hash||r.actor_id!==i.actor_id||r.operation!==i.operation||r.status!=='PREPARED'||r.plan_json!==JSON.stringify(p.plan)||r.response_json!==JSON.stringify(p.plan.response)||Date.parse(r.prepared_at)!==Date.parse(p.prepared_at))throw Error('COMM_INTENT_NOT_CONFIRMED');return [{json:{ok:true}}];`);
  g.code('Records',`const i=${i},p=${p};return p.plan.records.map(r=>({json:{...r,lock_owner:i.lock_owner}}));`);
  g.execute('Write Records',writerId,'each');
  g.code('Verify Results',`const wanted=${p}.plan.records.map(r=>r.row.record_key),got=$input.all().map(x=>x.json);if(got.length!==wanted.length||new Set(got.map(r=>r.record_key)).size!==wanted.length||got.some(r=>r.verified!==true||!wanted.includes(r.record_key)))throw Error('COMM_BATCH_NOT_CONFIRMED');return [{json:{ok:true}}];`);
  checkLock(g,'Validate Input','Read Commit Lock','Check Commit Lock');
  g.table('Commit Journal','COMM_COMMANDS','update',[['request_id',ex(i+'.request_id')],['payload_hash',ex(i+'.payload_hash')],['status','PREPARED']],{status:'COMMITTED',committed_at:ex('$now.toISO()')});
  g.table('Read Commit','COMM_COMMANDS','get',[['request_id',ex(i+'.request_id')]]);
  g.code('Verify Commit',`const i=${i},p=${p},rows=$input.all().map(x=>x.json).filter(r=>r.request_id),r=rows[0];if(rows.length!==1||r.status!=='COMMITTED'||r.request_id!==i.request_id||r.payload_hash!==i.payload_hash||r.actor_id!==i.actor_id||r.operation!==i.operation||r.plan_json!==JSON.stringify(p.plan)||r.response_json!==JSON.stringify(p.plan.response)||!Number.isFinite(Date.parse(r.committed_at)))throw Error('COMM_COMMIT_NOT_CONFIRMED');return [{json:{ok:true,committed:true,replayed:false,request_id:i.request_id,response:p.plan.response}}];`);
  g.code('Replay',`return [{json:{ok:true,committed:true,replayed:true,request_id:${i}.request_id,response:${p}.response}}];`);
  g.code('Return','return $input.all();');
  g.chain('Input','Validate Input','Read Lock');g.chain('Check Lock','Read Journal','Read Pending','Plan','Write Needed');g.link('Write Needed','Save Intent');g.link('Write Needed','Replay',1);g.chain('Replay','Return');g.chain('Save Intent','Read Intent','Verify Intent','Records','Write Records','Verify Results','Read Commit Lock');g.chain('Check Commit Lock','Commit Journal','Read Commit','Verify Commit','Return');return g;
}
if(process.argv[1]?.endsWith('/communication/build-foundation.mjs')){
 const outputs={'comm-record-writer':communicationRecordWriter()};
 if(manifest.workflows.comm_record_writer)outputs['comm-batch-service']=communicationBatchService();
 for(const [name,g]of Object.entries(outputs)){writeFileSync(new URL('../workflows/'+name+'.json',import.meta.url),JSON.stringify(g,null,2)+'\n');console.log(name+': '+g.nodes.length+' nodes');}
}
