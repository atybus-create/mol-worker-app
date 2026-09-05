(() => {
  const el=id=>document.getElementById(id), base='https://n8n.estyl.team/webhook/mol-app-v2-attendance-';
  let token='',employee='',role='',generation=0,readSequence=0,busy=false,snapshot=null,pending=null,sheetProposal=null,confirmedAt=0,editingCorrection=false;
  const dateAt=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const storageKey=()=>`mol.v2.attendance.pending.${employee}`;
  function savePending(value){pending=value;try{if(value)sessionStorage.setItem(storageKey(),JSON.stringify(value));else sessionStorage.removeItem(storageKey());}catch{}}
  function buttons(){for(const id of ['workDate','normMonth','attendanceRefresh','workStart','workFinish','workReopen','correctionStart','correctionStop','correctionReason','correctionSave','sheetCorrectionId','sheetPreviewButton','sheetApproveButton','processChoice','processStart','processChange','processLogout'])el(id).disabled=busy||!!pending;
    el('attendanceRetry').hidden=!pending;el('attendanceRetry').disabled=busy;
    const a=snapshot?.attendance;const active=snapshot?.active_process;el('processStart').hidden=!!active;el('processChange').hidden=!active;el('processLogout').hidden=!active;for(const id of ['processChoice','processStart','processChange','processLogout'])if(!snapshot||a?.state!=='OPEN'||snapshot.writes_enabled!==true)el(id).disabled=true;el('workStart').hidden=!!a?.start_at||!!snapshot?.open_day;
    el('workFinish').hidden=!snapshot?.open_day;el('workReopen').hidden=a?.state!=='CLOSED';
    el('correctionForm').hidden=!a?.start_at;
    if(!snapshot||snapshot.writes_enabled!==true)for(const id of ['workStart','workFinish','workReopen','correctionSave'])el(id).disabled=true;
  }
  function clearDisplay(){window.molNorms?.reset();editingCorrection=false;for(const id of ['workTimes','workSync','openDayNote','managerNotices','sheetProposal','processState','processTotals','processHistory'])el(id).textContent='';for(const id of ['correctionStart','correctionStop','correctionReason','sheetCorrectionId'])el(id).value='';el('workState').textContent='Odczyt…';el('sheetApproveButton').hidden=true;}
  function message(s){el('attendanceMessage').textContent=s;}
  const time=s=>s?new Date(s).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',dateStyle:'short',timeStyle:'short'}):'—';
  function localInput(s){if(!s)return '';const d=new Date(s);return dateAt(d)+'T'+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);}
  function toISO(s){if(!s)return null;const matches=['+01:00','+02:00'].map(offset=>new Date(s+':00'+offset)).filter(d=>Number.isFinite(d.getTime())&&localInput(d.toISOString())===s);if(matches.length!==1)throw new Error('Godzina jest nieistniejąca lub niejednoznaczna przy zmianie czasu. Wybierz inną godzinę.');return matches[0].toISOString();}
  function render(data){if(data.work_date!==el('workDate').value||data.month!==el('normMonth').value||data.employee?.employee_id!==employee||data.user?.employee_id!==employee)return false;
    if(!window.molNorms?.validate(data))throw new Error('Niepełny snapshot. Poprzednie normy pozostają widoczne.');
    if(snapshot?.work_date===data.work_date&&snapshot?.month===data.month&&snapshot.snapshot_version>data.snapshot_version)return false;
    snapshot=data;confirmedAt=Date.now();window.molNorms.render(data);const a=data.attendance;
    const choice=el('processChoice'),previous=choice.value;choice.replaceChildren(...(data.process_catalog||[]).map(p=>{const option=document.createElement('option');option.value=p.process_code;option.textContent=p.display_name;return option;}));if((data.process_catalog||[]).some(p=>p.process_code===previous))choice.value=previous;
    const name=code=>(data.process_catalog||[]).find(p=>p.process_code===code)?.display_name||code;el('processState').textContent=data.active_process?`Aktywny: ${name(data.active_process.process_code)} · od ${time(data.active_process.start_at)}`:'Brak aktywnego procesu';el('processHistory').textContent=(data.process_sessions||[]).map(p=>`${name(p.process_code)}: ${time(p.start_at)} → ${p.stop_at?time(p.stop_at):'trwa'}`).join('\n');tickProcesses();
    el('workState').textContent=({OPEN:'W pracy',CLOSED:'Dzień zakończony'})[a?.state]||'Dzień nierozpoczęty';
    el('workTimes').textContent=`START: ${time(a?.start_at)} · STOP: ${time(a?.stop_at)}`;
    el('workSync').textContent=`Moniti: ${{SYNCED:'potwierdzone',NOT_REQUIRED:'wyłączone'}[a?.moniti_sync]|| (data.moniti_enabled?'włączone':'wyłączone')} · Drive: ${a?.drive_sync==='SYNCED'?'potwierdzone':a?'oczekuje na synchronizację':'—'}`;
    el('openDayNote').textContent=data.open_day&&data.open_day.work_date!==data.work_date?`Otwarty dzień: ${data.open_day.work_date}. STOP zakończy ten dzień.`:'';
    el('managerNotices').textContent=(data.notifications||[]).map(n=>`${n.employee_id}: ${{WORK_REOPENED:'wznowienie dnia',ATTENDANCE_CORRECTED:'korekta godzin',ATTENDANCE_RECOVERY:'zapis wymaga dokończenia'}[n.type]||n.type} (${time(n.opened_at)})`).join('\n');
    el('correctionStart').value=localInput(a?.start_at);el('correctionStop').value=localInput(a?.stop_at);buttons();return true;
  }
  async function request(op,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
    const viewRead=op==='status'&&!body?.correction_id;
    if(viewRead)body={...(body||{work_date:el('workDate').value}),month:el('normMonth').value};
    const query=op==='status'?'?'+Object.entries(body||{work_date:el('workDate').value}).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&'):'';
    const endpoint=viewRead?base.replace('attendance-','')+'worker-status':(op.startsWith('process-')?base.replace('attendance-','')+op:base+op);
    try{const response=await fetch(endpoint+query,{method:op==='status'?'GET':'POST',cache:'no-store',credentials:'omit',headers:{Authorization:`Bearer ${token}`,...(body&&op!=='status'?{'Content-Type':'application/json'}:{})},body:body&&op!=='status'?JSON.stringify(body):undefined,signal:controller.signal});const envelope=await response.json();if(!response.ok||envelope.ok!==true){const e=new Error(envelope.error?.message||'Brak potwierdzenia operacji.');e.status=response.status;e.code=envelope.error?.code;throw e;}return envelope.data;
    }catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw new Error('Brak potwierdzenia z serwera. Ponów to samo żądanie.');throw e;}finally{clearTimeout(timer);}}
  async function refresh(silent=false){if(!token||busy)return;const gen=generation,seq=++readSequence;busy=true;buttons();if(!silent)message('Odczyt potwierdzonego stanu…');try{const data=await request('status');if(gen!==generation||seq!==readSequence)return;if(!render(data))return;message(pending?'Poprzednie żądanie oczekuje na potwierdzenie. Użyj „Ponów zapis”.':'Stan potwierdzony przez backend.');}catch(e){if(gen===generation){message(e.message);window.molNorms?.disconnected(e.message);}}finally{if(gen===generation){busy=false;buttons();}}}
  async function submit(op,body){if(!token||busy)return;const gen=generation;let failure='';savePending({op,body});busy=true;++readSequence;buttons();message(op.startsWith('process-')?'Zapisywanie procesu…':'Zapisywanie i weryfikacja w Moniti…');try{
    for(let attempt=0;;attempt++){
      if(gen!==generation)return;
      try{await request(op,body);break;}catch(e){
        if(gen!==generation)return;
        if(e.code!=='COMMAND_BUSY'||attempt>=3)throw e;
        message('Trwa inny zapis. Automatycznie ponawiam to samo żądanie…');
        await new Promise(resolve=>setTimeout(resolve,2000*2**attempt));
      }
    }
    if(gen!==generation)return;savePending(null);message('Zapis potwierdzony.');}catch(e){if(gen!==generation)return;if(e.status>=400&&e.status<500&&e.code!=='COMMAND_BUSY')savePending(null);failure=e.message;message(e.message+(pending?' Ponów zapis tym samym przyciskiem.':''));}finally{if(gen===generation){busy=false;buttons();if(!pending){await refresh();if(failure&&gen===generation)message(failure);}}}}
  const duration=s=>{s=Math.max(0,Math.floor(s||0));return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0')).join(':');};
  function tickProcesses(){if(!snapshot)return;const delta=snapshot.attendance?.state==='OPEN'?Math.max(0,Math.floor((Date.now()-confirmedAt)/1000)):0;el('processTotals').textContent=`W procesach: ${duration((snapshot.process_seconds||0)+(snapshot.active_process?delta:0))} · Bez procesu: ${duration((snapshot.no_process_seconds||0)+(snapshot.active_process?0:delta))}`;}
  setInterval(tickProcesses,1000);
  function processCommand(op){if(busy||pending||snapshot?.attendance?.state!=='OPEN')return;submit('process-'+op,{request_id:crypto.randomUUID(),work_date:snapshot.work_date,expected_version:snapshot.attendance.version,...(op==='logout'?{}:{process_code:el('processChoice').value})});}
  el('processStart').addEventListener('click',()=>processCommand('start'));el('processChange').addEventListener('click',()=>processCommand('change'));el('processLogout').addEventListener('click',()=>processCommand('logout'));
  function command(op){if(!snapshot||busy||pending)return;const a=op==='finish'?snapshot.open_day:snapshot.attendance;submit(op,{request_id:crypto.randomUUID(),work_date:a?.work_date||el('workDate').value,expected_version:a?.version||0});}
  el('workStart').addEventListener('click',()=>command('start'));el('workFinish').addEventListener('click',()=>command('finish'));el('workReopen').addEventListener('click',()=>command('reopen'));
  el('attendanceRefresh').addEventListener('click',()=>{editingCorrection=false;refresh();});el('workDate').addEventListener('change',()=>{snapshot=null;clearDisplay();el('normMonth').value=el('workDate').value.slice(0,7);refresh();});
  el('normMonth').addEventListener('change',()=>{snapshot=null;clearDisplay();refresh();});
  for(const id of ['correctionStart','correctionStop','correctionReason'])el(id).addEventListener('input',()=>{editingCorrection=true;});
  setInterval(()=>{if(token&&!busy&&!pending&&!editingCorrection&&document.hidden!==true)refresh(true);},30000);
  el('attendanceRetry').addEventListener('click',()=>{if(pending)submit(pending.op,pending.body);});
  el('correctionForm').addEventListener('submit',e=>{e.preventDefault();if(!snapshot?.attendance||busy||pending)return;try{submit('correct',{request_id:crypto.randomUUID(),work_date:el('workDate').value,expected_version:snapshot.attendance.version,start_at:toISO(el('correctionStart').value),stop_at:toISO(el('correctionStop').value),reason:el('correctionReason').value.trim()});}catch(error){message(error.message);}});
  el('sheetPreviewButton').addEventListener('click',async()=>{if(busy||pending)return;const gen=generation;busy=true;sheetProposal=null;el('sheetApproveButton').hidden=true;buttons();try{const data=await request('status',{correction_id:el('sheetCorrectionId').value.trim()});if(gen!==generation)return;sheetProposal=data;const p=data.proposal;el('sheetProposal').textContent=`Pracownik: ${p.employee_id}. Dzień: ${p.work_date}. Wersja: ${p.expected_version}. Nowy START: ${time(p.start_at)}. Nowy STOP: ${p.stop_at?time(p.stop_at):'bez zmiany'}. Powód: ${p.reason}`;el('sheetApproveButton').hidden=false;}catch(e){if(gen===generation)el('sheetProposal').textContent=e.message;}finally{if(gen===generation){busy=false;buttons();}}});
  el('sheetCorrectionId').addEventListener('input',()=>{sheetProposal=null;el('sheetApproveButton').hidden=true;});
  el('sheetApproveButton').addEventListener('click',()=>{if(!sheetProposal||busy||pending)return;const data=sheetProposal;sheetProposal=null;el('sheetApproveButton').hidden=true;submit('correct',{request_id:data.proposal.request_id,correction_id:data.proposal.request_id,approved_hash:data.approved_hash});});
  window.molAttendance={hide(){clearDisplay();generation++;token='';snapshot=null;sheetProposal=null;busy=false;el('attendancePanel').hidden=true;},activate(data,t){if(token===t&&employee===data.user.employee_id&&role===data.user.role)return;generation++;token=t;employee=data.user.employee_id;role=data.user.role;clearDisplay();busy=false;snapshot=null;pending=null;sheetProposal=null;el('sheetApprovalPanel').hidden=!['LEADER','ADMIN'].includes(data.user.role);el('sheetApproveButton').hidden=true;el('sheetProposal').textContent='';try{const p=JSON.parse(sessionStorage.getItem(storageKey())||'null');if(p?.body?.request_id&&['start','finish','reopen','correct','process-start','process-change','process-logout'].includes(p.op))pending=p;}catch{}el('workDate').value=pending?.body?.work_date||dateAt(new Date());el('workDate').max=dateAt(new Date());el('normMonth').value=el('workDate').value.slice(0,7);el('normMonth').max=dateAt(new Date()).slice(0,7);el('attendancePanel').hidden=false;refresh();}};
})();
