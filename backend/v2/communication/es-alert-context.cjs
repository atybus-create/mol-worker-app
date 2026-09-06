'use strict';
const ES_TYPES=new Set(['WRONG_PROCESS','WORK_OUTSIDE_APP','NO_ACTIVITY']);
const MEASURED={PAKOWANIE:'PAK',KOMPLETACJA:'PICK'};
const ELIGIBLE_ACTIVITY=new Set(['MATCH_PROCESS','BOUNDARY_PAK_PICK']);
function fail(code){const e=new Error(code);e.code=code;throw e;}
function need(test,code){if(!test)fail(code);}
const ident=x=>typeof x==='string'&&/^MOL[0-9]+$/.test(x);
const validDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const time=x=>{const n=Date.parse(x);need(Number.isFinite(n),'COMM_ES_CONTEXT_TIME_INVALID');return n;};
const copy=x=>JSON.parse(JSON.stringify(x));
function unique(rows,key,code){need(new Set(rows.map(r=>r[key])).size===rows.length,code);}
function one(rows,code){need(rows.length<=1,code);return rows[0]||null;}
function deltaMetric(d){const p=Number(d?.pak_count)||0,k=Number(d?.pick_count)||0;if(p>0&&k===0)return 'PAK';if(k>0&&p===0)return 'PICK';return null;}
function parseEpisodes(records,employee_id){
 const out=[];
 for(const r of records||[]){if(r.kind!=='EPISODE'||r.scope_id!==employee_id)continue;let p;try{p=JSON.parse(r.payload_json);}catch{fail('COMM_ES_CONTEXT_RECORD_INVALID');}if(!p||!ES_TYPES.has(p.type)||p.employee_id!==employee_id||!['OPEN','RESOLVED'].includes(p.status))continue;out.push(p);}
 unique(out,'episode_id','COMM_ES_CONTEXT_EPISODE_DUPLICATE');return out;
}
function dailyFromSnapshot(rows,employee_id,work_date){
 const matching=(rows||[]).filter(r=>r.employee_id===employee_id&&r.month===work_date.slice(0,7));need(matching.length<=1,'COMM_ES_CONTEXT_SNAPSHOT_DUPLICATE');if(!matching.length)return null;let p;try{p=JSON.parse(matching[0].payload_json);}catch{fail('COMM_ES_CONTEXT_SNAPSHOT_INVALID');}need(p?.employee_id===employee_id&&p.month===work_date.slice(0,7)&&Array.isArray(p.days),'COMM_ES_CONTEXT_SNAPSHOT_INVALID');const days=p.days.filter(d=>d.work_date===work_date);need(days.length<=1,'COMM_ES_CONTEXT_DAY_DUPLICATE');return days[0]||null;
}
function normalizeSource(source){need(source&&Number.isSafeInteger(source.source_row_id)&&source.source_row_id>=0&&typeof source.source_outbox_id==='string'&&source.source_outbox_id.length>0&&ident(source.employee_id)&&validDay(source.work_date)&&/^ES-[0-9]+$/.test(source.batch_id||''),'COMM_ES_CONTEXT_SOURCE_INVALID');time(source.observed_at);return copy(source);}
function activitySource({active_process,deltas,day,now}){
 if(!active_process||!MEASURED[active_process.process_code])return null;
 const metric=MEASURED[active_process.process_code],start=time(active_process.start_at),clock=time(now);need(start<=clock,'COMM_ES_CONTEXT_PROCESS_TIME_INVALID');
 let anchor=start;
 for(const d of deltas){if(d.process_session_id!==active_process.process_session_id||deltaMetric(d)!==metric||!ELIGIBLE_ACTIVITY.has(d.classification))continue;const t=time(d.source_time);if(t>=start&&t<=clock&&t>anchor)anchor=t;}
 const verified=!!day&&day.freshness==='FRESH'&&day.has_value===true&&typeof day.es_last_good_at==='string';
 const coverage_ready=verified&&day.coverage==='COMPLETE';
 return {status:verified?'FRESH':'UNAVAILABLE',verified,coverage_ready,metric,activity_anchor_at:new Date(anchor).toISOString()};
}
function build({source,employees=[],attendance=[],processes=[],deltas=[],norm_snapshots=[],comm_records=[],now}){
 const s=normalizeSource(source),clock=time(now);need(clock>=time(s.observed_at),'COMM_ES_CONTEXT_TIME_ORDER');
 const people=employees.filter(e=>e.employee_id===s.employee_id);need(people.length===1&&people[0].active===true,'COMM_ES_CONTEXT_EMPLOYEE_INVALID');const employee=copy(people[0]);
 const days=attendance.filter(a=>a.employee_id===s.employee_id&&a.work_date===s.work_date);const dayAttendance=one(days,'COMM_ES_CONTEXT_ATTENDANCE_DUPLICATE');if(dayAttendance){need(dayAttendance.attendance_id===s.employee_id+':'+s.work_date,'COMM_ES_CONTEXT_ATTENDANCE_INVALID');}
 const sessions=(processes||[]).filter(p=>p.employee_id===s.employee_id&&(!dayAttendance||p.attendance_id===dayAttendance.attendance_id));unique(sessions,'process_session_id','COMM_ES_CONTEXT_PROCESS_DUPLICATE');const active=one(sessions.filter(p=>!p.stop_at),'COMM_ES_CONTEXT_ACTIVE_PROCESS_DUPLICATE');if(active)need(dayAttendance?.state==='OPEN'&&!dayAttendance.stop_at&&active.attendance_id===dayAttendance.attendance_id,'COMM_ES_CONTEXT_ACTIVE_PROCESS_INVALID');
 const employeeDeltas=(deltas||[]).filter(d=>d.employee_id===s.employee_id&&d.attendance_id===s.employee_id+':'+s.work_date);unique(employeeDeltas,'delta_id','COMM_ES_CONTEXT_DELTA_DUPLICATE');const current=employeeDeltas.filter(d=>d.delta_id.startsWith(s.batch_id+':'+s.employee_id+':'));
 const episodes=parseEpisodes(comm_records,s.employee_id),normDay=dailyFromSnapshot(norm_snapshots,s.employee_id,s.work_date);
 const wrong=current.filter(d=>d.classification==='WRONG_PROCESS'&&active&&d.process_session_id===active.process_session_id&&deltaMetric(d));
 const wrongInvocations=(wrong.length?wrong:[null]).map(delta=>({type:'WRONG_PROCESS',source:{employee,delta:delta?copy(delta):null,active_process:active?copy(active):null},episodes:copy(episodes)}));
 const outside=current.filter(d=>d.classification==='NO_APP'&&deltaMetric(d)).sort((a,b)=>a.delta_id.localeCompare(b.delta_id));
 const outsideInvocation={type:'WORK_OUTSIDE_APP',source:{employee,delta:outside[0]?copy(outside[0]):null,attendance:dayAttendance?copy(dayAttendance):null},episodes:copy(episodes)};
 const noActivityInvocation={type:'NO_ACTIVITY',source:{employee,attendance:dayAttendance?copy(dayAttendance):null,active_process:active?copy(active):null,source:activitySource({active_process:active,deltas:employeeDeltas,day:normDay,now})},episodes:copy(episodes)};
 return {source:s,employee,attendance:dayAttendance?copy(dayAttendance):null,active_process:active?copy(active):null,norm_day:normDay?copy(normDay):null,current_batch_deltas:copy(current),invocations:[...wrongInvocations,outsideInvocation,noActivityInvocation]};
}
module.exports={ES_TYPES,MEASURED,deltaMetric,parseEpisodes,dailyFromSnapshot,activitySource,build};
