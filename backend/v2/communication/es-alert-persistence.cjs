'use strict';
const D=require('./domain.cjs'),A=require('./api-domain.cjs');
const need=D.requireValue;
const copy=x=>JSON.parse(D.canonical(x));
const TYPES=new Set(['WRONG_PROCESS','WORK_OUTSIDE_APP','NO_ACTIVITY']);
const ident=x=>typeof x==='string'&&/^MOL[0-9]+$/.test(x);

function cleanRecord(r){return Object.fromEntries(D.RECORD_FIELDS.map(k=>[k,r[k]]));}
function episodeOf(row){
  D.validateRecord(cleanRecord(row));
  need(row.kind==='EPISODE','COMM_ALERT_EPISODE_CORRUPT');
  let p;try{p=JSON.parse(row.payload_json);}catch{need(false,'COMM_ALERT_EPISODE_CORRUPT');}
  need(p&&TYPES.has(p.type)&&ident(p.employee_id)&&['OPEN','RESOLVED'].includes(p.status)&&D.integer(p.version,1),'COMM_ALERT_EPISODE_CORRUPT');
  need(row.record_key==='EPISODE:'+p.episode_id&&row.scope_id===p.employee_id&&row.version===p.version&&D.episodeIdentity(p)===p.episode_id,'COMM_ALERT_EPISODE_CORRUPT');
  D.iso(p.opened_at);if(p.resolved_at)D.iso(p.resolved_at);
  need(D.object(p.details||{}),'COMM_ALERT_EPISODE_CORRUPT');
  return p;
}
function episodesFromRecords(records){
  need(Array.isArray(records)&&new Set(records.map(r=>r.record_key)).size===records.length,'COMM_DUPLICATE_RECORD');
  return records.filter(r=>r.kind==='EPISODE').map(episodeOf);
}
function sameEpisodeIdentity(a,b){return ['episode_id','employee_id','type','anchor','opened_at'].every(k=>a[k]===b[k])&&D.canonical(a.details||{})===D.canonical(b.details||{});}
function validateDecision(type,decision){
  need(TYPES.has(type)&&decision&&typeof decision==='object'&&!Array.isArray(decision),'COMM_ES_ALERT_DECISION_INVALID');
  need(Array.isArray(decision.resolve)&&typeof decision.deliver==='boolean','COMM_ES_ALERT_DECISION_INVALID');
  need(decision.open===null||D.object(decision.open),'COMM_ES_ALERT_DECISION_INVALID');
  if(decision.open){need(decision.open.type===type&&decision.open.status==='OPEN'&&decision.open.version===1&&D.episodeIdentity(decision.open)===decision.open.episode_id,'COMM_ES_ALERT_DECISION_INVALID');}
  for(const r of decision.resolve)need(r.type===type&&r.status==='RESOLVED'&&D.integer(r.version,2)&&D.episodeIdentity(r)===r.episode_id&&typeof r.resolution_reason==='string'&&r.resolution_reason.length>0&&r.resolved_at,'COMM_ES_ALERT_DECISION_INVALID');
  need(new Set(decision.resolve.map(r=>r.episode_id)).size===decision.resolve.length,'COMM_ES_ALERT_DECISION_INVALID');
  if(decision.deliver)need(decision.open&&decision.open.status==='OPEN','COMM_ES_ALERT_DELIVERY_INVALID');
}
function validateIntents(type,decision,intents){
  need(Array.isArray(intents),'COMM_ES_ALERT_DELIVERY_INVALID');
  if(!decision.deliver){need(intents.length===0,'COMM_ES_ALERT_DELIVERY_INVALID');return;}
  need(intents.length>0&&intents.length<=100,'COMM_ES_ALERT_DELIVERY_INVALID');
  need(new Set(intents.map(x=>x.recipient_id)).size===intents.length,'COMM_ES_ALERT_DELIVERY_INVALID');
  const ack=decision.open.details?.ack_required;need(typeof ack==='boolean','COMM_ES_ALERT_DELIVERY_INVALID');
  for(const x of intents){
    need(x&&ident(x.recipient_id)&&typeof x.content==='string'&&x.content.trim().length>0&&x.content.length<=2000,'COMM_ES_ALERT_DELIVERY_INVALID');
    need(x.ack_required===ack,'COMM_ES_ALERT_DELIVERY_INVALID');
    need(x.type===undefined||x.type===type,'COMM_ES_ALERT_DELIVERY_INVALID');
  }
}
function planBatch({type,decision,delivery_intents=[],records=[],request_id,payload_hash,lock_owner,now}){
  validateDecision(type,decision);validateIntents(type,decision,delivery_intents);
  need(D.requestId(request_id)&&typeof payload_hash==='string'&&/^[0-9a-f]{64}$/.test(payload_hash)&&typeof lock_owner==='string'&&/^\d+$/.test(lock_owner),'COMM_BATCH_INVALID');
  const stamp=D.iso(now),state=A.globalState(records),revision=state.revision+1;
  need(state.row||!records.some(r=>r.kind==='EPISODE'),'COMM_GLOBAL_STATE_MISSING');
  need(D.integer(revision,1),'COMM_REVISION_EXHAUSTED');
  const episodes=episodesFromRecords(records),writes=[];
  function add(key,kind,scope,data,prior=null){
    const row={record_key:key,kind,scope_id:scope,version:(prior?.version||0)+1,revision,payload_json:D.canonical(data),last_request_id:request_id};
    D.validateRecord(row);writes.push({row,expected_version:prior?.version||0});
  }
  function addDelivery(data,prior=null,event='SENT'){
    add('DELIVERY:'+data.message_id,'DELIVERY',data.recipient_id,data,prior);
    add('EVENT:'+request_id+':'+data.message_id,'EVENT',data.recipient_id,{stream:'delivery_change',event,actor_id:'SYSTEM',occurred_at:stamp,revision,delivery:{...data,revision}});
  }
  for(const after of decision.resolve){
    const key='EPISODE:'+after.episode_id,priorRow=records.find(r=>r.record_key===key);
    need(priorRow,'COMM_ALERT_EPISODE_MISSING');
    const before=episodeOf(priorRow);
    need(before.status==='OPEN'&&before.version+1===after.version&&sameEpisodeIdentity(before,after),'COMM_ALERT_EPISODE_CONFLICT');
    need(Date.parse(D.iso(after.resolved_at))>=Date.parse(D.iso(before.opened_at)),'COMM_TIME_ORDER');
    add(key,'EPISODE',after.employee_id,after,priorRow);
    for(const r of records.filter(r=>r.kind==='DELIVERY')){
      const d=A.deliveryOf(r);if(d.episode_id!==after.episode_id)continue;
      const changed=D.reflectResolution(d,after);if(!changed.changed)continue;
      const next={...changed.delivery};delete next.revision;
      addDelivery(next,r,'RESOLVED');
    }
  }
  let created=false;
  if(decision.open){
    const key='EPISODE:'+decision.open.episode_id,priorRow=records.find(r=>r.record_key===key);
    if(priorRow){
      const prior=episodeOf(priorRow);
      need(prior.status==='OPEN','COMM_EPISODE_REOPEN_FORBIDDEN');
      need(D.canonical(prior)===D.canonical(decision.open),'COMM_ALERT_EPISODE_CONFLICT');
    }else{
      need(decision.open.version===1&&Date.parse(D.iso(decision.open.opened_at))<=Date.parse(stamp),'COMM_ES_ALERT_DECISION_INVALID');
      add(key,'EPISODE',decision.open.employee_id,decision.open,null);created=true;
    }
  }
  if(decision.deliver){
    need(created||records.some(r=>r.record_key==='EPISODE:'+decision.open.episode_id),'COMM_ALERT_EPISODE_MISSING');
    for(const intent of delivery_intents){
      const message_id='ALERT:'+decision.open.episode_id+':'+intent.recipient_id,key='DELIVERY:'+message_id;
      const old=records.find(r=>r.record_key===key);
      if(old){
        const d=A.deliveryOf(old);
        need(d.episode_id===decision.open.episode_id&&d.recipient_id===intent.recipient_id&&d.type===type&&d.sender_id==='SYSTEM'&&d.content===intent.content.trim()&&d.ack_required===intent.ack_required,'COMM_ALERT_DELIVERY_CONFLICT');
        continue;
      }
      // Only a newly persisted episode may create its first delivery. This prevents
      // an OBSERVE-era episode from being silently delivered after a later mode flip.
      need(created,'COMM_ALERT_EXISTING_DELIVERY_REQUIRES_POLICY');
      addDelivery({...D.newDelivery({message_id,episode:decision.open,recipient_id:intent.recipient_id,sender_id:'SYSTEM',type,content:intent.content.trim(),ack_required:intent.ack_required,now:stamp}),created_revision:revision},null,'SENT');
    }
  }
  if(!writes.length)return {execute:false,reason:decision.reason||'NO_CHANGE',revision:state.revision};
  add(A.GLOBAL_KEY,'STATE','GLOBAL',{revision},state.row);
  const batch={lock_owner,request_id,payload_hash,actor_id:'SYSTEM',operation:'OBSERVE',records:writes,response:{ok:true,type,revision,status:decision.status}};
  D.validateBatch(batch);
  return {execute:true,batch};
}
module.exports={TYPES,episodeOf,episodesFromRecords,planBatch};
