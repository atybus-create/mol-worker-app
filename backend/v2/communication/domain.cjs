'use strict';
// Pure stage-8 foundations. Callers must supply authenticated identity and server time.
// No network, credentials, persistence, timers, or changes to attendance/ES.
const TYPES = Object.freeze(['MANUAL','NO_PROCESS','NO_ACTIVITY','WRONG_PROCESS','WORK_OUTSIDE_APP','ATTENDANCE_CORRECTION','FORGOTTEN_STOP']);
const ES_TYPES = new Set(['NO_ACTIVITY','WRONG_PROCESS','WORK_OUTSIDE_APP']);
const MODES = new Set(['OFF','OBSERVE','LIVE']);
function requireValue(test, code) { if (!test) { const e = new Error(code); e.code = code; throw e; } }
function object(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
function iso(x) {
  requireValue(typeof x==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(x), 'COMM_TIME_INVALID');
  const day=x.slice(0,10), midnight=Date.parse(day+'T00:00:00Z');
  requireValue(Number.isFinite(midnight)&&new Date(midnight).toISOString().slice(0,10)===day&&Number(x.slice(11,13))<24&&Number(x.slice(14,16))<60&&Number(x.slice(17,19))<60&&Number.isFinite(Date.parse(x)), 'COMM_TIME_INVALID');
  return new Date(x).toISOString();
}
function canonical(x) {
  if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
  if(object(x)){requireValue(Object.prototype.toString.call(x)==='[object Object]','COMM_JSON_INVALID');return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
  requireValue(x===null||['string','boolean'].includes(typeof x)||typeof x==='number'&&Number.isFinite(x),'COMM_JSON_INVALID');return JSON.stringify(x);
}
function clone(x) {return JSON.parse(canonical(x));}
function integer(n,min=0) { return Number.isSafeInteger(n)&&n>=min; }
function identity(x) { return typeof x==='string'&&/^MOL[0-9]+$/.test(x); }
function requestId(x) { return typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x); }
function actorValid(actor) { requireValue(actor?.active===true&&identity(actor.employee_id)&&['WORKER','LEADER','ADMIN'].includes(actor.role),'COMM_UNAUTHENTICATED'); }
function text(x) { requireValue(typeof x==='string'&&x.trim().length>0&&x.length<=2000&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x),'COMM_CONTENT_INVALID'); return x.trim(); }
function configFromRows(rows) {
  const values=rows.filter(r=>r.key==='COMMUNICATIONS_CONFIG');
  requireValue(values.length===1,'COMM_CONFIG_MISSING_OR_DUPLICATE');
  let c;try{c=JSON.parse(values[0].value_json);}catch{requireValue(false,'COMM_CONFIG_INVALID');}
  requireValue(object(c)&&c.schema_version===1&&MODES.has(c.mode)&&c.timezone==='Europe/Warsaw'&&typeof c.manual_enabled==='boolean'&&typeof c.es_verified==='boolean'&&c.history_policy==='HOLD'&&object(c.rules),'COMM_CONFIG_INVALID');
  requireValue(c.poll_seconds===null||(integer(c.poll_seconds,5)&&c.poll_seconds<=300),'COMM_CONFIG_INVALID');
  for(const type of TYPES.filter(t=>t!=='MANUAL')) {
    const r=c.rules[type];requireValue(object(r)&&typeof r.enabled==='boolean'&&(r.ack_required===null||typeof r.ack_required==='boolean'),'COMM_CONFIG_INVALID');
    if(['NO_PROCESS','NO_ACTIVITY'].includes(type))requireValue(r.threshold_seconds===null||(integer(r.threshold_seconds,1)&&r.threshold_seconds<=86400),'COMM_CONFIG_INVALID');
    if(type==='FORGOTTEN_STOP')requireValue((r.at_local===null||typeof r.at_local==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.at_local))&&(r.escalate_after_seconds===null||integer(r.escalate_after_seconds,1)),'COMM_CONFIG_INVALID');
  }
  return c;
}
function ruleGate(config,type) {
  requireValue(TYPES.includes(type),'COMM_TYPE_INVALID');
  if(config.mode==='OFF')return {evaluate:false,deliver:false,reason:'MODULE_OFF'};
  if(type==='MANUAL')return {evaluate:config.manual_enabled,deliver:config.manual_enabled&&config.mode==='LIVE',reason:config.manual_enabled?(config.mode==='LIVE'?null:'OBSERVE_ONLY'):'RULE_DISABLED'};
  const r=config.rules[type];
  if(!r.enabled)return {evaluate:false,deliver:false,reason:'RULE_DISABLED'};
  if(r.ack_required===null||(['NO_PROCESS','NO_ACTIVITY'].includes(type)&&r.threshold_seconds===null)||(type==='FORGOTTEN_STOP'&&(r.at_local===null||r.escalate_after_seconds===null)))return {evaluate:false,deliver:false,reason:'PARAMETERS_NOT_CONFIRMED'};
  if(ES_TYPES.has(type)&&config.es_verified!==true)return {evaluate:false,deliver:false,reason:'ES_VALIDATION_REQUIRED'};
  return {evaluate:true,deliver:config.mode==='LIVE',reason:config.mode==='LIVE'?null:'OBSERVE_ONLY'};
}
// Frozen recipients: neither session activity nor optional leader_id changes selection.
function manualIntent({actor,body,employees,attendance,now}) {
  actorValid(actor);requireValue(['LEADER','ADMIN'].includes(actor.role),'COMM_FORBIDDEN');
  const allowed=['request_id','recipient_ids','all_open','content','ack_required','valid_until'];
  requireValue(object(body)&&!Object.keys(body).some(k=>!allowed.includes(k))&&requestId(body.request_id),'COMM_REQUEST_INVALID');
  requireValue(body.ack_required===undefined||typeof body.ack_required==='boolean','COMM_REQUEST_INVALID');
  requireValue(body.all_open===undefined||typeof body.all_open==='boolean','COMM_REQUEST_INVALID');
  requireValue((body.all_open===true&&!Object.hasOwn(body,'recipient_ids'))||(body.all_open!==true&&Array.isArray(body.recipient_ids)&&body.recipient_ids.length>0&&body.recipient_ids.length<=100&&body.recipient_ids.every(identity)),'COMM_RECIPIENTS_INVALID');
  const stamp=iso(now),content=text(body.content),expiry=body.valid_until===null||body.valid_until===undefined?null:iso(body.valid_until);
  requireValue(expiry===null||Date.parse(expiry)>Date.parse(stamp),'COMM_EXPIRED_AT_SEND');
  requireValue(new Set(employees.map(e=>e.employee_id)).size===employees.length,'COMM_EMPLOYEE_DUPLICATE');
  requireValue(employees.every(e=>identity(e.employee_id)),'COMM_EMPLOYEE_INVALID');
  const active=new Set(employees.filter(e=>e.active===true).map(e=>e.employee_id));
  const open=attendance.filter(a=>a.state==='OPEN');
  requireValue(open.every(a=>identity(a.employee_id)&&!a.stop_at&&Date.parse(iso(a.start_at))<=Date.parse(stamp)),'COMM_ATTENDANCE_INCONSISTENT');
  requireValue(new Set(open.map(a=>a.employee_id)).size===open.length,'COMM_ATTENDANCE_INCONSISTENT');
  const eligible=new Set(open.filter(a=>active.has(a.employee_id)).map(a=>a.employee_id));
  const recipients=body.all_open===true?[...eligible].sort():[...new Set(body.recipient_ids)].sort();
  requireValue(recipients.length>0&&recipients.length<=100,'COMM_NO_RECIPIENTS');
  requireValue(recipients.every(id=>eligible.has(id)),'COMM_RECIPIENT_NOT_OPEN');
  const normalized={recipient_ids:body.all_open===true?null:recipients,all_open:body.all_open===true,content,ack_required:body.ack_required===true,valid_until:expiry};
  return {request_id:body.request_id.toLowerCase(),actor_id:actor.employee_id,operation:'SEND',canonical:canonical({actor_id:actor.employee_id,operation:'SEND',body:normalized}),created_at:stamp,recipient_ids:recipients,content,ack_required:normalized.ack_required,valid_until:expiry};
}
function episodeIdentity({employee_id,type,anchor}) {
  requireValue(identity(employee_id)&&TYPES.includes(type)&&typeof anchor==='string'&&/^[A-Za-z0-9:._-]{1,180}$/.test(anchor),'COMM_EPISODE_INVALID');
  return employee_id+'|'+type+'|'+anchor;
}
function observeEpisode(prior,candidate,now) {
  const id=episodeIdentity(candidate),stamp=iso(now);
  if(prior){requireValue(prior.episode_id===id,'COMM_EPISODE_ID_CONFLICT');requireValue(['OPEN','RESOLVED'].includes(prior.status),'COMM_EPISODE_STATE_INVALID');requireValue(Date.parse(stamp)>=Date.parse(iso(prior.opened_at)),'COMM_TIME_ORDER');return {changed:false,episode:clone(prior),reason:prior.status==='RESOLVED'?'EPISODE_ALREADY_RESOLVED':'EPISODE_ALREADY_OPEN'};}
  const details=object(candidate.details)?clone(candidate.details):{};canonical(details);
  return {changed:true,episode:{episode_id:id,employee_id:candidate.employee_id,type:candidate.type,anchor:candidate.anchor,status:'OPEN',opened_at:stamp,resolved_at:null,resolution_reason:null,version:1,details}};
}
function resolveEpisode(prior,now,reason) {
  requireValue(prior&&prior.episode_id&&['OPEN','RESOLVED'].includes(prior.status),'COMM_EPISODE_STATE_INVALID');
  if(prior.status==='RESOLVED')return {changed:false,episode:clone(prior)};
  const stamp=iso(now);requireValue(Date.parse(stamp)>=Date.parse(iso(prior.opened_at))&&typeof reason==='string'&&/^[A-Z0-9_]{1,80}$/.test(reason),'COMM_RESOLUTION_INVALID');
  return {changed:true,episode:{...clone(prior),status:'RESOLVED',resolved_at:stamp,resolution_reason:reason,version:prior.version+1}};
}
function newDelivery({message_id,episode=null,recipient_id,sender_id,type,content,ack_required,valid_until=null,now}) {
  requireValue(typeof message_id==='string'&&message_id.length>0&&message_id.length<=400&&identity(recipient_id)&&typeof sender_id==='string'&&sender_id.length>0&&TYPES.includes(type)&&typeof ack_required==='boolean','COMM_DELIVERY_INVALID');
  const stamp=iso(now),expiry=valid_until===null?null:iso(valid_until);
  requireValue(expiry===null||Date.parse(expiry)>Date.parse(stamp),'COMM_EXPIRED_AT_SEND');
  if(episode)requireValue(episode.episode_id&&episode.type===type&&['OPEN','RESOLVED'].includes(episode.status),'COMM_EPISODE_STATE_INVALID');
  return {message_id,episode_id:episode?.episode_id||null,recipient_id,sender_id,type,content:text(content),ack_required,sent_at:stamp,shown_at:null,ack_at:null,valid_until:expiry,delivery_status:'PENDING',cause_status:episode?.status||'NOT_APPLICABLE',resolved_at:episode?.resolved_at||null,version:1};
}
function receipt(delivery,actor,action,now) {
  actorValid(actor);requireValue(delivery&&delivery.recipient_id===actor.employee_id,'COMM_FORBIDDEN');requireValue(['SHOWN','ACK'].includes(action),'COMM_ACTION_INVALID');
  const field=action==='ACK'?'ack_at':'shown_at';if(delivery[field])return {changed:false,delivery:clone(delivery)};
  const stamp=iso(now);requireValue(Date.parse(stamp)>=Date.parse(iso(delivery.sent_at)),'COMM_TIME_ORDER');
  return {changed:true,delivery:{...clone(delivery),shown_at:delivery.shown_at||stamp,ack_at:action==='ACK'?stamp:delivery.ack_at,delivery_status:action==='ACK'?'ACKNOWLEDGED':delivery.ack_at?'ACKNOWLEDGED':'DISPLAYED',version:delivery.version+1}};
}
function reflectResolution(delivery,episode) {
  requireValue(delivery.episode_id===episode.episode_id,'COMM_EPISODE_ID_CONFLICT');
  if(episode.status!=='RESOLVED'||delivery.cause_status==='RESOLVED')return {changed:false,delivery:clone(delivery)};
  return {changed:true,delivery:{...clone(delivery),cause_status:'RESOLVED',resolved_at:episode.resolved_at,version:delivery.version+1}};
}
const RECORD_FIELDS=Object.freeze(['record_key','kind','scope_id','version','revision','payload_json','last_request_id']);
function validateRecord(row) {
  requireValue(object(row)&&Object.keys(row).length===RECORD_FIELDS.length&&Object.keys(row).every(k=>RECORD_FIELDS.includes(k)),'COMM_RECORD_INVALID');
  requireValue(typeof row.record_key==='string'&&row.record_key.length>0&&row.record_key.length<=500&&['EPISODE','DELIVERY','STATE','EVENT'].includes(row.kind)&&typeof row.scope_id==='string'&&row.scope_id.length>0&&row.scope_id.length<=100&&integer(row.version,1)&&integer(row.revision,1)&&requestId(row.last_request_id)&&typeof row.payload_json==='string'&&row.payload_json.length<=250000,'COMM_RECORD_INVALID');
  let payload;try{payload=JSON.parse(row.payload_json);}catch{requireValue(false,'COMM_RECORD_INVALID');}requireValue(object(payload),'COMM_RECORD_INVALID');canonical(payload);return row;
}
function sameRecord(a,b) { return RECORD_FIELDS.every(k=>a[k]===b[k]); }
function decideRecord(prior,row,expected_version) {
  validateRecord(row);requireValue(integer(expected_version),'COMM_EXPECTED_VERSION_REQUIRED');
  requireValue(row.version===expected_version+1,'COMM_VERSION_STEP_INVALID');
  if(prior&&sameRecord(prior,row))return {write:false,replayed:true};
  if(prior){requireValue(prior.record_key===row.record_key&&prior.kind===row.kind&&prior.scope_id===row.scope_id,'COMM_RECORD_ID_CONFLICT');requireValue(row.kind!=='EVENT','COMM_EVENT_IMMUTABLE');}
  requireValue((prior?.version||0)===expected_version,'COMM_VERSION_CONFLICT');
  if(prior)requireValue(row.revision>prior.revision,'COMM_REVISION_CONFLICT');
  return {write:true,replayed:false};
}
function validateBatch(input) {
  requireValue(object(input)&&typeof input.lock_owner==='string'&&/^[0-9]+$/.test(input.lock_owner)&&requestId(input.request_id)&&/^[0-9a-f]{64}$/.test(input.payload_hash||'')&&typeof input.actor_id==='string'&&input.actor_id.length>0&&input.actor_id.length<=100&&['SEND','SHOWN','ACK','OBSERVE','RESOLVE','PROBE'].includes(input.operation),'COMM_BATCH_INVALID');
  requireValue(Array.isArray(input.records)&&input.records.length>0&&input.records.length<=202&&object(input.response),'COMM_BATCH_INVALID');
  requireValue(new Set(input.records.map(x=>x.row?.record_key)).size===input.records.length,'COMM_BATCH_DUPLICATE_KEY');
  for(const r of input.records){validateRecord(r.row);requireValue(r.row.last_request_id===input.request_id&&integer(r.expected_version)&&r.row.version===r.expected_version+1,'COMM_BATCH_INVALID');}
  const plan={records:input.records,response:input.response};requireValue(canonical(plan).length<=1000000,'COMM_BATCH_TOO_LARGE');return plan;
}
function chooseBatch(input,prior,pending,now) {
  const plan=validateBatch(input),stamp=iso(now);
  requireValue(Array.isArray(pending)&&pending.length<=1,'COMM_JOURNAL_INVALID');
  requireValue(pending.every(c=>c.request_id===input.request_id),'COMM_RECOVERY_REQUIRED');
  requireValue(pending.length===0||prior?.status==='PREPARED','COMM_JOURNAL_INVALID');
  if(prior){
    requireValue(prior.request_id===input.request_id,'COMM_JOURNAL_INVALID');
    requireValue(prior.payload_hash===input.payload_hash&&prior.actor_id===input.actor_id&&prior.operation===input.operation,'COMM_REQUEST_ID_CONFLICT');
    requireValue(['PREPARED','COMMITTED'].includes(prior.status),'COMM_JOURNAL_INVALID');
    let frozen,response;try{frozen=JSON.parse(prior.plan_json);response=JSON.parse(prior.response_json);}catch{requireValue(false,'COMM_JOURNAL_INVALID');}
    requireValue(object(frozen)&&Object.keys(frozen).sort().join(',')==='records,response'&&object(response)&&canonical(frozen.response)===canonical(response),'COMM_JOURNAL_INVALID');
    validateBatch({...input,records:frozen.records,response:frozen.response});
    const prepared=iso(prior.prepared_at);requireValue(Date.parse(prepared)<=Date.parse(stamp),'COMM_TIME_ORDER');
    if(prior.status==='COMMITTED')return {write:false,replayed:true,response};
    return {write:true,recovery:true,plan:frozen,prepared_at:prepared};
  }
  return {write:true,recovery:false,plan,prepared_at:stamp};
}
module.exports={requireValue,object,iso,integer,requestId,TYPES,canonical,configFromRows,ruleGate,manualIntent,episodeIdentity,observeEpisode,resolveEpisode,newDelivery,receipt,reflectResolution,RECORD_FIELDS,validateRecord,sameRecord,decideRecord,validateBatch,chooseBatch};
