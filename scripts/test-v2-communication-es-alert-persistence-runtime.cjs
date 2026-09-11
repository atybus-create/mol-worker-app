'use strict';
const assert=require('node:assert/strict');
const Full=require('../backend/v2/communication/es-alert-persistence.cjs');
const Runtime=require('../backend/v2/communication/es-alert-persistence-runtime.cjs');
const D=require('../backend/v2/communication/domain.cjs');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const UUID1='11111111-1111-4111-8111-111111111111',UUID2='22222222-2222-4222-8222-222222222222',UUID3='33333333-3333-4333-8333-333333333333';
const HASH='a'.repeat(64),NOW='2026-09-08T08:00:00.000Z';
function episode(type,anchor='ps-1',employee_id='MOL004'){
  const details={ack_required:true};
  if(type==='WRONG_PROCESS')Object.assign(details,{process_session_id:anchor,attendance_id:employee_id+':2026-09-08',metric:'PAK',delta_id:'D-1'});
  if(type==='WORK_OUTSIDE_APP')Object.assign(details,{first_delta_id:anchor,attendance_id:null});
  if(type==='NO_ACTIVITY')Object.assign(details,{process_session_id:anchor,attendance_id:employee_id+':2026-09-08',metric:'PAK',activity_anchor_at:'2026-09-08T07:50:00.000Z',threshold_seconds:300});
  return {episode_id:employee_id+'|'+type+'|'+anchor,employee_id,type,anchor,status:'OPEN',opened_at:NOW,resolved_at:null,resolution_reason:null,version:1,details};
}
const decision=(ep,deliver=true)=>({status:'OPEN',reason:null,open:ep,resolve:[],deliver});
const intent=(ep,recipient_id=ep.employee_id,content='Test alert')=>({recipient_id,content,ack_required:ep.details.ack_required,type:ep.type});
const resolve=(ep,reason='PROCESS_CHANGED',at='2026-09-08T08:01:00.000Z')=>({...ep,status:'RESOLVED',resolved_at:at,resolution_reason:reason,version:ep.version+1});
const base=(type,decision,delivery_intents=[],records=[],request_id=UUID1,now=NOW)=>({type,decision,delivery_intents,records,request_id,payload_hash:HASH,lock_owner:'123',now});
const rows=batch=>batch.records.map(x=>({...x.row}));
function outcome(mod,args){try{return {ok:true,value:mod.planBatch(args)}}catch(e){return {ok:false,code:e.code||e.message}}}
function parity(name,args){test(name,()=>assert.deepEqual(outcome(Runtime,args),outcome(Full,args)));}

for(const type of ['WRONG_PROCESS','WORK_OUTSIDE_APP','NO_ACTIVITY']){const ep=episode(type);parity(type+' new episode parity',base(type,decision(ep),[intent(ep)]));}
{
  const ep=episode('WORK_OUTSIDE_APP');
  parity('two recipient batch parity',base(ep.type,decision(ep),[intent(ep,'MOL004','Pracownik'),intent(ep,'MOL014','Lider')]));
}
{
  const ep=episode('WRONG_PROCESS'),first=Full.planBatch(base(ep.type,decision(ep),[intent(ep)]));
  parity('idempotent existing episode parity',base(ep.type,decision(ep),[intent(ep)],rows(first.batch),UUID2,'2026-09-08T08:00:30.000Z'));
}
{
  const ep=episode('NO_ACTIVITY'),observed=Full.planBatch(base(ep.type,decision(ep,false),[]));
  parity('observe to delivery policy error parity',base(ep.type,decision(ep,true),[intent(ep)],rows(observed.batch),UUID2,'2026-09-08T08:01:00.000Z'));
}
{
  const ep=episode('WRONG_PROCESS'),first=Full.planBatch(base(ep.type,decision(ep),[intent(ep)]));
  parity('resolve episode parity',base(ep.type,{status:'RESOLVED',reason:null,open:null,resolve:[resolve(ep)],deliver:false},[],rows(first.batch),UUID2,'2026-09-08T08:01:00.000Z'));
}
{
  const ep=episode('NO_ACTIVITY'),first=Full.planBatch(base(ep.type,decision(ep),[intent(ep)])),records=rows(first.batch);
  const drow=records.find(r=>r.kind==='DELIVERY'),d=JSON.parse(drow.payload_json);
  Object.assign(d,{shown_at:'2026-09-08T08:00:10.000Z',ack_at:'2026-09-08T08:00:20.000Z',delivery_status:'ACKNOWLEDGED',version:2});drow.version=2;drow.revision=2;drow.payload_json=D.canonical(d);
  const state=records.find(r=>r.record_key==='STATE:COMM_GLOBAL');state.version=2;state.revision=2;state.payload_json=D.canonical({revision:2});
  parity('resolve preserves ACK parity',base(ep.type,{status:'RESOLVED',reason:null,open:null,resolve:[resolve(ep,'ACTIVITY_RESUMED','2026-09-08T08:02:00.000Z')],deliver:false},[],records,UUID3,'2026-09-08T08:02:00.000Z'));
}
{
  const old=episode('WRONG_PROCESS','ps-old'),first=Full.planBatch(base(old.type,decision(old),[intent(old)])),fresh=episode('WRONG_PROCESS','ps-new');
  parity('resolve old and open new parity',base(old.type,{status:'OPEN',reason:null,open:fresh,resolve:[resolve(old)],deliver:true},[intent(fresh)],rows(first.batch),UUID2,'2026-09-08T08:01:00.000Z'));
}
{
  const ep=episode('WORK_OUTSIDE_APP'),first=Full.planBatch(base(ep.type,decision(ep),[intent(ep)])),records=rows(first.batch);
  const resolved=Full.planBatch(base(ep.type,{status:'RESOLVED',reason:null,open:null,resolve:[resolve(ep,'ATTENDANCE_OPENED')],deliver:false},[],records,UUID2,'2026-09-08T08:01:00.000Z'));
  const finalRows=[...records.filter(x=>x.record_key!=='EPISODE:'+ep.episode_id&&x.record_key!=='STATE:COMM_GLOBAL'),...rows(resolved.batch).filter(x=>x.record_key==='EPISODE:'+ep.episode_id||x.record_key==='STATE:COMM_GLOBAL')];
  parity('resolved episode reopen rejection parity',base(ep.type,decision(ep),[intent(ep)],finalRows,UUID3,'2026-09-08T08:02:00.000Z'));
}
{
  const ep=episode('NO_ACTIVITY'),first=Full.planBatch(base(ep.type,decision(ep),[intent(ep)]));
  parity('changed content conflict parity',base(ep.type,decision(ep),[intent(ep,ep.employee_id,'Inna treść')],rows(first.batch),UUID2,'2026-09-08T08:01:00.000Z'));
}
{
  const ep=episode('WRONG_PROCESS');parity('ACK mismatch error parity',base(ep.type,decision(ep),[{recipient_id:'MOL004',content:'x',ack_required:false}]));
}
{
  const ep=episode('WORK_OUTSIDE_APP');parity('duplicate recipient error parity',base(ep.type,decision(ep),[intent(ep),intent(ep)]));
}
{
  const ep=episode('NO_ACTIVITY');parity('hidden delivery intent error parity',base(ep.type,decision(ep,false),[intent(ep)]));
}
{
  const ep=episode('WRONG_PROCESS');parity('missing resolved episode error parity',base(ep.type,{status:'RESOLVED',reason:null,open:null,resolve:[resolve(ep)],deliver:false},[]));
}
console.log('TOTAL '+count);
