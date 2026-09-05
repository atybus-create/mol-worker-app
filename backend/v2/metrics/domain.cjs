'use strict';
// Pure stage-7 rules. All persistence and trusted boundary context live outside this module.
const METRICS_SCHEMA = 1;
const MEASURED = {PAKOWANIE:'PAK', KOMPLETACJA:'PICK'};
const ELIGIBLE = new Set(['MATCH_PROCESS', 'BOUNDARY_PAK_PICK']);
function need(condition, code) { if (!condition) {const e=new Error(code);e.code=code;throw e;} }
function time(value) {const n=Date.parse(value);need(Number.isFinite(n),'INVALID_METRICS_TIME');return n;}
function dayPL(value) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time(value)));}
function validDay(value) {return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function count(value) {if(typeof value==='string'&&/^\d+$/.test(value.trim()))value=Number(value);need(Number.isSafeInteger(value)&&value>=0,'ES_COUNTER_INVALID');return value;}
function unique(rows,key,code) {need(new Set(rows.map(r=>r[key])).size===rows.length,code);}
function json(value,fallback=null) {return value===undefined||value===null||value===''?fallback:JSON.parse(value);}
function canonical(value) {if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
function semantic(value) {if(Array.isArray(value))return value.map(semantic);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['version','calculated_at','observed_at'].includes(k)).map(([k,v])=>[k,semantic(v)]));return value;}
function mappingStatus(employees) {
  const active=employees.filter(e=>e.active===true),n=new Map();
  for(const e of active){const op=String(e.es_worker_id??'').trim().toLowerCase();if(op)n.set(op,(n.get(op)||0)+1);}
  return active.map(e=>{const op=String(e.es_worker_id??'').trim().toLowerCase();return {employee_id:e.employee_id,es_operator:op,error_code:!op?'ES_OPERATOR_NOT_CONFIGURED':n.get(op)!==1?'ES_MAPPING_AMBIGUOUS':null};});
}
function boundaryFromCommand(command, attendance, processes) {
  if(!command)return null;
  need(command.status==='RECOVERY_REQUIRED','BOUNDARY_COMMAND_NOT_PREPARED');
  need(['ATTENDANCE_START','ATTENDANCE_FINISH','ATTENDANCE_REOPEN','ATTENDANCE_PROCESS_START','ATTENDANCE_PROCESS_CHANGE','ATTENDANCE_PROCESS_LOGOUT'].includes(command.operation),'BOUNDARY_OPERATION_INVALID');
  const frozen=json(command.response_json),p=frozen?.plan;
  need(p?.ok===true&&p.after?.employee_id===command.employee_id&&p.after?.last_request_id===command.request_id,'BOUNDARY_PLAN_INVALID');
  const current=attendance.find(a=>a.attendance_id===p.after.attendance_id);
  const alreadyApplied=current?.version===p.after.version&&current?.last_request_id===command.request_id;
  need(!alreadyApplied,'BOUNDARY_ALREADY_APPLIED_WITHOUT_RECEIPT');
  need((current?.version||0)===(p.before?.version||0),'BOUNDARY_VERSION_CONFLICT');
  const old=processes.find(s=>s.employee_id===command.employee_id&&!s.stop_at);
  const next=(p.process_updates||[]).find(s=>!s.stop_at);
  const measuredSwitch=command.operation==='ATTENDANCE_PROCESS_CHANGE'&&old&&next&&MEASURED[old.process_code]&&MEASURED[next.process_code]&&old.process_code!==next.process_code;
  return {request_id:command.request_id,employee_id:command.employee_id,attendance_id:p.after.attendance_id,old_session_id:old?.process_session_id||null,new_session_id:next?.process_session_id||null,old_process:old?.process_code||null,new_process:next?.process_code||null,measured_switch:!!measuredSwitch};
}
function freezeESBatch({batch_id,work_date,captured_at,request_started_at,report=[],employees,checkpoints=[],attendance=[],processes=[],origin='SCHEDULE',source_error=null,boundary=null}) {
  need(typeof batch_id==='string'&&/^[A-Za-z0-9:_-]{8,140}$/.test(batch_id),'ES_BATCH_ID_INVALID');
  need(validDay(work_date),'ES_DATE_INVALID');
  const captured=time(captured_at),started=time(request_started_at);need(started<=captured,'ES_TIME_ORDER_INVALID');
  unique(checkpoints,'checkpoint_id','ES_CHECKPOINT_DUPLICATE');unique(employees,'employee_id','EMPLOYEE_DUPLICATE');
  const byOp=new Map();
  for(const row of report){const op=String(row.es_operator??'').trim().toLowerCase();need(op&&!byOp.has(op),'ES_DUPLICATE_OPERATOR');byOp.set(op,{pak:count(row.pak),pick:count(row.pick)});}
  const crossed=dayPL(captured_at)!==work_date||dayPL(request_started_at)!==work_date;
  const plan={schema_version:METRICS_SCHEMA,batch_id,work_date,captured_at,request_started_at,origin,boundary_request_id:boundary?.request_id||null,deltas:[],checkpoints:[],targets:[],observations:[]};
  const targets=new Set();
  for(const map of mappingStatus(employees)){
    const key=map.employee_id+':'+work_date,prev=checkpoints.find(c=>c.checkpoint_id===key),state=json(prev?.state_json),row=byOp.get(map.es_operator);
    if((prev?.last_attempt_at&&captured<=time(prev.last_attempt_at))||(state?.captured_at&&started<time(state.captured_at))){plan.observations.push({employee_id:map.employee_id,status:'IGNORED_OLD_OR_DUPLICATE'});continue;}
    const issue=map.error_code||source_error||(crossed?'ES_DAY_BOUNDARY_RETRY':null)||(!row?'ES_OPERATOR_NOT_FOUND':null);
    const opens=attendance.filter(a=>a.employee_id===map.employee_id&&a.state==='OPEN'&&!a.stop_at);need(opens.length<=1,'ATTENDANCE_INCONSISTENT');
    const open=opens[0];if(open)need(time(open.start_at)<=captured,'ATTENDANCE_INCONSISTENT');
    const acts=processes.filter(p=>p.employee_id===map.employee_id&&!p.stop_at);need(acts.length<=1,'PROCESS_INCONSISTENT');
    const active=acts[0];if(active)need(open&&active.attendance_id===open.attendance_id&&time(active.start_at)<=captured,'PROCESS_INCONSISTENT');
    const target=open?.attendance_id||key;targets.add(key);targets.add(target);
    const base={checkpoint_id:key,employee_id:map.employee_id,work_date,es_operator:map.es_operator,version:(prev?.version||0)+1,state_json:prev?.state_json||'',last_good_at:prev?.last_good_at||null,last_attempt_at:captured_at,error_code:issue||''};
    if(issue){
      if(boundary?.employee_id===map.employee_id&&state)base.state_json=JSON.stringify({...state,rebaseline_required:true,coverage_gaps:(state.coverage_gaps||0)+1});
      plan.checkpoints.push(base);plan.observations.push({employee_id:map.employee_id,status:issue});continue;
    }
    const reset=!!state&&(row.pak<state.pak||row.pick<state.pick);
    const baseline=!state||state.work_date!==work_date||prev.es_operator!==map.es_operator||reset||state.rebaseline_required===true;
    const amounts={PAK:baseline?0:row.pak-count(state.pak),PICK:baseline?0:row.pick-count(state.pick)};
    const matchedBoundary=boundary?.measured_switch===true&&boundary.employee_id===map.employee_id&&boundary.attendance_id===open?.attendance_id&&boundary.old_session_id===active?.process_session_id;
    for(const [metric,amount] of Object.entries(amounts))if(amount>0){
      const classification=!open?'NO_APP':!active?'NO_PROCESS':!MEASURED[active.process_code]?'NON_MEASURABLE':MEASURED[active.process_code]===metric?'MATCH_PROCESS':matchedBoundary?'BOUNDARY_PAK_PICK':'WRONG_PROCESS';
      plan.deltas.push({delta_id:batch_id+':'+map.employee_id+':'+metric,employee_id:map.employee_id,source_time:captured_at,captured_at,pak_count:metric==='PAK'?amount:0,pick_count:metric==='PICK'?amount:0,classification,process_session_id:active?.process_session_id||'',attendance_id:target});
    }
    const next={schema_version:METRICS_SCHEMA,work_date,pak:row.pak,pick:row.pick,captured_at,last_batch_id:batch_id,baseline_at:baseline?captured_at:state.baseline_at,initial_baseline_at:state?.initial_baseline_at||captured_at,initial_pak:state?.initial_pak??row.pak,initial_pick:state?.initial_pick??row.pick,reset_count:(state?.reset_count||0)+(reset?1:0),coverage_gaps:state?.coverage_gaps||0,rebaseline_required:false};
    base.state_json=JSON.stringify(next);base.last_good_at=captured_at;plan.checkpoints.push(base);
    plan.observations.push({employee_id:map.employee_id,status:baseline?(reset?'RESET_BASELINE':state?.rebaseline_required?'GAP_BASELINE':'INITIAL_BASELINE'):'CAPTURED',pak_delta:amounts.PAK,pick_delta:amounts.PICK,attendance_id:open?.attendance_id||null,process_code:active?.process_code||null,checkpoint_before_version:prev?.version||0,checkpoint_after_version:base.version});
  }
  plan.targets=[...targets].sort().map(aggregate_id=>({aggregate_id,employee_id:aggregate_id.split(':')[0],work_date:aggregate_id.split(':')[1]}));return plan;
}
function processTimes(attendance,processes,now) {
  const out={presence_seconds:0,process_seconds:0,between_process_seconds:0,pak_seconds:0,pick_seconds:0,time_by_process:{},active_process:null};
  if(!attendance?.start_at){need(!processes.length,'PROCESS_WITHOUT_ATTENDANCE');return out;}
  const start=time(attendance.start_at),end=attendance.stop_at?time(attendance.stop_at):time(now);need(end>=start,'ATTENDANCE_TIME_INVALID');
  need(['OPEN','CLOSED'].includes(attendance.state)&&(attendance.state==='OPEN'?!attendance.stop_at:!!attendance.stop_at),'ATTENDANCE_STATE_INVALID');
  unique(processes,'process_session_id','PROCESS_DUPLICATE');const ordered=[...processes].sort((a,b)=>time(a.start_at)-time(b.start_at));let last=start;
  for(const p of ordered){need(p.attendance_id===attendance.attendance_id&&p.employee_id===attendance.employee_id,'PROCESS_OWNER_INVALID');const s=time(p.start_at),e=p.stop_at?time(p.stop_at):end;need(s>=last&&s>=start&&e>=s&&e<=end,'PROCESS_TIME_INCONSISTENT');if(!p.stop_at){need(attendance.state==='OPEN'&&!out.active_process,'PROCESS_MULTIPLE_ACTIVE');out.active_process=p;}
    const seconds=Math.floor((e-s)/1000);out.process_seconds+=seconds;out.time_by_process[p.process_code]=(out.time_by_process[p.process_code]||0)+seconds;if(p.process_code==='PAKOWANIE')out.pak_seconds+=seconds;if(p.process_code==='KOMPLETACJA')out.pick_seconds+=seconds;last=e;}
  out.presence_seconds=Math.floor((end-start)/1000);out.between_process_seconds=out.presence_seconds-out.process_seconds;need(out.between_process_seconds>=0,'PROCESS_TIME_INCONSISTENT');return out;
}
function percentages(pak,pick,pakSeconds,pickSeconds) {
  const pct=(n,d)=>d>0?n/d*100:null;
  const denominator=(pakSeconds+pickSeconds)/3600*70,numerator=pak+pick/3;
  return {pak_percent:pct(pak,pakSeconds/3600*70),pick_percent:pct(pick,pickSeconds/3600*210),combined_percent:pct(numerator,denominator),numerator,denominator,reason:denominator===0?'NO_ELIGIBLE_PROCESS_TIME':null};
}
function dailySummary({employee_id,work_date,attendance=null,processes=[],deltas=[],checkpoint=null,previous=null,now,stale_seconds=180,mapping_error=null,commands=[]}) {
  need(validDay(work_date),'INVALID_WORK_DATE');const nowMs=time(now),id=employee_id+':'+work_date;need(!attendance||attendance.attendance_id===id,'ATTENDANCE_KEY_MISMATCH');
  const times=processTimes(attendance,processes,now);unique(deltas,'delta_id','DELTA_DUPLICATE');
  let pak=0,pick=0,outsidePak=0,outsidePick=0;const reasons={};
  for(const d of deltas){need(d.employee_id===employee_id&&d.attendance_id===id,'DELTA_OWNER_INVALID');const p=count(d.pak_count),k=count(d.pick_count);need(!!p!==!!k,'DELTA_METRIC_INVALID');need(['MATCH_PROCESS','BOUNDARY_PAK_PICK','NO_APP','NO_PROCESS','NON_MEASURABLE','WRONG_PROCESS'].includes(d.classification),'DELTA_CLASSIFICATION_INVALID');
    if(d.classification==='BOUNDARY_PAK_PICK')need(d.delta_id.startsWith('ESB-'),'BOUNDARY_ID_INVALID');
    if(d.delta_id.startsWith('ESB-')){const req=d.delta_id.slice(4,40);need(commands.some(c=>c.request_id===req&&c.status==='COMMITTED'),'BOUNDARY_NOT_COMMITTED');}
    if(ELIGIBLE.has(d.classification)){pak+=p;pick+=k;}else{outsidePak+=p;outsidePick+=k;reasons[d.classification]=(reasons[d.classification]||0)+p+k;}
  }
  const state=json(checkpoint?.state_json),lastGood=checkpoint?.last_good_at||null;
  const ended=attendance?.state==='CLOSED';
  let error=mapping_error||checkpoint?.error_code||(!lastGood?'ES_NOT_OBSERVED':null);
  if(!error&&(!ended||time(lastGood)<time(attendance.stop_at))&&nowMs-time(lastGood)>stale_seconds*1000)error='ES_STALE';
  const gaps=state?.coverage_gaps||0;
  const coverage=!lastGood?'UNOBSERVED':state?.reset_count||gaps?'GAPPED':attendance?.start_at&&time(state?.initial_baseline_at||lastGood)>time(attendance.start_at)?'PARTIAL':'COMPLETE';
  const computed={summary_id:id,employee_id,work_date,attendance_version:attendance?.version||0,state:attendance?.state||'NOT_STARTED',...times,eligible_pak:pak,eligible_pick:pick,outside_pak:outsidePak,outside_pick:outsidePick,outside_reasons:reasons,...percentages(pak,pick,times.pak_seconds,times.pick_seconds),freshness:error?(previous?.has_value?'STALE':'UNAVAILABLE'):'FRESH',source_error:error,coverage,has_value:!error,calculated_at:now,es_last_good_at:lastGood,version:(previous?.version||0)+1};
  delete computed.active_process;
  if(error&&previous?.has_value)return {...previous,freshness:'STALE',source_error:error,observed_at:now,version:computed.version};
  if(error)return {...computed,pak_percent:null,pick_percent:null,combined_percent:null,reason:computed.reason||error};
  return computed;
}
function monthSummary(employee_id,month,days,now) {
  need(/^\d{4}-(0[1-9]|1[0-2])$/.test(month),'INVALID_MONTH');unique(days,'work_date','DAILY_DUPLICATE');
  const totals={eligible_pak:0,eligible_pick:0,outside_pak:0,outside_pick:0,pak_seconds:0,pick_seconds:0,presence_seconds:0,process_seconds:0,between_process_seconds:0};
  for(const d of days){need(d.employee_id===employee_id&&d.work_date.startsWith(month+'-'),'MONTH_SCOPE_MISMATCH');for(const key of Object.keys(totals)){need(Number.isFinite(d[key])&&d[key]>=0,'DAILY_TOTAL_INVALID');totals[key]+=d[key];}}
  const relevant=days.filter(d=>d.state!=='NOT_STARTED'||d.eligible_pak+d.eligible_pick+d.outside_pak+d.outside_pick>0),unavailable=relevant.some(d=>d.freshness==='UNAVAILABLE'),stale=relevant.some(d=>d.freshness==='STALE');
  const p=percentages(totals.eligible_pak,totals.eligible_pick,totals.pak_seconds,totals.pick_seconds);
  return {summary_id:employee_id+':'+month,employee_id,month,...totals,...p,...(unavailable?{pak_percent:null,pick_percent:null,combined_percent:null,reason:p.reason||'INCOMPLETE_MONTH_DATA',source_error:'INCOMPLETE_MONTH_DATA'}:{}),freshness:unavailable?'UNAVAILABLE':stale?'STALE':'FRESH',coverage:relevant.some(d=>d.coverage!=='COMPLETE')?'PARTIAL':'COMPLETE',calculated_at:now,days:days.length};
}
function publishMonth(previous,daily,now) {
  const month=daily.work_date.slice(0,7),employee_id=daily.employee_id,old=previous?json(previous.payload_json):null;
  need(!previous||(previous.summary_id===employee_id+':'+month&&old?.schema_version===1),'NORM_SNAPSHOT_INVALID');
  const days=[...(old?.days||[]).filter(d=>d.work_date!==daily.work_date),daily].sort((a,b)=>a.work_date.localeCompare(b.work_date));
  let monthly=monthSummary(employee_id,month,days,now);
  if(monthly.freshness==='UNAVAILABLE'&&old?.monthly?.freshness!=='UNAVAILABLE'&&old?.monthly)monthly={...old.monthly,freshness:'STALE',source_error:'INCOMPLETE_MONTH_DATA'};
  const payload={schema_version:1,employee_id,month,days,monthly},fingerprint=canonical(semantic(payload));
  if(previous?.fingerprint===fingerprint)return Object.fromEntries(['summary_id','employee_id','month','version','payload_json','fingerprint','calculated_at'].map(k=>[k,previous[k]]));
  return {summary_id:employee_id+':'+month,employee_id,month,version:(previous?.version||0)+1,payload_json:JSON.stringify(payload),fingerprint,calculated_at:now};
}
if(typeof module!=='undefined')module.exports={need,time,dayPL,validDay,count,json,canonical,semantic,mappingStatus,boundaryFromCommand,freezeESBatch,processTimes,percentages,dailySummary,monthSummary,publishMonth};
