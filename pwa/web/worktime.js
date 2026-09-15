(() => {
  'use strict';
  const view=document.querySelector('[data-view="worktime"]'); if(!view)return;
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  view.innerHTML=`<div class="page-title"><div><p class="mol-kicker">Ewidencja obecności</p><h1>Raport czasu pracy</h1><small>Dane z backendu V3 / Moniti</small></div></div><div class="view-toolbar report-toolbar"><label>Od <input data-worktime-from type="date" value="${today()}"></label><label>Do <input data-worktime-to type="date" value="${today()}"></label><label>Status <select data-worktime-status><option value="ALL">Wszystkie</option><option value="INCOMPLETE">BRAK STOP</option><option value="OPEN">OPEN</option><option value="CLOSED">CLOSED</option><option value="NOT_STARTED">NOT_STARTED</option></select></label><button class="mol-button mol-button--primary" data-worktime-generate disabled>Generuj raport</button><button class="mol-button" data-worktime-export="CSV" disabled>CSV</button><button class="mol-button" data-worktime-export="XLSX" disabled>XLSX</button></div><section class="mol-card report-selector-card"><div class="report-selector-head"><div><p class="mol-kicker">Zakres osób</p><h2>Wybierz pracowników</h2><small data-worktime-count>Wybrano 0</small></div><div class="report-selector-actions"><button data-worktime-all>Zaznacz wszystkich</button><button data-worktime-clear>Wyczyść</button></div></div><div class="report-people-grid"><p class="mol-muted">Ładowanie pracowników z backendu V3…</p></div></section><div class="web-stat-grid"><article class="mol-card"><small>Wybrani</small><strong data-worktime-selected>0</strong></article><article class="mol-card"><small>Dni z pracą</small><strong data-worktime-days>0</strong></article><article class="mol-card"><small>Łączny czas</small><strong data-worktime-total>—</strong></article><article class="mol-card"><small>Do korekty</small><strong data-worktime-incomplete>0</strong></article></div><section class="mol-card detail-table-card"><div class="detail-table-head"><h2>Czas pracy</h2><small data-worktime-generated></small></div><table class="worktime-report-table"><thead><tr><th>Data</th><th>Pracownik</th><th>Stan</th><th>START</th><th>STOP</th><th>Czas pracy</th></tr></thead><tbody data-worktime-body><tr><td colspan="6" class="report-empty">Wybierz zakres i pracowników.</td></tr></tbody></table></section>`;

  const style=document.createElement('style');
  style.textContent=`
    [data-worktime-body] tr.worktime-incomplete{background:rgba(255,65,80,.13);box-shadow:inset 4px 0 0 #ff4150;cursor:pointer}
    [data-worktime-body] tr.worktime-incomplete:hover{background:rgba(255,65,80,.2)}
    .worktime-missing-stop{color:#ff7580;font-weight:800}
    .worktime-correct-btn{margin-left:8px;padding:5px 8px;border:1px solid rgba(255,117,128,.55);border-radius:8px;background:rgba(255,65,80,.12);color:#ff9da5;cursor:pointer}
    .worktime-modal-backdrop{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;background:rgba(0,0,0,.72);padding:20px}
    .worktime-modal{width:min(520px,100%);border:1px solid rgba(255,117,128,.35);border-radius:18px;background:#07131d;color:#eef8ff;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.5)}
    .worktime-modal h2{margin:0 0 8px}.worktime-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.worktime-modal-grid span{padding:10px;border-radius:10px;background:rgba(255,255,255,.04)}
    .worktime-modal label{display:grid;gap:7px;margin:14px 0}.worktime-modal input{padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#031019;color:#fff;font:inherit}.worktime-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
    .worktime-modal-error{color:#ff9da5;min-height:1.3em}
  `;
  document.head.append(style);

  const actions=document.querySelector('.employee-actions'); if(actions&&!actions.querySelector('[data-worktime-employee]')){const b=document.createElement('button');b.className='mol-button';b.type='button';b.dataset.worktimeEmployee='true';b.textContent='Czas pracy';b.addEventListener('click',()=>window.MOLWebShow?.('worktime'));actions.append(b);}

  const parsePlDate=(text)=>{const m=String(text||'').trim().match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:'';};
  const rowInfo=(tr)=>({workDate:parsePlDate(tr.cells?.[0]?.textContent),employeeId:tr.querySelector('td:nth-child(2) small')?.textContent.trim()||'',displayName:tr.querySelector('td:nth-child(2) b')?.textContent.trim()||'',start:tr.cells?.[3]?.textContent.trim()||'—'});

  function openCorrection(tr){
    const info=rowInfo(tr); if(!info.workDate||!info.employeeId)return;
    const backdrop=document.createElement('div');backdrop.className='worktime-modal-backdrop';
    backdrop.innerHTML=`<section class="worktime-modal" role="dialog" aria-modal="true" aria-labelledby="worktimeCorrTitle"><p class="mol-kicker">Ręczna korekta czasu pracy</p><h2 id="worktimeCorrTitle">BRAK STOP</h2><p>Potwierdź prawidłową godzinę zakończenia pracy. Korekta zostanie zapisana w audycie.</p><div class="worktime-modal-grid"><span><small>Pracownik</small><strong>${info.displayName}</strong><br><small>${info.employeeId}</small></span><span><small>Data</small><strong>${info.workDate}</strong><br><small>START ${info.start}</small></span></div><label>Poprawna godzina STOP<input type="time" data-correction-stop required step="60"></label><label>Powód<input type="text" data-correction-reason maxlength="200" value="Brak STOP w danych historycznych"></label><p class="worktime-modal-error" data-correction-error></p><div class="worktime-modal-actions"><button class="mol-button" type="button" data-correction-cancel>Anuluj</button><button class="mol-button mol-button--primary" type="button" data-correction-save>Zatwierdź godzinę STOP</button></div></section>`;
    document.body.append(backdrop);
    const close=()=>backdrop.remove();backdrop.querySelector('[data-correction-cancel]')?.addEventListener('click',close);
    backdrop.addEventListener('click',e=>{if(e.target===backdrop)close();});
    backdrop.querySelector('[data-correction-save]')?.addEventListener('click',async()=>{
      const api=window.MOLApi,stopTime=backdrop.querySelector('[data-correction-stop]')?.value||'',reason=backdrop.querySelector('[data-correction-reason]')?.value.trim()||'MISSING_STOP_CORRECTION',errorNode=backdrop.querySelector('[data-correction-error]'),save=backdrop.querySelector('[data-correction-save]');
      if(!/^\d{2}:\d{2}$/.test(stopTime)){errorNode.textContent='Wpisz poprawną godzinę STOP.';return;}
      if(!api?.write||!api?.requestId){errorNode.textContent='API V3 nie jest gotowe. Odśwież stronę.';return;}
      save.disabled=true;errorNode.textContent='Zapisywanie korekty…';
      try{await api.write('mol-app-v3-attendance-correction',{request_id:api.requestId(),employee_id:info.employeeId,work_date:info.workDate,stop_time:stopTime,reason});close();view.querySelector('[data-worktime-generate]')?.click();}
      catch(error){errorNode.textContent=error?.message||'Nie udało się zapisać korekty.';save.disabled=false;}
    });
    backdrop.querySelector('[data-correction-stop]')?.focus();
  }

  function decorateRows(){
    const body=view.querySelector('[data-worktime-body]');if(!body)return;
    let incomplete=0;
    body.querySelectorAll('tr').forEach(tr=>{
      if(tr.querySelector('.report-empty'))return;
      const status=tr.cells?.[2]?.textContent.trim().toUpperCase()||'',stop=tr.cells?.[4]?.textContent.trim()||'';
      const isIncomplete=status==='INCOMPLETE'&&(!stop||stop==='—');
      tr.classList.toggle('worktime-incomplete',isIncomplete);
      if(!isIncomplete)return;
      incomplete++;
      const statusCell=tr.cells[2],stopCell=tr.cells[4],durationCell=tr.cells[5];
      if(statusCell)statusCell.innerHTML='<span class="status warning worktime-missing-stop">BRAK STOP</span>';
      if(stopCell&&!stopCell.querySelector('[data-worktime-correct]'))stopCell.innerHTML='<span class="worktime-missing-stop">BRAK</span><button type="button" class="worktime-correct-btn" data-worktime-correct>Popraw</button>';
      if(durationCell)durationCell.innerHTML='<strong class="worktime-missing-stop">—</strong>';
      if(!tr.dataset.correctionBound){tr.dataset.correctionBound='1';tr.addEventListener('click',e=>{if(e.target.closest('[data-live-history-button]'))return;openCorrection(tr);});}
    });
    const counter=view.querySelector('[data-worktime-incomplete]');if(counter)counter.textContent=String(incomplete);
  }
  const body=view.querySelector('[data-worktime-body]');if(body)new MutationObserver(decorateRows).observe(body,{childList:true,subtree:true});
  decorateRows();
})();
