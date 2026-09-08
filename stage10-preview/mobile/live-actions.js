(() => {
  'use strict';
  const api=window.MOLApi; if(!api) return;
  const E2E_KEY='mol.v2.stage11.read-e2e';
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const setStatus=(text,state='info')=>{let bar=document.querySelector('[data-live-integration-status]');if(!bar){bar=document.createElement('div');bar.dataset.liveIntegrationStatus='true';bar.style.cssText='position:sticky;top:0;z-index:90;margin:0 auto 10px;max-width:560px;padding:9px 12px;border:1px solid rgba(18,200,255,.28);border-radius:10px;background:rgba(3,20,31,.96);font:600 12px/1.35 system-ui';document.querySelector('.worker-shell')?.prepend(bar);}bar.textContent=text;bar.style.color=state==='error'?'#ff9aa4':state==='ok'?'#86f4c9':'#bfefff';bar.style.borderColor=state==='error'?'rgba(255,82,97,.65)':state==='ok'?'rgba(25,231,160,.55)':'rgba(18,200,255,.28)';};
  const esc=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const localIso=(value)=>{if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString();};
  const waitE2E=async()=>{for(let i=0;i<120;i++){try{const r=JSON.parse(sessionStorage.getItem(E2E_KEY)||'null');if(r?.passed===true)return r;if(r?.passed===false)throw new Error(r.failures?.[0]||'Authenticated E2E odczytów nie przeszedł.');}catch(e){if(i>5&&String(e.message).includes('E2E'))throw e;}await sleep(250);}throw new Error('Timeout authenticated E2E odczytów.');};
  const lock=async(button,fn)=>{if(button?.dataset.busy==='1')return; if(button){button.dataset.busy='1';button.disabled=true;}try{return await fn();}finally{if(button){button.dataset.busy='0';}}};
  let session=null;
  const getState=()=>api.read('mol-app-v2-worker-status');
  const versionOf=(state)=>{const v=Number(state?.snapshot_version);if(!Number.isInteger(v)||v<0)throw new Error('Backend nie zwrócił poprawnej snapshot_version.');return v;};
  const common=async()=>{const state=await getState();return {state,body:{request_id:api.requestId(),work_date:state.work_date||today(),employee_id:session.user.employee_id,expected_version:versionOf(state)}};};
  const reload=()=>location.reload();

  function applyState(state){
    const attendance=state?.attendance?.state||'NOT_STARTED'; const active=state?.active_process||null;
    const start=document.querySelector('[data-action="start"]');const stop=document.querySelector('[data-action="stop"]');const endProcess=document.querySelector('[data-action="process-stop"]');const logoutProcess=document.querySelector('[data-process-logout]');const reopen=document.querySelector('[data-action="reopen-day"]');
    if(start)start.disabled=attendance!=='NOT_STARTED'; if(stop)stop.disabled=attendance!=='OPEN';
    document.querySelectorAll('.process-option').forEach(b=>{b.disabled=attendance!=='OPEN';});
    if(endProcess)endProcess.disabled=attendance!=='OPEN'||!active;if(logoutProcess)logoutProcess.disabled=attendance!=='OPEN'||!active;
    if(reopen){reopen.hidden=attendance!=='CLOSED';reopen.disabled=attendance!=='CLOSED';}
    const form=document.querySelector('[data-worker-correction]'); if(form)form.querySelectorAll('input,textarea,button').forEach(n=>{n.disabled=!state?.attendance;});
  }

  function bindAttendanceAndProcess(){
    const start=document.querySelector('[data-action="start"]');const stop=document.querySelector('[data-action="stop"]');const reopen=document.querySelector('[data-action="reopen-day"]');const endProcess=document.querySelector('[data-action="process-stop"]');const processPanel=document.querySelector('[data-panel="process"]');
    start?.addEventListener('click',e=>{e.preventDefault();lock(start,async()=>{setStatus('Zapisuję START pracy…');const {body}=await common();await api.write('mol-app-v2-attendance-start',body);setStatus('START potwierdzony przez backend V2.','ok');reload();}).catch(err=>{setStatus(err.message,'error');getState().then(applyState).catch(()=>{});});},true);
    stop?.addEventListener('click',e=>{e.preventDefault();lock(stop,async()=>{setStatus('Zapisuję STOP pracy…');const {body}=await common();await api.write('mol-app-v2-attendance-finish',body);setStatus('STOP potwierdzony przez backend V2.','ok');reload();}).catch(err=>{setStatus(err.message,'error');getState().then(applyState).catch(()=>{});});},true);
    reopen?.addEventListener('click',e=>{e.preventDefault();lock(reopen,async()=>{const {body}=await common();await api.write('mol-app-v2-attendance-reopen',body);setStatus('Dzień przywrócony do OPEN.','ok');reload();}).catch(err=>setStatus(err.message,'error'));},true);
    const processWrite=async(button,code)=>lock(button,async()=>{const {state,body}=await common();if(state.attendance?.state!=='OPEN')throw new Error('Najpierw rozpocznij dzień pracy.');const endpoint=state.active_process?'mol-app-v2-process-change':'mol-app-v2-process-start';await api.write(endpoint,{...body,process_code:code});setStatus(`Proces ${code} potwierdzony przez backend V2.`,'ok');reload();});
    processPanel?.querySelectorAll('.process-option').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();processWrite(button,button.dataset.processCode).catch(err=>{setStatus(err.message,'error');getState().then(applyState).catch(()=>{});});},true));
    const logoutProcess=processPanel?.querySelector('[data-process-logout]');
    const end=button=>{if(!button)return;button.addEventListener('click',e=>{e.preventDefault();lock(button,async()=>{const {body}=await common();await api.write('mol-app-v2-process-logout',body);setStatus('Proces zakończony w backendzie V2.','ok');reload();}).catch(err=>setStatus(err.message,'error'));},true);};
    end(logoutProcess); end(endProcess);
  }

  function bindCorrection(){
    const form=document.querySelector('[data-worker-correction]');if(!form)return;
    form.addEventListener('submit',e=>{e.preventDefault();const button=form.querySelector('button[type="submit"]');lock(button,async()=>{const {state,body}=await common();const start=localIso(form.elements.start_at?.value);const stop=localIso(form.elements.stop_at?.value);const reason=String(form.elements.reason?.value||'').trim();if(!start&&!stop)throw new Error('Podaj poprawiony START lub STOP.');if(reason.length<3)throw new Error('Powód korekty musi mieć co najmniej 3 znaki.');await api.write('mol-app-v2-attendance-correct',{...body,...(start?{start_at:start}:{}),...(stop?{stop_at:stop}:{}),reason});setStatus('Korekta czasu potwierdzona przez backend V2.','ok');reload();}).catch(err=>{setStatus(err.message,'error');button.disabled=false;});},true);
  }

  async function bindWorkerMessages(){
    const panel=document.querySelector('[data-panel="messages"]');if(!panel)return;
    let data=await api.read('mol-app-v2-messages',{limit:25});let items=Array.isArray(data?.items)?data.items:[];let selected=null;
    panel.addEventListener('click',e=>{const card=e.target.closest('[data-live-message]');if(!card)return;selected=items.find(x=>x.message_id===card.dataset.liveMessage)||null;if(!selected)return;const rid=api.requestId();api.write('mol-app-v2-message-shown',{request_id:rid,message_id:selected.message_id}).then(()=>{card.classList.add('is-read');}).catch(err=>setStatus(err.message,'error'));const ack=panel.querySelector('[data-message-ack]');if(ack){ack.disabled=!selected.ack_required||Boolean(selected.ack_at);ack.textContent=selected.ack_at?'Odbiór potwierdzony':selected.ack_required?'Potwierdzam odbiór':'Potwierdzenie niewymagane';}},true);
    const ack=panel.querySelector('[data-message-ack]');ack?.addEventListener('click',e=>{e.preventDefault();if(!selected)return;lock(ack,async()=>{await api.write('mol-app-v2-message-ack',{request_id:api.requestId(),message_id:selected.message_id});ack.textContent='Odbiór potwierdzony';setStatus('ACK zapisany w backendzie V2.','ok');}).catch(err=>{setStatus(err.message,'error');ack.disabled=false;});},true);
  }

  const selectedMobile=(root)=>[...root.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value).filter(Boolean);
  async function bindManagerMessages(){
    const panel=document.querySelector('[data-panel="manager-messages"]');if(!panel)return;
    const allOpen=panel.querySelector('[data-mobile-message-all-open]');const content=panel.querySelector('[data-mobile-message-content]');const ack=panel.querySelector('[data-mobile-message-ack]');const send=panel.querySelector('[data-mobile-message-send]');const recipients=panel.querySelector('[data-mobile-message-recipients]');const count=panel.querySelector('[data-mobile-message-count]');const length=panel.querySelector('[data-mobile-message-length]');
    const sync=()=>{const ids=selectedMobile(recipients);recipients.querySelectorAll('input').forEach(x=>x.disabled=allOpen.checked);panel.querySelector('[data-mobile-message-select-all]').disabled=allOpen.checked;panel.querySelector('[data-mobile-message-clear]').disabled=allOpen.checked;if(count)count.textContent=allOpen.checked?'Wszyscy aktualnie OPEN':`Wybrano ${ids.length}`;if(length)length.textContent=String(content.value.length);send.disabled=!content.value.trim()||(!allOpen.checked&&!ids.length);};
    [allOpen,content,ack].forEach(n=>n&&(n.disabled=false));recipients.querySelectorAll('input').forEach(n=>n.disabled=false);panel.querySelector('[data-mobile-message-select-all]').disabled=false;panel.querySelector('[data-mobile-message-clear]').disabled=false;
    allOpen?.addEventListener('change',sync);content?.addEventListener('input',sync);recipients.addEventListener('change',sync);panel.querySelector('[data-mobile-message-select-all]')?.addEventListener('click',()=>{recipients.querySelectorAll('input').forEach(x=>x.checked=true);sync();});panel.querySelector('[data-mobile-message-clear]')?.addEventListener('click',()=>{recipients.querySelectorAll('input').forEach(x=>x.checked=false);sync();});
    send?.addEventListener('click',e=>{e.preventDefault();lock(send,async()=>{const ids=selectedMobile(recipients);const body={request_id:api.requestId(),content:content.value.trim(),ack_required:Boolean(ack.checked),...(allOpen.checked?{all_open:true}:{recipient_ids:ids})};await api.write('mol-app-v2-message-send',body);content.value='';setStatus('Komunikat wysłany przez backend V2.','ok');sync();}).catch(err=>{setStatus(err.message,'error');sync();});},true);sync();
  }

  async function bindCorrections(){
    const panel=document.querySelector('[data-panel="manager-corrections"]');if(!panel)return;
    const data=await api.read('mol-app-v2-corrections-queue');const items=Array.isArray(data?.items)?data.items:[];const rows=[...panel.querySelectorAll('.correction-item')];
    rows.forEach((row,i)=>{const item=items[i];if(!item)return;const accept=row.querySelector('.accept');const reject=row.querySelector('.reject');if(accept){accept.disabled=false;accept.textContent='Akceptuj';accept.addEventListener('click',e=>{e.preventDefault();lock(accept,async()=>{const rid=item.request_id||item.correction_id||api.requestId();await api.write('mol-app-v2-attendance-correct',{request_id:rid,employee_id:item.employee_id,work_date:item.work_date,expected_version:Number(item.expected_version),...(item.start_at?{start_at:item.start_at}:{}),...(item.stop_at?{stop_at:item.stop_at}:{}),reason:item.reason});setStatus('Korekta zaakceptowana.','ok');reload();}).catch(err=>{setStatus(err.message,'error');accept.disabled=false;});},true);}if(reject){reject.disabled=false;reject.textContent='Odrzuć';reject.addEventListener('click',e=>{e.preventDefault();lock(reject,async()=>{await api.write('mol-app-v2-correction-reject',{request_id:api.requestId(),correction_id:item.correction_id});setStatus('Korekta odrzucona.','ok');reload();}).catch(err=>{setStatus(err.message,'error');reject.disabled=false;});},true);}});
  }

  async function bindUsers(){
    const panel=document.querySelector('[data-panel="manager-users"]');if(!panel)return;
    const data=await api.read('mol-app-v2-user-list');const items=Array.isArray(data?.items)?data.items:[];const articles=[...panel.querySelectorAll('.manager-user-list article')];
    articles.forEach((article,i)=>{const user=items[i];if(!user)return;let slot=article.querySelector('button')?.parentElement||article;article.querySelectorAll('button').forEach(b=>b.remove());const toggle=document.createElement('button');toggle.className='mol-button';toggle.type='button';toggle.textContent=user.active?'Dezaktywuj':'Aktywuj';toggle.addEventListener('click',e=>{e.preventDefault();lock(toggle,async()=>{await api.write('mol-app-v2-user-active',{request_id:api.requestId(),employee_id:user.employee_id,active:!user.active});setStatus('Stan konta zmieniony w backendzie V2.','ok');reload();}).catch(err=>{setStatus(err.message,'error');toggle.disabled=false;});});const reset=document.createElement('button');reset.className='mol-button';reset.type='button';reset.textContent='Reset hasła';reset.addEventListener('click',e=>{e.preventDefault();const pwd=prompt(`Nowe hasło dla ${user.display_name}:`);if(!pwd)return;lock(reset,async()=>{await api.write('mol-app-v2-user-password-reset',{request_id:api.requestId(),employee_id:user.employee_id,new_password:pwd});setStatus('Hasło zostało zresetowane.','ok');reset.disabled=false;}).catch(err=>{setStatus(err.message,'error');reset.disabled=false;});});article.append(toggle,reset);});
    const form=panel.querySelector('[data-manager-user-create]');if(form){form.querySelectorAll('input,select,button').forEach(n=>n.disabled=false);form.addEventListener('submit',e=>{e.preventDefault();const b=form.querySelector('button[type="submit"]');lock(b,async()=>{const fd=new FormData(form);const body={request_id:api.requestId(),login:String(fd.get('login')||'').trim(),display_name:String(fd.get('display_name')||'').trim(),initial_password:String(fd.get('initial_password')||''),role:String(fd.get('role')||''),moniti_worker_id:String(fd.get('moniti_worker_id')||'').trim(),es_worker_id:String(fd.get('es_worker_id')||'').trim()};await api.write('mol-app-v2-user-create',body);setStatus('Użytkownik utworzony w backendzie V2.','ok');reload();}).catch(err=>{setStatus(err.message,'error');b.disabled=false;});},true);}
  }

  async function init(){
    try{await waitE2E();session=await api.requireSession({surface:'mobile'});if(!session)return api.redirectLogin('session');const state=await getState();applyState(state);bindAttendanceAndProcess();bindCorrection();await bindWorkerMessages();if(['LEADER','ADMIN'].includes(session.user.role)){await Promise.allSettled([bindManagerMessages(),bindCorrections(),bindUsers()]);}setStatus('Integracja LIVE gotowa. Odczyty i przyciski są podłączone do backendu V2.','ok');}
    catch(error){setStatus(`Integracja zapisów pozostaje zablokowana: ${error.message}`,'error');}
  }
  init();
})();
