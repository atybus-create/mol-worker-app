(() => {
  'use strict';
  const api=window.MOLApi;if(!api)return;
  const E2E_KEY='mol.v2.stage11.read-e2e';
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const setStatus=(text,state='info')=>{let bar=document.querySelector('[data-live-integration-status]');if(!bar){bar=document.createElement('div');bar.dataset.liveIntegrationStatus='true';bar.style.cssText='position:fixed;z-index:9999;left:270px;right:20px;bottom:16px;padding:10px 14px;border:1px solid rgba(18,200,255,.28);border-radius:10px;background:rgba(3,20,31,.97);font:600 12px/1.35 system-ui';document.body.append(bar);}bar.textContent=text;bar.style.color=state==='error'?'#ff9aa4':state==='ok'?'#86f4c9':'#bfefff';bar.style.borderColor=state==='error'?'rgba(255,82,97,.65)':state==='ok'?'rgba(25,231,160,.55)':'rgba(18,200,255,.28)';};
  const waitE2E=async()=>{for(let i=0;i<120;i++){let r=null;try{r=JSON.parse(sessionStorage.getItem(E2E_KEY)||'null');}catch{}if(r?.passed===true)return r;if(r?.passed===false)throw new Error(r.failures?.[0]||'Authenticated E2E odczytów nie przeszedł.');await sleep(250);}throw new Error('Timeout authenticated E2E odczytów.');};
  const busy=async(button,fn)=>{if(button?.dataset.busy==='1')return;if(button){button.dataset.busy='1';button.disabled=true;}try{return await fn();}finally{if(button)button.dataset.busy='0';}};
  const checked=(root)=>root?[...root.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value).filter(Boolean):[];
  let session=null;

  async function bindMessages(){
    const view=document.querySelector('[data-view="leader-messages"]');if(!view)return;
    const allOpen=view.querySelector('[data-message-all-open]');const grid=view.querySelector('[data-message-recipients]');const content=view.querySelector('[data-message-content]');const ack=view.querySelector('[data-message-ack]');const send=view.querySelector('[data-message-send]');const count=view.querySelector('[data-message-count]');const length=view.querySelector('[data-message-length]');const status=view.querySelector('[data-message-status]');const selectAll=view.querySelector('[data-message-select-all]');const clear=view.querySelector('[data-message-clear]');if(!grid||!content||!send)return;
    [allOpen,content,ack,selectAll,clear].forEach(n=>{if(n)n.disabled=false;});grid.querySelectorAll('input').forEach(n=>n.disabled=false);
    const sync=()=>{const ids=checked(grid);grid.querySelectorAll('input').forEach(x=>x.disabled=Boolean(allOpen?.checked));if(selectAll)selectAll.disabled=Boolean(allOpen?.checked);if(clear)clear.disabled=Boolean(allOpen?.checked);if(count)count.textContent=allOpen?.checked?'Wszyscy aktualnie OPEN':`Wybrano ${ids.length}`;if(length)length.textContent=String(content.value.length);send.disabled=!content.value.trim()||(!allOpen?.checked&&!ids.length);};
    allOpen?.addEventListener('change',sync);content.addEventListener('input',sync);grid.addEventListener('change',sync);selectAll?.addEventListener('click',()=>{grid.querySelectorAll('input').forEach(x=>x.checked=true);sync();});clear?.addEventListener('click',()=>{grid.querySelectorAll('input').forEach(x=>x.checked=false);sync();});
    send.addEventListener('click',e=>{e.preventDefault();busy(send,async()=>{const ids=checked(grid);await api.write('mol-app-v2-leader-message',{request_id:api.requestId(),content:content.value.trim(),ack_required:Boolean(ack?.checked),...(allOpen?.checked?{all_open:true}:{recipient_ids:ids})});content.value='';if(status)status.textContent='Komunikat wysłany przez backend V2.';setStatus('Komunikat wysłany przez backend V2.','ok');sync();}).catch(err=>{setStatus(err.message,'error');if(status)status.textContent=err.message;sync();});},true);sync();
  }

  async function approveQueuedCorrection(item){
    if(!item?.correction_id)throw new Error('Brak correction_id korekty.');
    const preview=await api.write('mol-app-v2-correction-preview',{correction_id:item.correction_id});
    const approvedHash=String(preview?.approved_hash||'');
    if(!/^[0-9a-f]{64}$/i.test(approvedHash))throw new Error('Backend nie zwrócił approved_hash korekty.');
    return api.write('mol-app-v2-correction-approve',{correction_id:item.correction_id,request_id:item.correction_id,approved_hash:approvedHash});
  }

  async function bindCorrections(){
    const view=document.querySelector('[data-view="corrections"]');if(!view)return;
    const data=await api.read('mol-app-v2-corrections-queue');const items=Array.isArray(data?.items)?data.items:[];const rows=[...view.querySelectorAll('tbody tr')].filter(r=>r.querySelector('.accept,.reject'));
    rows.forEach((row,i)=>{const item=items[i];if(!item)return;const accept=row.querySelector('.accept');const reject=row.querySelector('.reject');
      if(accept){accept.disabled=false;accept.textContent='Akceptuj';accept.addEventListener('click',e=>{e.preventDefault();busy(accept,async()=>{await approveQueuedCorrection(item);setStatus('Korekta zatwierdzona przez bezpieczną ścieżkę preview → approve.','ok');location.reload();}).catch(err=>{setStatus(err.message,'error');accept.disabled=false;});},true);}
      if(reject){reject.disabled=false;reject.textContent='Odrzuć';reject.addEventListener('click',e=>{e.preventDefault();busy(reject,async()=>{await api.write('mol-app-v2-correction-reject',{request_id:api.requestId(),correction_id:item.correction_id});setStatus('Korekta odrzucona w backendzie V2.','ok');location.reload();}).catch(err=>{setStatus(err.message,'error');reject.disabled=false;});},true);}
    });
  }

  async function bindUsers(){
    const view=document.querySelector('[data-view="users"]');if(!view)return;
    const data=await api.read('mol-app-v2-user-list');const users=Array.isArray(data?.items)?data.items:[];const rows=[...view.querySelectorAll('.user-row')];
    rows.forEach((row,i)=>{const user=users[i];if(!user)return;const slot=row.querySelector('.user-row-actions')||row;slot.replaceChildren();const toggle=document.createElement('button');toggle.className='mol-button';toggle.type='button';toggle.textContent=user.active?'Dezaktywuj':'Aktywuj';toggle.addEventListener('click',e=>{e.preventDefault();busy(toggle,async()=>{await api.write('mol-app-v2-user-active',{request_id:api.requestId(),employee_id:user.employee_id,active:!user.active});setStatus('Stan konta zmieniony.','ok');location.reload();}).catch(err=>{setStatus(err.message,'error');toggle.disabled=false;});});const reset=document.createElement('button');reset.className='mol-button';reset.type='button';reset.textContent='Reset hasła';reset.addEventListener('click',e=>{e.preventDefault();const pwd=prompt(`Nowe hasło dla ${user.display_name}:`);if(!pwd)return;busy(reset,async()=>{await api.write('mol-app-v2-user-password-reset',{request_id:api.requestId(),employee_id:user.employee_id,new_password:pwd});setStatus('Hasło zresetowane.','ok');reset.disabled=false;}).catch(err=>{setStatus(err.message,'error');reset.disabled=false;});});slot.append(toggle,reset);});
    const form=view.querySelector('[data-live-user-form]');if(form){const roles=session.user.role==='ADMIN'?['WORKER','LEADER','ADMIN']:['WORKER'];const select=form.elements.role;if(select)select.replaceChildren(...roles.map(r=>{const o=document.createElement('option');o.value=r;o.textContent=r;return o;}));form.querySelectorAll('input,select,button').forEach(n=>n.disabled=false);form.addEventListener('submit',e=>{e.preventDefault();const button=form.querySelector('button[type="submit"]');busy(button,async()=>{const fd=new FormData(form);const body={request_id:api.requestId(),login:String(fd.get('login')||'').trim(),display_name:String(fd.get('display_name')||'').trim(),initial_password:String(fd.get('initial_password')||''),role:String(fd.get('role')||''),moniti_worker_id:String(fd.get('moniti_worker_id')||'').trim(),es_worker_id:String(fd.get('es_worker_id')||'').trim()};await api.write('mol-app-v2-user-create',body);setStatus('Użytkownik utworzony.','ok');location.reload();}).catch(err=>{setStatus(err.message,'error');button.disabled=false;});},true);}
  }

  async function init(){
    try{await waitE2E();session=await api.requireSession({surface:'web'});if(!session)return api.redirectLogin('session');await Promise.all([bindMessages(),bindCorrections(),bindUsers()]);setStatus('Integracja LIVE gotowa. Dane i akcje menedżerskie są podłączone do backendu V2.','ok');}
    catch(error){setStatus(`Integracja zapisów pozostaje zablokowana: ${error.message}`,'error');}
  }
  init();
})();
