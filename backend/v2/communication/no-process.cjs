'use strict';
// Stage 8.5 LOCAL CANDIDATE. No timers, network, persistence, or Moniti calls.
// A future adapter must read complete, committed data under command-writer.
const D=require('./domain.cjs'),A=require('./api-domain.cjs');
const {processTimes}=require('../metrics/domain.cjs');
const need=D.requireValue,copy=x=>JSON.parse(D.canonical(x));
const ident=x=>typeof x==='string'&&/^MOL[0-9]+$/.test(x);
const OPS={WORK_STARTED:'START',WORK_REOPENED:'REOPEN',WORK_FINISHED:'FINISH',PROCESS_START:'PROCESS_START',PROCESS_CHANGE:'PROCESS_CHANGE',PROCESS_LOGOUT:'PROCESS_LOGOUT',ATTENDANCE_CORRECTED:'CORRECT'};
const OPEN_INTERVAL=new Set(['WORK_STARTED','WORK_REOPENED','PROCESS_LOGOUT']);

function observation({employee,attendance,processes=[],work_events=[],commands=[],complete=false,now}) {
  const stamp=D.iso(now),clock=Date.parse(stamp);
  need(complete===true,'COMM_ALERT_INPUT_INCOMPLETE');
  need(employee?.active===true&&ident(employee.employee_id),'COMM_ALERT_EMPLOYEE_INVALID');
  need(Array.isArray(processes)&&Array.isArray(work_events)&&Array.isArray(commands),'COMM_ALERT_INPUT_INVALID');
  const employee_id=employee.employee_id;
  need(!commands.some(c=>c.employee_id===employee_id&&!['COMMITTED','FAILED','REJECTED'].includes(c.status)),'COMM_ALERT_SOURCE_PENDING');
  if(!attendance) {
    need(processes.length===0&&work_events.length===0,'COMM_ALERT_INPUT_INCONSISTENT');
    return {employee_id,attendance_id:null,attendance_version:0,status:'NOT_STARTED',observed_at:stamp,anchor:null,since:null,elapsed_ms:0};
  }
  need(attendance.employee_id===employee_id&&attendance.attendance_id===employee_id+':'+attendance.work_date&&D.integer(attendance.version,1),'COMM_ALERT_ATTENDANCE_INVALID');
  const id=attendance.attendance_id,times=processTimes(attendance,processes,stamp);
  const source=work_events.filter(e=>e.aggregate_id===id);
  need(new Set(source.map(e=>e.event_id)).size===source.length,'COMM_ALERT_EVENT_DUPLICATE');
  const events=source.map(e=>{
    need(e.employee_id===employee_id&&e.status==='COMMITTED'&&Object.hasOwn(OPS,e.event_type)&&D.requestId(e.request_id),'COMM_ALERT_AUDIT_INVALID');
    const related=commands.filter(c=>c.request_id===e.request_id);
    need(related.length===1&&related[0].status==='COMMITTED'&&related[0].employee_id===employee_id&&related[0].aggregate_id===id&&related[0].operation==='ATTENDANCE_'+OPS[e.event_type],'COMM_ALERT_COMMAND_UNCONFIRMED');
    let after;try{const p=JSON.parse(e.after_json);after=p.attendance||p;}catch{need(false,'COMM_ALERT_AUDIT_INVALID');}
    need(D.object(after)&&after.attendance_id===id&&after.employee_id===employee_id&&after.last_request_id===e.request_id&&D.integer(after.version,1),'COMM_ALERT_AUDIT_INVALID');
    const occurred_at=D.iso(e.occurred_at);need(Date.parse(occurred_at)<=clock,'COMM_ALERT_TIME_ORDER');
    return {event:e,after,occurred_at};
  }).sort((a,b)=>a.after.version-b.after.version);
  // Never infer REOPEN/LOGOUT from the morning START or a partial audit page.
  need(events.length===attendance.version&&events.every((e,i)=>e.after.version===i+1),'COMM_ALERT_AUDIT_INCOMPLETE');
  need(events[0].event.event_type==='WORK_STARTED','COMM_ALERT_AUDIT_INCOMPLETE');
  const last=events.at(-1),timeValue=x=>x==null?null:D.iso(x);
  need(last.after.state===attendance.state&&last.after.last_request_id===attendance.last_request_id&&['start_at','stop_at'].every(k=>timeValue(last.after[k])===timeValue(attendance[k])),'COMM_ALERT_SNAPSHOT_CONFLICT');
  let interval=null,state='NOT_STARTED',active=false,lastTime=-Infinity;
  for(const e of events){
    const type=e.event.event_type,at=Date.parse(e.occurred_at);
    need(at>=lastTime,'COMM_ALERT_TIME_ORDER');lastTime=at;
    if(type==='WORK_STARTED'){need(state==='NOT_STARTED','COMM_ALERT_SEQUENCE_INVALID');state='OPEN';active=false;}
    else if(type==='WORK_REOPENED'){need(state==='CLOSED','COMM_ALERT_SEQUENCE_INVALID');state='OPEN';active=false;}
    else if(type==='WORK_FINISHED'){need(state==='OPEN','COMM_ALERT_SEQUENCE_INVALID');state='CLOSED';active=false;}
    else if(type==='PROCESS_START'){need(state==='OPEN'&&!active,'COMM_ALERT_SEQUENCE_INVALID');active=true;}
    else if(type==='PROCESS_CHANGE'){need(state==='OPEN'&&active,'COMM_ALERT_SEQUENCE_INVALID');active=true;}
    else if(type==='PROCESS_LOGOUT'){need(state==='OPEN'&&active,'COMM_ALERT_SEQUENCE_INVALID');active=false;}
    else {
      need(['OPEN','CLOSED'].includes(state),'COMM_ALERT_SEQUENCE_INVALID');
      // CORRECT may close a day; only the distinct REOPEN can reopen it.
      need(!(state==='CLOSED'&&e.after.state==='OPEN'),'COMM_ALERT_SEQUENCE_INVALID');
      state=e.after.state;if(state==='CLOSED')active=false;
    }
    need(e.after.state===state,'COMM_ALERT_SEQUENCE_INVALID');
    if(OPEN_INTERVAL.has(type))interval={anchor:id+':'+e.event.request_id,since:e.occurred_at,event_id:e.event.event_id};
    if(active||state==='CLOSED')interval=null;
  }
  need(state===attendance.state&&active===!!times.active_process,'COMM_ALERT_SNAPSHOT_CONFLICT');
  const base={employee_id,attendance_id:id,attendance_version:attendance.version,observed_at:stamp};
  if(state==='CLOSED')return {...base,status:'CLOSED',anchor:null,since:null,elapsed_ms:0};
  if(active)return {...base,status:'PROCESS_ACTIVE',process_code:times.active_process.process_code,anchor:null,since:null,elapsed_ms:0};
  need(interval,'COMM_ALERT_INTERVAL_UNKNOWN');
  return {...base,status:'NO_PROCESS',...interval,elapsed_ms:clock-Date.parse(interval.since)};
}

function decide({config_rows,observation:o,episodes=[],now}) {
  const cfg=D.configFromRows(config_rows),gate=D.ruleGate(cfg,'NO_PROCESS'),stamp=D.iso(now);
  if(!gate.evaluate)return {type:'NO_PROCESS',status:'DISABLED',reason:gate.reason,observed_at:stamp,updates:[],delivery:null};
  need(o&&ident(o.employee_id)&&o.observed_at===stamp&&['NOT_STARTED','CLOSED','PROCESS_ACTIVE','NO_PROCESS'].includes(o.status),'COMM_ALERT_OBSERVATION_INVALID');
  need(new Set(episodes.map(e=>e.episode_id)).size===episodes.length,'COMM_ALERT_EPISODE_DUPLICATE');
  const relevant=episodes.filter(e=>e.employee_id===o.employee_id&&e.type==='NO_PROCESS');
  need(relevant.every(e=>['OPEN','RESOLVED'].includes(e.status)&&D.integer(e.version,1)),'COMM_EPISODE_STATE_INVALID');
  const opens=relevant.filter(e=>e.status==='OPEN');need(opens.length<=1,'COMM_ALERT_EPISODE_DUPLICATE');
  for(const e of relevant){
    need(Date.parse(e.resolved_at||e.opened_at)<=Date.parse(stamp),'COMM_ALERT_TIME_ORDER');
    if(e.details?.attendance_id===o.attendance_id)need(o.attendance_version>=e.details.attendance_version,'COMM_ALERT_STALE_OBSERVATION');
  }
  need(o.status!=='NOT_STARTED'||!opens.length,'COMM_ALERT_ATTENDANCE_MISSING');
  const candidate=o.status==='NO_PROCESS'?{employee_id:o.employee_id,type:'NO_PROCESS',anchor:o.anchor}:null;
  if(candidate)need(D.integer(o.elapsed_ms)&&o.elapsed_ms===Date.parse(stamp)-Date.parse(D.iso(o.since)),'COMM_ALERT_OBSERVATION_INVALID');
  const candidateId=candidate?D.episodeIdentity(candidate):null,updates=[];
  for(const old of opens)if(old.episode_id!==candidateId){
    const reason=o.status==='CLOSED'?'WORK_FINISHED':o.status==='PROCESS_ACTIVE'?'PROCESS_STARTED':'INTERVAL_ENDED';
    updates.push({before:copy(old),after:D.resolveEpisode(old,stamp,reason).episode});
  }
  let current=candidateId?relevant.find(e=>e.episode_id===candidateId):null;
  // Explicit candidate boundary: elapsed >= configured threshold. No default.
  if(candidate&&o.elapsed_ms>=cfg.rules.NO_PROCESS.threshold_seconds*1000&&!current){
    const r=D.observeEpisode(null,{...candidate,details:{attendance_id:o.attendance_id,attendance_version:o.attendance_version,interval_started_at:o.since,anchor_event_id:o.event_id,threshold_seconds:cfg.rules.NO_PROCESS.threshold_seconds,ack_required:cfg.rules.NO_PROCESS.ack_required}},stamp);
    current=r.episode;updates.push({before:null,after:current});
  }
  // A changed threshold/ACK setting does not rewrite an existing episode.
  const delivery=current?.status==='OPEN'&&gate.deliver?{episode:copy(current),recipient_id:o.employee_id,ack_required:current.details.ack_required,content:'Masz rozpoczęty dzień pracy, ale nie wybrano procesu. Wybierz wykonywany proces.'}:null;
  return {type:'NO_PROCESS',status:current?.status==='OPEN'?'OPEN':current?.status==='RESOLVED'?'RESOLVED':candidate?'BELOW_THRESHOLD':'CLEAR',reason:gate.reason,observed_at:stamp,updates,delivery};
}

function episodesFromRecords(records) {
  need(new Set(records.map(r=>r.record_key)).size===records.length,'COMM_DUPLICATE_RECORD');
  return records.filter(r=>r.kind==='EPISODE').map(r=>{
    D.validateRecord(Object.fromEntries(D.RECORD_FIELDS.map(k=>[k,r[k]])));
    const p=JSON.parse(r.payload_json);
    need(r.record_key==='EPISODE:'+p.episode_id&&r.scope_id===p.employee_id&&r.version===p.version&&D.episodeIdentity(p)===p.episode_id,'COMM_ALERT_EPISODE_CORRUPT');return p;
  });
}

function planBatch({decision,records=[],request_id,payload_hash,lock_owner,now}) {
  need(D.requestId(request_id),'COMM_REQUEST_INVALID');
  const stamp=D.iso(now);need(decision?.type==='NO_PROCESS'&&decision.observed_at===stamp,'COMM_ALERT_OBSERVATION_INVALID');
  const state=A.globalState(records),revision=state.revision+1;
  need(state.row||!records.some(r=>r.kind==='EPISODE'),'COMM_GLOBAL_STATE_MISSING');
  need(D.integer(revision,1),'COMM_REVISION_EXHAUSTED');
  const writes=[];
  function record(key,kind,scope,data,old=null){
    const row={record_key:key,kind,scope_id:scope,version:(old?.version||0)+1,revision,payload_json:D.canonical(data),last_request_id:request_id};
    D.validateRecord(row);writes.push({row,expected_version:old?.version||0});
  }
  function delivery(d,old,event){
    const data={...d};delete data.revision;
    record('DELIVERY:'+data.message_id,'DELIVERY',data.recipient_id,data,old);
    // Include message ID: resolving and opening two intervals in one tick
    // must not collide on the same recipient's immutable event key.
    record('EVENT:'+request_id+':'+data.message_id,'EVENT',data.recipient_id,{stream:'delivery_change',event,actor_id:'SYSTEM',occurred_at:stamp,revision,delivery:{...data,revision}});
  }
  for(const change of decision.updates){
    const key='EPISODE:'+change.after.episode_id,old=records.find(r=>r.record_key===key);
    need((old?.version||0)===(change.before?.version||0),'COMM_VERSION_CONFLICT');
    need(!old||D.canonical(JSON.parse(old.payload_json))===D.canonical(change.before),'COMM_ALERT_EPISODE_CONFLICT');
    need(change.after.version===(old?.version||0)+1,'COMM_VERSION_STEP_INVALID');
    record(key,'EPISODE',change.after.employee_id,change.after,old);
    if(change.after.status==='RESOLVED')for(const r of records.filter(r=>r.kind==='DELIVERY')){
      const d=A.deliveryOf(r);if(d.episode_id!==change.after.episode_id)continue;
      const result=D.reflectResolution(d,change.after);if(result.changed)delivery(result.delivery,r,'RESOLVED');
    }
  }
  if(decision.delivery){
    const p=decision.delivery,message_id='ALERT:'+p.episode.episode_id+':'+p.recipient_id;
    const old=records.find(r=>r.record_key==='DELIVERY:'+message_id);
    if(old){const d=A.deliveryOf(old);need(d.episode_id===p.episode.episode_id&&d.recipient_id===p.recipient_id,'COMM_ALERT_DELIVERY_CONFLICT');}
    else delivery({...D.newDelivery({message_id,episode:p.episode,recipient_id:p.recipient_id,sender_id:'SYSTEM',type:'NO_PROCESS',content:p.content,ack_required:p.ack_required,now:stamp}),created_revision:revision},null,'SENT');
  }
  if(!writes.length)return {execute:false,reason:decision.reason||'NO_CHANGE',revision:state.revision};
  record(A.GLOBAL_KEY,'STATE','GLOBAL',{revision},state.row);
  const batch={lock_owner,request_id,payload_hash,actor_id:'SYSTEM',operation:'OBSERVE',records:writes,response:{ok:true,type:'NO_PROCESS',revision,status:decision.status}};
  D.validateBatch(batch);return {execute:true,batch};
}

module.exports={observation,decide,episodesFromRecords,planBatch};
