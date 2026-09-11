'use strict';
// Stage 8.3/8.4 candidate, NOT published. The adapter owns authentication, hash,
// command-writer acquisition and database I/O. This module never performs I/O.
const D = require('./domain.cjs');
const need = D.requireValue;
const object = D.object;
const GLOBAL_KEY = 'STATE:COMM_GLOBAL';
const ROLES = ['WORKER', 'LEADER', 'ADMIN'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ident = v => typeof v === 'string' && /^MOL[0-9]+$/.test(v);
const copy = v => JSON.parse(D.canonical(v));
function activeActor(actor) {
  need(actor && actor.active === true && ident(actor.employee_id) && ROLES.includes(actor.role), 'COMM_UNAUTHENTICATED');
}
function authorizeSession({token_hash, sessions, employees, now}) {
  need(typeof token_hash === 'string' && /^[0-9a-f]{64}$/.test(token_hash), 'COMM_UNAUTHENTICATED');
  const found = sessions.filter(s => s.token_hash === token_hash);
  need(found.length === 1, 'COMM_UNAUTHENTICATED');
  const s = found[0];
  need(s.session_id && !s.revoked_at && Date.parse(s.expires_at) > Date.parse(D.iso(now)), 'COMM_UNAUTHENTICATED');
  const people = employees.filter(e => e.employee_id === s.employee_id);
  need(people.length === 1, 'COMM_UNAUTHENTICATED');
  const e = people[0]; activeActor(e);
  // Intentionally omit password_hash, integration IDs, token and session hash.
  return {employee_id:e.employee_id, display_name:e.display_name || e.employee_id, role:e.role, active:true};
}
function exactKeys(value, allowed) {
  need(object(value) && Object.keys(value).every(k => allowed.includes(k)), 'COMM_REQUEST_INVALID');
}
function normalizeWrite(actor, operation, body) {
  activeActor(actor);
  need(['SEND','SHOWN','ACK'].includes(operation), 'COMM_ACTION_INVALID');
  if(operation === 'SEND') need(['LEADER','ADMIN'].includes(actor.role), 'COMM_FORBIDDEN');
  exactKeys(body, operation === 'SEND' ? ['request_id','recipient_ids','all_open','content','ack_required','valid_until'] : ['request_id','message_id']);
  need(typeof body.request_id === 'string' && UUID.test(body.request_id), 'COMM_REQUEST_INVALID');
  let normalized;
  if(operation === 'SEND') {
    need(body.all_open === undefined || typeof body.all_open === 'boolean', 'COMM_REQUEST_INVALID');
    need(body.ack_required === undefined || typeof body.ack_required === 'boolean', 'COMM_REQUEST_INVALID');
    const all = body.all_open === true;
    need(all ? !Object.hasOwn(body,'recipient_ids') : Array.isArray(body.recipient_ids) && body.recipient_ids.length > 0 && body.recipient_ids.length <= 100 && body.recipient_ids.every(ident), 'COMM_RECIPIENTS_INVALID');
    need(typeof body.content === 'string' && body.content.length <= 2000 && body.content.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body.content), 'COMM_CONTENT_INVALID');
    normalized = {recipient_ids:all ? null : [...new Set(body.recipient_ids)].sort(), all_open:all, content:body.content.trim(), ack_required:body.ack_required === true, valid_until:body.valid_until == null ? null : D.iso(body.valid_until)};
    // Do NOT validate current OPEN recipients or expiry here. A committed retry
    // must return its original result even after a recipient's STOP or expiry.
  } else {
    need(typeof body.message_id === 'string' && /^[A-Za-z0-9:|._-]{1,400}$/.test(body.message_id), 'COMM_MESSAGE_ID_INVALID');
    normalized = {message_id:body.message_id};
  }
  return {request_id:body.request_id.toLowerCase(), actor_id:actor.employee_id, operation, normalized,
    canonical:D.canonical({actor_id:actor.employee_id,operation,body:normalized})};
}
function cleanRecord(r) { return Object.fromEntries(D.RECORD_FIELDS.map(k => [k,r[k]])); }
function payload(r) {
  try { D.validateRecord(cleanRecord(r)); return JSON.parse(r.payload_json); }
  catch { need(false,'COMM_RECORD_CORRUPT'); }
}
function uniqueRecords(records) {
  need(Array.isArray(records) && new Set(records.map(r=>r.record_key)).size === records.length, 'COMM_DUPLICATE_RECORD');
}
function globalState(records) {
  uniqueRecords(records);
  const r = records.find(x=>x.record_key===GLOBAL_KEY);
  if(!r) {
    need(!records.some(x=>x.kind==='DELIVERY'), 'COMM_GLOBAL_STATE_MISSING');
    return {row:null,revision:0};
  }
  const p = payload(r);
  need(r.kind==='STATE' && r.scope_id==='GLOBAL' && p.revision===r.revision, 'COMM_GLOBAL_STATE_INVALID');
  return {row:r,revision:r.revision};
}
function record({key,kind,scope,data,revision,request_id,prior=null}) {
  const row={record_key:key,kind,scope_id:scope,version:(prior?.version||0)+1,revision,payload_json:D.canonical(data),last_request_id:request_id};
  D.validateRecord(row);
  return {row,expected_version:prior?.version||0};
}
function deliveryOf(row) {
  const p=payload(row);
  need(row.kind==='DELIVERY' && ident(p.recipient_id) && row.scope_id===p.recipient_id && row.record_key==='DELIVERY:'+p.message_id && p.version===row.version && D.integer(p.created_revision,1) && p.created_revision<=row.revision, 'COMM_DELIVERY_CORRUPT');
  need(typeof p.ack_required==='boolean' && ['PENDING','DISPLAYED','ACKNOWLEDGED'].includes(p.delivery_status) && ['OPEN','RESOLVED','NOT_APPLICABLE'].includes(p.cause_status), 'COMM_DELIVERY_CORRUPT');
  D.iso(p.sent_at); if(p.shown_at) D.iso(p.shown_at); if(p.ack_at) D.iso(p.ack_at); if(p.valid_until) D.iso(p.valid_until);
  return {...p,revision:row.revision};
}
function replayOrRecover(ctx, intent) {
  const pending=ctx.pending||[], prior=ctx.prior;
  need(pending.length<=1, 'COMM_JOURNAL_INVALID');
  if(!prior) { need(pending.length===0,'COMM_RECOVERY_REQUIRED'); return null; }
  need(prior.actor_id===intent.actor_id && prior.operation===intent.operation && prior.payload_hash===ctx.payload_hash && prior.request_id===intent.request_id, 'COMM_REQUEST_ID_CONFLICT');
  let frozen;
  try { frozen=JSON.parse(prior.plan_json); } catch { need(false,'COMM_JOURNAL_INVALID'); }
  need(object(frozen), 'COMM_JOURNAL_INVALID');
  const batch={lock_owner:ctx.lock_owner,request_id:intent.request_id,payload_hash:ctx.payload_hash,actor_id:intent.actor_id,operation:intent.operation,records:frozen.records,response:frozen.response};
  const selected=D.chooseBatch(batch,prior,pending,ctx.now);
  if(!selected.write) return {execute:false,replayed:true,response:selected.response};
  // Completion of an already accepted frozen command is independent of new
  // notification switches. Global maintenance mode can still pause mutations.
  need(ctx.writes_enabled===true,'COMM_WRITES_DISABLED');
  return {execute:true,recovery:true,batch:{...batch,records:selected.plan.records,response:selected.plan.response}};
}
function planWrite(ctx) {
  const intent=normalizeWrite(ctx.actor,ctx.operation,ctx.body),stamp=D.iso(ctx.now);
  need(ctx.canonical===intent.canonical && /^[0-9a-f]{64}$/.test(ctx.payload_hash||''), 'COMM_HASH_CONTEXT_INVALID');
  need(typeof ctx.lock_owner==='string' && /^\d+$/.test(ctx.lock_owner), 'COMM_LOCK_LOST');
  const prior=replayOrRecover(ctx,intent); if(prior) return prior;
  need(ctx.writes_enabled===true,'COMM_WRITES_DISABLED');
  const records=ctx.records||[], state=globalState(records), revision=state.revision+1;
  need(D.integer(revision,1),'COMM_REVISION_EXHAUSTED');
  const changes=[],plan=[], request_id=intent.request_id;
  function addDelivery(data,old=null,event) {
    const r=record({key:'DELIVERY:'+data.message_id,kind:'DELIVERY',scope:data.recipient_id,data,revision,request_id,prior:old});
    plan.push(r);
    // One immutable per-recipient event means late ACK/RESOLVE of an old
    // message is discoverable without reloading the whole history.
    plan.push(record({key:'EVENT:'+request_id+':'+data.recipient_id,kind:'EVENT',scope:data.recipient_id,
      data:{stream:'delivery_change',event,actor_id:intent.actor_id,occurred_at:stamp,revision,delivery:{...data,revision}},revision,request_id}));
    changes.push({...data,revision});
  }
  let data;
  if(intent.operation==='SEND') {
    const config=D.configFromRows(ctx.config_rows||[]);
    need(D.ruleGate(config,'MANUAL').deliver===true,'COMM_SEND_DISABLED');
    const manual=D.manualIntent({actor:ctx.actor,body:ctx.body,employees:ctx.employees||[],attendance:ctx.attendance||[],now:stamp});
    need(manual.canonical===intent.canonical,'COMM_HASH_CONTEXT_INVALID');
    for(const recipient_id of manual.recipient_ids) {
      const message_id='MSG:'+request_id+':'+recipient_id;
      need(!records.some(r=>r.record_key==='DELIVERY:'+message_id),'COMM_ORPHAN_DELIVERY');
      addDelivery({...D.newDelivery({message_id,recipient_id,sender_id:intent.actor_id,type:'MANUAL',content:manual.content,ack_required:manual.ack_required,valid_until:manual.valid_until,now:stamp}),created_revision:revision},null,'SENT');
    }
    data={recipient_ids:manual.recipient_ids,message_ids:changes.map(c=>c.message_id),recipient_count:manual.recipient_ids.length,revision};
  } else {
    const old=records.find(r=>r.record_key==='DELIVERY:'+intent.normalized.message_id);
    need(old,'COMM_MESSAGE_NOT_FOUND');
    const d=deliveryOf(old),result=D.receipt(d,ctx.actor,intent.operation,stamp);
    if(result.changed) {
      const next={...result.delivery}; delete next.revision;
      addDelivery(next,old,intent.operation==='ACK'?'ACKNOWLEDGED':'DISPLAYED');
    }
    data={message_id:d.message_id,changed:result.changed,shown_at:result.delivery.shown_at,ack_at:result.delivery.ack_at,cause_status:result.delivery.cause_status,revision};
  }
  plan.push(record({key:'EVENT:'+request_id+':AUDIT',kind:'EVENT',scope:intent.actor_id,
    data:{stream:'command_audit',operation:intent.operation,actor_id:intent.actor_id,occurred_at:stamp,result:data},revision,request_id}));
  plan.push(record({key:GLOBAL_KEY,kind:'STATE',scope:'GLOBAL',data:{revision},revision,request_id,prior:state.row}));
  const response={http_status:intent.operation==='SEND'?201:200,body:{ok:true,request_id,data,meta:{api_version:'2.0',server_time:stamp}}};
  const batch={lock_owner:ctx.lock_owner,request_id,payload_hash:ctx.payload_hash,actor_id:intent.actor_id,operation:intent.operation,records:plan,response};
  D.validateBatch(batch);
  return {execute:true,recovery:false,batch};
}
function authorizeTarget(actor,target) {
  activeActor(actor);need(ident(target),'COMM_REQUEST_INVALID');
  need(target===actor.employee_id || ['LEADER','ADMIN'].includes(actor.role),'COMM_FORBIDDEN');
}
function cursorEncode(value) { return Buffer.from(D.canonical(value),'utf8').toString('base64url'); }
function cursorDecode(value) {
  need(typeof value==='string' && value.length>0 && value.length<=2048 && /^[A-Za-z0-9_-]+$/.test(value),'COMM_CURSOR_INVALID');
  let p;try{p=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));}catch{need(false,'COMM_CURSOR_INVALID');}
  need(object(p) && p.v===1 && ['history','changes'].includes(p.stream) && ident(p.target) && ident(p.viewer) && D.integer(p.ceiling) && D.integer(p.edge_revision) && typeof p.edge_key==='string' && p.edge_key.length<=500,'COMM_CURSOR_INVALID');
  return p;
}
function readMessages({actor,query={},records=[],pending=[],now}) {
  activeActor(actor);
  exactKeys(query,['employee_id','limit','cursor','since_revision']);
  const target=query.employee_id||actor.employee_id;authorizeTarget(actor,target);
  const toInt=(value,defaultValue)=>{if(value===undefined)return defaultValue;need(typeof value==='string' && /^\d{1,16}$/.test(value),'COMM_REQUEST_INVALID');const n=Number(value);need(D.integer(n),'COMM_REQUEST_INVALID');return n;};
  const limit=toInt(query.limit,25);need(limit>=1 && limit<=100,'COMM_LIMIT_INVALID');
  // A failed multi-record write may have overwritten part of the view. Refuse
  // a fresh communication snapshot until recovery; the client keeps its last one.
  need(pending.length===0,'COMM_RECOVERY_REQUIRED');
  const global=globalState(records),stamp=D.iso(now);
  let cursor=null,stream=Object.hasOwn(query,'since_revision')?'changes':'history';
  const since=toInt(query.since_revision,0);
  if(query.cursor){cursor=cursorDecode(query.cursor);need(!Object.hasOwn(query,'since_revision'),'COMM_REQUEST_INVALID');stream=cursor.stream;
    need(cursor.viewer===actor.employee_id && cursor.target===target,'COMM_CURSOR_SCOPE');}
  const ceiling=cursor?.ceiling??global.revision;
  need(ceiling<=global.revision && (stream!=='changes'||(cursor?.edge_revision??since)<=ceiling),'COMM_CURSOR_AHEAD');
  const deliveries=records.filter(r=>r.kind==='DELIVERY'&&r.scope_id===target).map(deliveryOf);
  const active=d=>!d.valid_until || Date.parse(d.valid_until)>Date.parse(stamp);
  const counts={unread_count:deliveries.filter(d=>active(d)&&!d.shown_at).length,unacknowledged_count:deliveries.filter(d=>active(d)&&d.ack_required&&!d.ack_at).length};
  const decorate=d=>({...copy(d),expired:!active(d)});
  let sorted;
  if(stream==='history') {
    sorted=deliveries.filter(d=>d.created_revision<=ceiling && (!cursor || d.created_revision<cursor.edge_revision || d.created_revision===cursor.edge_revision && d.message_id<cursor.edge_key))
      .sort((a,b)=>b.created_revision-a.created_revision || (a.message_id<b.message_id?1:a.message_id>b.message_id?-1:0))
      .map(d=>({edge_revision:d.created_revision,edge_key:d.message_id,item:decorate(d)}));
  } else {
    const lower=cursor?.edge_revision??since,lowerKey=cursor?.edge_key??'\uffff';
    sorted=records.filter(r=>r.kind==='EVENT'&&r.scope_id===target&&r.revision<=ceiling&&(r.revision>lower || r.revision===lower&&r.record_key>lowerKey))
      .map(r=>({r,p:payload(r)})).filter(x=>x.p.stream==='delivery_change').map(({r,p})=>{
        need(p.revision===r.revision && p.delivery?.recipient_id===target && p.delivery?.revision===r.revision,'COMM_CHANGE_CORRUPT');
        return {edge_revision:r.revision,edge_key:r.record_key,item:{event:p.event,occurred_at:p.occurred_at,delivery:decorate(p.delivery)}};
      }).sort((a,b)=>a.edge_revision-b.edge_revision || (a.edge_key<b.edge_key?-1:a.edge_key>b.edge_key?1:0));
  }
  const page=sorted.slice(0,limit),more=sorted.length>limit,last=page.at(-1);
  const next_cursor=more?cursorEncode({v:1,stream,target,viewer:actor.employee_id,ceiling,edge_revision:last.edge_revision,edge_key:last.edge_key}):null;
  return {employee_id:target,stream,revision:global.revision,snapshot_revision:ceiling,...counts,items:page.map(x=>x.item),next_cursor,sync_revision:stream==='changes'&&!more?ceiling:null,server_time:stamp};
}
function listRecipients({actor,employees,attendance,now}) {
  activeActor(actor);need(['LEADER','ADMIN'].includes(actor.role),'COMM_FORBIDDEN');
  need(new Set(employees.map(e=>e.employee_id)).size===employees.length,'COMM_EMPLOYEE_DUPLICATE');
  const stamp=D.iso(now),opens=attendance.filter(a=>a.state==='OPEN');
  need(opens.every(a=>ident(a.employee_id)&&!a.stop_at&&Date.parse(D.iso(a.start_at))<=Date.parse(stamp))&&new Set(opens.map(a=>a.employee_id)).size===opens.length,'COMM_ATTENDANCE_INCONSISTENT');
  return employees.filter(e=>e.active===true&&opens.some(a=>a.employee_id===e.employee_id)).map(e=>({employee_id:e.employee_id,display_name:e.display_name||e.employee_id})).sort((a,b)=>a.employee_id.localeCompare(b.employee_id));
}
function errorResponse(error,request_id='',now=new Date().toISOString()) {
  const code=typeof error?.code==='string'&&/^COMM_[A-Z0-9_]+$/.test(error.code)?error.code:'COMM_INTERNAL_ERROR';
  const auth=code==='COMM_UNAUTHENTICATED',forbidden=['COMM_FORBIDDEN','COMM_CURSOR_SCOPE'].includes(code);
  const conflict=['COMM_REQUEST_ID_CONFLICT','COMM_VERSION_CONFLICT','COMM_CURSOR_AHEAD','COMM_BUSY'].includes(code);
  const bad=/(REQUEST_INVALID|CONTENT_INVALID|RECIPIENTS_INVALID|MESSAGE_ID_INVALID|TIME_INVALID|LIMIT_INVALID|CURSOR_INVALID|ACTION_INVALID)$/.test(code);
  const business=['COMM_NO_RECIPIENTS','COMM_RECIPIENT_NOT_OPEN','COMM_EXPIRED_AT_SEND','COMM_BATCH_TOO_LARGE'].includes(code);
  const status=auth?401:forbidden?403:code==='COMM_MESSAGE_NOT_FOUND'?404:conflict?409:bad?400:business?422:503;
  const message=auth?'Sesja wygasła. Zaloguj się ponownie.':forbidden?'Brak uprawnień.':code==='COMM_SEND_DISABLED'?'Wysyłka nowych wiadomości jest wyłączona.':code==='COMM_RECOVERY_REQUIRED'?'Poprzedni zapis komunikacji wymaga dokończenia.':code==='COMM_NO_RECIPIENTS'?'Brak pracowników z otwartym dniem pracy.':code==='COMM_RECIPIENT_NOT_OPEN'?'Wybrany odbiorca nie ma już otwartego dnia pracy.':status>=500?'Nie potwierdzono komunikacji. Ponów to samo żądanie.':'Nieprawidłowe żądanie lub konflikt danych. Odśwież stan i spróbuj ponownie.';
  return {http_status:status,body:{ok:false,request_id,error:{code,message,retryable:status>=500||code==='COMM_BUSY'},meta:{api_version:'2.0',server_time:D.iso(now)}}};
}
module.exports={GLOBAL_KEY,authorizeSession,normalizeWrite,globalState,deliveryOf,planWrite,readMessages,listRecipients,errorResponse,cursorEncode,cursorDecode};
