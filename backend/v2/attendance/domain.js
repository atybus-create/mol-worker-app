// Pure domain planner. No network or persistence; input.actor is trusted server context.
function planAttendance(input) {
  const fail=(code,message,status=422)=>({ok:false,http_status:status,error:{code,message,retryable:status===503,details:{}}});
  const now=Date.parse(input.now), actor=input.actor, employee=input.employee;
  const dateAt=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
  const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  const parseTime=value=>{
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!validDate(value.slice(0,10)))return NaN;
    if(Number(value.slice(11,13))>23||Number(value.slice(14,16))>59||Number(value.slice(17,19))>59)return NaN;
    return Date.parse(value);
  };
  if(!Number.isFinite(now))return fail('SERVER_TIME_INVALID','Brak poprawnego czasu serwera.',503);
  if(!actor?.employee_id||actor.active!==true||!['WORKER','LEADER','ADMIN'].includes(actor.role))return fail('UNAUTHENTICATED','Sesja nieaktywna.',401);
  if(!employee?.employee_id||employee.active!==true)return fail('EMPLOYEE_INACTIVE','Konto pracownika nieaktywne.',403);
  if(actor.employee_id!==employee.employee_id&&!['LEADER','ADMIN'].includes(actor.role))return fail('FORBIDDEN','Brak uprawnień do pracownika.',403);
  if(!['START','FINISH','REOPEN','CORRECT'].includes(input.operation))return fail('OPERATION_NOT_IMPLEMENTED','Nieznana operacja.',400);
  const b=input.payload||{}, today=dateAt(now), day=b.work_date;
  if(!validDate(day)||day>today)return fail('INVALID_WORK_DATE','Nieprawidłowa lub przyszła data.',400);
  if(!Number.isInteger(b.expected_version)||b.expected_version<0)return fail('EXPECTED_VERSION_REQUIRED','Odśwież stan przed zapisem.',400);
  const rows=(input.attendance||[]).filter(r=>r.employee_id===employee.employee_id);
  if(new Set(rows.map(r=>r.work_date)).size!==rows.length||rows.filter(r=>r.state==='OPEN').length>1)return fail('ATTENDANCE_INCONSISTENT','Wykryto niespójny stan obecności.',503);
  const existing=rows.find(r=>r.work_date===day);
  const before=existing?{...existing}:null;
  if((existing?.version||0)!==b.expected_version)return fail('VERSION_CONFLICT','Dane zmieniły się. Odśwież i ponów.',409);
  const id=employee.employee_id+':'+day;
  let after=existing?{...existing}:{attendance_id:id,employee_id:employee.employee_id,work_date:day,state:'NOT_STARTED',start_at:null,stop_at:null,version:0};
  // Moniti persists whole minutes (confirmed by live read-back). Use the same
  // precision locally when enabled, rather than reporting a false mismatch.
  const quantum=input.moniti_enabled?60000:1000;
  const seconds=ms=>new Date(Math.floor(ms/quantum)*quantum).toISOString();
  if(input.operation==='START'){
    if(day!==today)return fail('START_REQUIRES_TODAY','START jest dostępny wyłącznie dla bieżącego dnia.');
    if(existing&&existing.state!=='NOT_STARTED')return fail('ATTENDANCE_ALREADY_STARTED','Ten dzień jest już rozpoczęty.',409);
    if(rows.some(r=>r.state==='OPEN'))return fail('OPEN_DAY_EXISTS','Najpierw zakończ otwarty dzień pracy.',409);
    after={...after,state:'OPEN',start_at:seconds(now),stop_at:null};
  }else{
    if(!existing?.start_at||!['OPEN','CLOSED'].includes(existing.state))return fail('ATTENDANCE_NOT_STARTED','Brak rozpoczętego dnia.',409);
    if(input.operation==='FINISH'){
      if(existing.state!=='OPEN')return fail('ATTENDANCE_ALREADY_CLOSED','Dzień jest już zakończony.',409);
      after={...after,state:'CLOSED',stop_at:seconds(now)};
    }else{
      const age=(Date.parse(today+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000;
      if(actor.role==='WORKER'&&age>31)return fail('CORRECTION_WINDOW_EXCEEDED','Własne korekty obejmują maksymalnie 31 dni. Starszą zmianę wykonuje lider lub administrator.',403);
      if(input.operation==='REOPEN'){
        if(existing.state!=='CLOSED')return fail('ATTENDANCE_NOT_CLOSED','Dzień nie jest zakończony.',409);
        if(rows.some(r=>r.state==='OPEN'))return fail('OPEN_DAY_EXISTS','Inny dzień jest już otwarty.',409);
        after={...after,state:'OPEN',stop_at:null};
      }else{
        if(typeof b.reason!=='string'||b.reason.trim().length<3||b.reason.length>500)return fail('REASON_REQUIRED','Podaj powód korekty (3–500 znaków).',400);
        const hasStart=b.start_at!==null&&b.start_at!==undefined&&b.start_at!=='';
        const hasStop=b.stop_at!==null&&b.stop_at!==undefined&&b.stop_at!=='';
        if(!hasStart&&!hasStop)return fail('EMPTY_CORRECTION','Podaj co najmniej jedną nową godzinę.',400);
        if(hasStart){const value=parseTime(b.start_at);if(!Number.isFinite(value))return fail('INVALID_TIME','START musi być jednoznacznym czasem ISO z offsetem.',400);after.start_at=new Date(value).toISOString();}
        if(hasStop){const value=parseTime(b.stop_at);if(!Number.isFinite(value))return fail('INVALID_TIME','STOP musi być jednoznacznym czasem ISO z offsetem.',400);after.stop_at=new Date(value).toISOString();after.state='CLOSED';}
      }
    }
  }
  if(input.moniti_enabled){
    if(Date.parse(after.start_at)>now||(after.stop_at&&Date.parse(after.stop_at)>now))return fail('FUTURE_TIME','Godziny nie mogą być przyszłe.');
    if(after.start_at)after.start_at=seconds(Date.parse(after.start_at));
    if(after.stop_at)after.stop_at=seconds(Date.parse(after.stop_at));
  }
  const start=Date.parse(after.start_at), stop=after.stop_at?Date.parse(after.stop_at):null;
  if(!Number.isFinite(start)||(stop!==null&&!Number.isFinite(stop)))return fail('INVALID_TIME','Nieprawidłowy czas.');
  if(start>now||(stop!==null&&stop>now))return fail('FUTURE_TIME','Godziny nie mogą być przyszłe.');
  if(dateAt(start)!==day)return fail('START_DATE_MISMATCH','START musi należeć do wybranego dnia w strefie Europe/Warsaw.');
  if(stop!==null&&stop<start)return fail('STOP_BEFORE_START','STOP nie może być wcześniejszy od START.');
  for(const row of rows){
    if(row.work_date===day||!row.start_at)continue;
    const rs=Date.parse(row.start_at),re=row.stop_at?Date.parse(row.stop_at):Infinity;
    if(!Number.isFinite(rs)||(row.stop_at&&!Number.isFinite(re)))return fail('ATTENDANCE_INCONSISTENT','Nieprawidłowy zapis innego dnia.',503);
    if(start<re&&rs<(stop??Infinity))return fail('ATTENDANCE_OVERLAP','Godziny nakładają się na inny dzień pracy.',409);
  }
  const processes=(input.processes||[]).filter(p=>p.employee_id===employee.employee_id&&p.attendance_id===id);
  if(processes.filter(p=>!p.stop_at).length>1)return fail('PROCESS_INCONSISTENT','Więcej niż jeden aktywny proces.',503);
  const process_updates=[];
  for(const p of processes){
    const ps=Date.parse(p.start_at),pe=p.stop_at?Date.parse(p.stop_at):null;
    if(!Number.isFinite(ps)||(pe!==null&&(!Number.isFinite(pe)||pe<ps)))return fail('PROCESS_INCONSISTENT','Nieprawidłowy czas procesu.',503);
    if(ps<start||(stop!==null&&(ps>stop||(pe!==null&&pe>stop))))return fail('PROCESS_TIME_CONFLICT','Korekta wyklucza zapisany czas procesu. Wymagana osobna korekta procesu.',409);
    if(!p.stop_at&&stop!==null)process_updates.push({...p,stop_at:after.stop_at,version:(p.version||0)+1,last_request_id:input.request_id});
  }
  if(input.operation==='CORRECT'&&before.start_at===after.start_at&&(before.stop_at||null)===(after.stop_at||null))return fail('NO_CHANGE','Korekta nie zmienia godzin.',409);
  after={...after,version:after.version+1,last_request_id:input.request_id,moniti_sync:input.moniti_enabled?'PENDING':'NOT_REQUIRED',drive_sync:'PENDING',correction_required:false};
  const event_type={START:'WORK_STARTED',FINISH:'WORK_FINISHED',REOPEN:'WORK_REOPENED',CORRECT:'ATTENDANCE_CORRECTED'}[input.operation];
  return {ok:true,before,after,process_updates,event_type,reason:input.operation==='CORRECT'?b.reason.trim():null,notify:input.operation==='CORRECT'||input.operation==='REOPEN',presence_seconds:Math.max(0,Math.floor(((stop??now)-start)/1000))};
}

if(typeof module!=='undefined')module.exports={planAttendance};
