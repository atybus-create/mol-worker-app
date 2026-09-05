'use strict';
// Pure assembly of an authenticated, locked attendance snapshot and published norms.
function viewNeed(value, code) { if (!value) throw new Error(code); }
function viewCanonical(value) {
  if (Array.isArray(value)) return '[' + value.map(viewCanonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+viewCanonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function assembleWorkerView({base, actor, month, bundles=[], previous=null, now, stale_seconds=180}) {
  viewNeed(base?.employee?.employee_id && actor?.employee_id, 'VIEW_IDENTITY_INVALID');
  viewNeed(['WORKER','LEADER','ADMIN'].includes(actor.role), 'VIEW_ROLE_INVALID');
  viewNeed(actor.role!=='WORKER'||actor.employee_id===base.employee.employee_id, 'VIEW_FORBIDDEN');
  viewNeed(/^\d{4}-(0[1-9]|1[0-2])$/.test(month), 'VIEW_MONTH_INVALID');
  const employee_id=base.employee.employee_id, work_date=base.work_date;
  const view_id=[actor.employee_id,employee_id,work_date,month].join(':');
  viewNeed(!previous||previous.view_id===view_id,'VIEW_SCOPE_CONFLICT');
  let old;
  try { old=previous?.payload_json ? JSON.parse(previous.payload_json) : null; } catch { old=null; }
  if(old&&(old.employee?.employee_id!==employee_id||old.user?.employee_id!==actor.employee_id||old.work_date!==work_date||old.month!==month))old=null;
  const unavailable=(reason)=>({pak_percent:null,pick_percent:null,combined_percent:null,eligible_pak:null,eligible_pick:null,outside_pak:null,outside_pick:null,reason,freshness:'UNAVAILABLE',has_value:false,coverage:'UNOBSERVED',calculated_at:now,version:0});
  function readBundle(key) {
    const rows=bundles.filter(x=>x.summary_id===key);
    if(rows.length!==1)return {error:rows.length?'NORM_SNAPSHOT_DUPLICATE':'NORM_NOT_READY'};
    try {
      const p=JSON.parse(rows[0].payload_json);
      viewNeed(p.schema_version===1&&p.employee_id===employee_id&&key===employee_id+':'+p.month&&Array.isArray(p.days),'NORM_SNAPSHOT_INVALID');
      viewNeed(new Set(p.days.map(d=>d.work_date)).size===p.days.length,'NORM_SNAPSHOT_DUPLICATE');
      return {payload:p,version:rows[0].version};
    } catch {return {error:'NORM_SNAPSHOT_INVALID'};}
  }
  function normalize(value,fallback,reason,version) {
    const fields=['pak_percent','pick_percent','combined_percent'];
    const valid=value&&['FRESH','STALE','UNAVAILABLE'].includes(value.freshness)&&fields.every(k=>value[k]===null||(Number.isFinite(value[k])&&value[k]>=0));
    if(!valid) {
      if(fallback?.has_value===true)return {...fallback,freshness:'STALE',source_error:reason||'NORM_SNAPSHOT_INVALID'};
      return unavailable(reason||'NORM_SNAPSHOT_INVALID');
    }
    if(fallback?.has_value===true&&Number.isInteger(version)&&version<(fallback.version||0))return {...fallback,freshness:'STALE',source_error:'NORM_VERSION_REGRESSION'};
    if(value.freshness==='UNAVAILABLE'&&fallback?.has_value===true)return {...fallback,freshness:'STALE',source_error:value.source_error||value.reason||'NORM_UNAVAILABLE'};
    return {...value,version,has_value:value.has_value??value.freshness!=='UNAVAILABLE'};
  }
  const dayBundle=readBundle(employee_id+':'+work_date.slice(0,7));
  const monthBundle=month===work_date.slice(0,7)?dayBundle:readBundle(employee_id+':'+month);
  let norm=normalize(dayBundle.payload?.days.find(d=>d.work_date===work_date),old?.norm,dayBundle.error||'NORM_NOT_READY',dayBundle.version||0);
  let monthly_norm=normalize(monthBundle.payload?.monthly,old?.monthly_norm,monthBundle.error||'NORM_NOT_READY',monthBundle.version||0);
  const attendance_version=base.attendance?.version||0;
  const changed=norm.attendance_version!==undefined&&norm.attendance_version!==attendance_version;
  const oldCalculation=base.attendance?.state==='OPEN'&&Date.parse(now)-Date.parse(norm.calculated_at)>stale_seconds*1000;
  if(norm.has_value&&(changed||oldCalculation)) {
    const source_error=changed?'SUMMARY_PENDING':'SUMMARY_STALE';
    norm={...norm,freshness:'STALE',source_error};
    if(month===work_date.slice(0,7)&&monthly_norm.has_value)monthly_norm={...monthly_norm,freshness:'STALE',source_error};
  }
  const a=base.attendance||{attendance_id:employee_id+':'+work_date,employee_id,work_date,state:'NOT_STARTED',version:0,start_at:null,stop_at:null,moniti_sync:base.moniti_enabled?'PENDING':'NOT_REQUIRED',drive_sync:'NOT_REQUIRED'};
  const data={user:{employee_id:actor.employee_id,display_name:actor.display_name||actor.employee_id,role:actor.role},employee:base.employee,work_date,month,
    attendance:a,attendance_version,open_day:base.open_day||null,active_process:base.active_process||null,
    process:base.active_process?{state:'ACTIVE',process_session_id:base.active_process.process_session_id,process_code:base.active_process.process_code,start_at:base.active_process.start_at}:{state:'NONE',process_session_id:null,process_code:null,start_at:null},
    process_sessions:base.process_sessions||[],process_catalog:base.process_catalog||[],process_permission_error:base.process_permission_error||null,
    presence_seconds:base.presence_seconds||0,process_seconds:base.process_seconds||0,no_process_seconds:base.no_process_seconds||0,between_process_seconds:base.no_process_seconds||0,
    norm,monthly_norm,notifications:base.notifications||[],unread_messages:0,messages_available:false,
    moniti_enabled:base.moniti_enabled===true,writes_enabled:base.writes_enabled===true,
    calculated_at:now,snapshot_version:0};
  const fingerprint=viewCanonical({...data,calculated_at:null,snapshot_version:0});
  if(previous?.fingerprint===fingerprint&&old)return {data:old,reused:true,row:null};
  const version=(previous?.version||0)+1;data.snapshot_version=version;
  return {data,reused:false,row:{view_id,employee_id,work_date,month,version,payload_json:JSON.stringify(data),fingerprint,calculated_at:now}};
}
if(typeof module!=='undefined')module.exports={assembleWorkerView,viewCanonical};
