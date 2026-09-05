// Pure process planner. Actor and clock must be supplied by the authenticated service.
function processSnapshot({attendance, processes=[], now}) {
  const end=attendance?.stop_at?Date.parse(attendance.stop_at):Date.parse(now);
  if(!attendance?.start_at)return {active_process:null,process_sessions:[],process_seconds:0,no_process_seconds:0,presence_seconds:0};
  const start=Date.parse(attendance.start_at), rows=processes.filter(p=>p.attendance_id===attendance.attendance_id);
  const seconds=rows.reduce((n,p)=>n+Math.max(0,(Math.min(end,p.stop_at?Date.parse(p.stop_at):end)-Math.max(start,Date.parse(p.start_at)))/1000),0);
  const presence=Math.max(0,(end-start)/1000);
  return {active_process:rows.find(p=>!p.stop_at)||null,process_sessions:rows,process_seconds:Math.floor(seconds),no_process_seconds:Math.floor(Math.max(0,presence-seconds)),presence_seconds:Math.floor(presence)};
}

function planProcess(input) {
  const fail=(code,message,status=409)=>({ok:false,http_status:status,error:{code,message}});
  const {actor,employee,payload:b={},operation,request_id}=input;
  if(!actor?.active||!['WORKER','LEADER','ADMIN'].includes(actor.role))return fail('UNAUTHENTICATED','Sesja nieaktywna.',401);
  if(!employee?.active)return fail('EMPLOYEE_INACTIVE','Konto nieaktywne.',403);
  // Leaders may inspect all workers, but process selection is always the worker's own action.
  if(actor.employee_id!==employee.employee_id)return fail('FORBIDDEN','Proces zmieniasz wyłącznie na własnym koncie.',403);
  if(!['PROCESS_START','PROCESS_CHANGE','PROCESS_LOGOUT'].includes(operation))return fail('INVALID_OPERATION','Nieznana operacja.',400);
  const now=Date.parse(input.now);
  if(!Number.isFinite(now))return fail('SERVER_TIME_INVALID','Nieprawidłowy czas serwera.',503);
  const rows=(input.attendance||[]).filter(a=>a.employee_id===employee.employee_id);
  const open=rows.filter(a=>a.state==='OPEN');
  if(open.length>1||new Set(rows.map(a=>a.work_date)).size!==rows.length)return fail('ATTENDANCE_INCONSISTENT','Niespójna obecność.',503);
  const before=rows.find(a=>a.work_date===b.work_date);
  if(!before||before.state!=='OPEN'||before.stop_at)return fail('ATTENDANCE_NOT_OPEN','Najpierw rozpocznij dzień pracy.');
  if(!Number.isInteger(b.expected_version)||b.expected_version<0)return fail('EXPECTED_VERSION_REQUIRED','Odśwież stan przed zapisem.',400);
  if(before.version!==b.expected_version)return fail('VERSION_CONFLICT','Dane zmieniły się. Odśwież stan.');
  // Same minute precision as attendance while Moniti is enabled: immediate STOP remains valid.
  const stamp=new Date(Math.floor(now/(input.moniti_enabled?60000:1000))*(input.moniti_enabled?60000:1000)).toISOString();
  const at=Date.parse(stamp), start=Date.parse(before.start_at);
  if(!Number.isFinite(start)||start>at)return fail('PROCESS_TIME_CONFLICT','Proces nie może zacząć się przed obecnością.');
  const all=(input.processes||[]).filter(p=>p.employee_id===employee.employee_id);
  const active=all.filter(p=>!p.stop_at), current=active[0];
  if(active.length>1||(current&&current.attendance_id!==before.attendance_id)||new Set(all.map(p=>p.process_session_id)).size!==all.length)return fail('PROCESS_INCONSISTENT','Niespójne sesje procesów.',503);
  const sessions=all.filter(p=>p.attendance_id===before.attendance_id).sort((a,b)=>Date.parse(a.start_at)-Date.parse(b.start_at));
  let previousEnd=start;
  for(const p of sessions){const ps=Date.parse(p.start_at),pe=p.stop_at?Date.parse(p.stop_at):at;
    if(!Number.isFinite(ps)||!Number.isFinite(pe)||ps<previousEnd||pe<ps||pe>at)return fail('PROCESS_INCONSISTENT','Czasy procesów nakładają się lub wykraczają poza obecność.',503);
    previousEnd=pe;
  }
  if(operation==='PROCESS_START'&&current)return fail('PROCESS_ALREADY_ACTIVE','Proces już trwa. Użyj zmiany procesu.');
  if(operation!=='PROCESS_START'&&!current)return fail('PROCESS_NOT_ACTIVE','Nie ma aktywnego procesu.');
  if(operation!=='PROCESS_LOGOUT'){
    const matches=(input.catalog||[]).filter(p=>p.process_code===b.process_code&&p.active===true);
    if(matches.length!==1)return fail('PROCESS_UNAVAILABLE','Wybierz dostępny proces.',422);
    if(current?.process_code===b.process_code)return fail('PROCESS_UNCHANGED','Ten proces już trwa.');
  }
  const updates=[];
  if(current)updates.push({...current,stop_at:stamp,version:current.version+1,last_request_id:request_id});
  if(operation!=='PROCESS_LOGOUT')updates.push({process_session_id:request_id+':process',attendance_id:before.attendance_id,employee_id:employee.employee_id,process_code:b.process_code,start_at:stamp,stop_at:null,version:1,last_request_id:request_id});
  const after={...before,version:before.version+1,last_request_id:request_id,drive_sync:'PENDING'};
  const result=sessions.map(p=>updates.find(u=>u.process_session_id===p.process_session_id)||p);
  for(const u of updates)if(!result.some(p=>p.process_session_id===u.process_session_id))result.push(u);
  return {ok:true,before,after,process_before:sessions,process_updates:updates,event_type:operation,notify:false,reason:null,...processSnapshot({attendance:after,processes:result,now:input.now})};
}
if(typeof module!=='undefined')module.exports={planProcess,processSnapshot};
