'use strict';
const D=require('./domain.cjs'),A=require('./api-domain.cjs'),P=require('./es-alert-persistence.cjs');
const need=D.requireValue;
const copy=x=>JSON.parse(D.canonical(x));
const TYPES=P.TYPES;

function cleanRecord(r){return Object.fromEntries(D.RECORD_FIELDS.map(k=>[k,r[k]]));}
function sameEpisodeIdentity(a,b){return ['episode_id','employee_id','type','anchor','opened_at'].every(k=>a[k]===b[k])&&D.canonical(a.details||{})===D.canonical(b.details||{});}
function validatePrepared(prepared){
  need(Array.isArray(prepared)&&prepared.length>0&&prepared.length<=20,'COMM_ES_BUNDLE_INVALID');
  need(new Set(prepared.map(x=>x.type)).size===prepared.length,'COMM_ES_BUNDLE_DUPLICATE_TYPE');
  for(const x of prepared){
    need(x&&TYPES.has(x.type)&&x.decision&&typeof x.decision==='object'&&Array.isArray(x.delivery_intents),'COMM_ES_BUNDLE_INVALID');
  }
}
function planBundle({prepared,records=[],request_id,payload_hash,lock_owner,now}){
  validatePrepared(prepared);
  const stamp=D.iso(now),state=A.globalState(records),revision=state.revision+1;
  need(state.row||!records.some(r=>r.kind==='EPISODE'),'COMM_GLOBAL_STATE_MISSING');
  need(D.integer(revision,1),'COMM_REVISION_EXHAUSTED');
  const writes=[],writeKeys=new Set();
  function add(key,kind,scope,data,prior=null){
    need(!writeKeys.has(key),'COMM_BATCH_DUPLICATE_KEY');writeKeys.add(key);
    const row={record_key:key,kind,scope_id:scope,version:(prior?.version||0)+1,revision,payload_json:D.canonical(data),last_request_id:request_id};
    D.validateRecord(row);writes.push({row,expected_version:prior?.version||0});
  }
  function addDelivery(data,prior=null,event='SENT'){
    add('DELIVERY:'+data.message_id,'DELIVERY',data.recipient_id,data,prior);
    add('EVENT:'+request_id+':'+data.message_id,'EVENT',data.recipient_id,{stream:'delivery_change',event,actor_id:'SYSTEM',occurred_at:stamp,revision,delivery:{...data,revision}});
  }
  for(const item of prepared){
    const type=item.type,decision=item.decision,intents=item.delivery_intents;
    // Reuse the reviewed single-rule planner as a strict shape/policy validator.
    P.planBatch({type,decision,delivery_intents:intents,records,request_id,payload_hash,lock_owner,now:stamp});
    for(const after of decision.resolve){
      const key='EPISODE:'+after.episode_id,priorRow=records.find(r=>r.record_key===key);
      need(priorRow,'COMM_ALERT_EPISODE_MISSING');
      const before=P.episodeOf(priorRow);
      need(before.status==='OPEN'&&before.version+1===after.version&&sameEpisodeIdentity(before,after),'COMM_ALERT_EPISODE_CONFLICT');
      need(Date.parse(D.iso(after.resolved_at))>=Date.parse(D.iso(before.opened_at)),'COMM_TIME_ORDER');
      add(key,'EPISODE',after.employee_id,after,priorRow);
      for(const r of records.filter(r=>r.kind==='DELIVERY')){
        const d=A.deliveryOf(r);if(d.episode_id!==after.episode_id)continue;
        const changed=D.reflectResolution(d,after);if(!changed.changed)continue;
        const next={...changed.delivery};delete next.revision;addDelivery(next,r,'RESOLVED');
      }
    }
    let created=false;
    if(decision.open){
      const key='EPISODE:'+decision.open.episode_id,priorRow=records.find(r=>r.record_key===key);
      if(priorRow){const prior=P.episodeOf(priorRow);need(prior.status==='OPEN','COMM_EPISODE_REOPEN_FORBIDDEN');need(D.canonical(prior)===D.canonical(decision.open),'COMM_ALERT_EPISODE_CONFLICT');}
      else{need(decision.open.version===1&&Date.parse(D.iso(decision.open.opened_at))<=Date.parse(stamp),'COMM_ES_ALERT_DECISION_INVALID');add(key,'EPISODE',decision.open.employee_id,decision.open,null);created=true;}
    }
    if(decision.deliver){
      need(created||records.some(r=>r.record_key==='EPISODE:'+decision.open.episode_id),'COMM_ALERT_EPISODE_MISSING');
      for(const intent of intents){
        const message_id='ALERT:'+decision.open.episode_id+':'+intent.recipient_id,key='DELIVERY:'+message_id,old=records.find(r=>r.record_key===key);
        if(old){const d=A.deliveryOf(old);need(d.episode_id===decision.open.episode_id&&d.recipient_id===intent.recipient_id&&d.type===type&&d.sender_id==='SYSTEM'&&d.content===intent.content.trim()&&d.ack_required===intent.ack_required,'COMM_ALERT_DELIVERY_CONFLICT');continue;}
        need(created,'COMM_ALERT_EXISTING_DELIVERY_REQUIRES_POLICY');
        addDelivery({...D.newDelivery({message_id,episode:decision.open,recipient_id:intent.recipient_id,sender_id:'SYSTEM',type,content:intent.content.trim(),ack_required:intent.ack_required,now:stamp}),created_revision:revision},null,'SENT');
      }
    }
  }
  if(!writes.length)return {execute:false,reason:'NO_CHANGE',revision:state.revision};
  add(A.GLOBAL_KEY,'STATE','GLOBAL',{revision},state.row);
  const response={ok:true,revision,types:prepared.map(x=>x.type),statuses:Object.fromEntries(prepared.map(x=>[x.type,x.decision.status]))};
  const batch={lock_owner,request_id,payload_hash,actor_id:'SYSTEM',operation:'OBSERVE',records:writes,response};
  D.validateBatch(batch);return {execute:true,batch};
}
module.exports={TYPES,planBundle};
