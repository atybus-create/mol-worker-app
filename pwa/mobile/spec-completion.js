(() => {
  'use strict';
  const shell=document.querySelector('.worker-shell'); if(!shell) return;
  const css=document.createElement('link'); css.rel='stylesheet'; css.href='./spec-completion.css'; document.head.append(css);
  const start=document.querySelector('[data-action="start"]'); const stop=document.querySelector('[data-action="stop"]');
  if(start?.querySelector('strong')) start.querySelector('strong').textContent='MONITI Rozpocznij pracę';
  if(stop?.querySelector('strong')) stop.querySelector('strong').textContent='MONITI Zakończ pracę';
  const grid=document.querySelector('.action-grid');
  if(grid&&!grid.querySelector('[data-action="correct-hours"]')){
    const correct=document.createElement('button'); correct.className='mol-button'; correct.type='button'; correct.dataset.action='correct-hours'; correct.innerHTML='◷ <span><strong>Zmień godziny pracy</strong><small>START / STOP i powód</small></span>';
    correct.addEventListener('click',()=>{ window.MOLMobileShow?.('profile'); requestAnimationFrame(()=>document.querySelector('[data-worker-correction]')?.scrollIntoView({block:'start'})); }); grid.append(correct);
    const reopen=document.createElement('button'); reopen.className='mol-button'; reopen.type='button'; reopen.dataset.action='reopen-day'; reopen.hidden=true; reopen.disabled=true; reopen.innerHTML='↶ <span><strong>Wznów pracę</strong><small>Otwórz ponownie dzisiejszy dzień</small></span>'; grid.append(reopen);
  }
  const active=document.querySelector('.active-process');
  if(active&&!active.querySelector('.active-process-meta')){
    active.querySelector('div')?.insertAdjacentHTML('beforeend','<div class="active-process-meta"><span><small>Proces od</small><strong data-active-process-start>—</strong></span><span><small>Timer procesu</small><strong data-active-process-timer>—</strong></span><span><small>Wykonanie</small><strong data-active-process-output>—</strong></span></div>');
    const norm=document.createElement('button'); norm.className='mol-button mol-button--primary'; norm.type='button'; norm.textContent='PODGLĄD NORMY'; norm.addEventListener('click',()=>{ window.MOLMobileShow?.('home'); const d=document.querySelector('[data-norm-period="today"]'); if(d){d.open=true;d.scrollIntoView({block:'start'});} }); active.append(norm);
  }
})();
