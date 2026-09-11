(() => {
  'use strict';
  const api = window.MOLApi;
  if (!api) return;
  const BUILD = '20260911.7';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Warsaw', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const pct = (v) => v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(1)}%`;
  const qty = (v, d=0) => n(v).toLocaleString('pl-PL',{maximumFractionDigits:d});
  const time = (mins) => { const m=Math.max(0,Math.round(n(mins))); return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`; };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let team = null;
  let selected = new Set();

  function setText(sel, value){ const el=document.querySelector(sel); if(el) el.textContent=value; }
  function selectedItems(){ return (team?.items||[]).filter(x=>selected.has(x.employee.employee_id)); }
  function weighted(items, key){
    const out={total:0,eligible:0,outside:0,minutes:0};
    for(const x of items){const b=x.daily?.[key]||{};out.total+=n(b.total);out.eligible+=n(b.eligible);out.outside+=n(b.outside);out.minutes+=n(b.minutes);} return out;
  }
  function combined(items){const out={total:0,eligible:0,outside:0,minutes:0};for(const x of items){const b=x.daily?.combined||{};out.total+=n(b.total_units);out.eligible+=n(b.eligible_units);out.outside+=n(b.outside_units);out.minutes+=n(b.minutes);}return out;}
  function norm(value, mins, hourly){ return mins>0 ? value/(mins/60*hourly)*100 : null; }

  function renderPeople(){
    const host=document.querySelector('.report-people-grid'); if(!host||!team)return;
    host.innerHTML=(team.items||[]).map(x=>`<label class="report-person"><input type="checkbox" data-v3-report-person value="${esc(x.employee.employee_id)}" ${selected.has(x.employee.employee_id)?'checked':''}><span><strong>${esc(x.employee.display_name)}</strong><small>${esc(x.employee.employee_id)}</small></span></label>`).join('');
    host.querySelectorAll('[data-v3-report-person]').forEach(cb=>cb.addEventListener('change',()=>{cb.checked?selected.add(cb.value):selected.delete(cb.value);renderReport();}));
    setText('[data-report-count]',`Wybrano ${selected.size}`);
  }

  function renderReport(){
    if(!team)return; const items=selectedItems(); const cfg=team.norm_config||{pak_per_hour:70,pick_per_hour:210};
    const pick=weighted(items,'pick'), pak=weighted(items,'pak'), all=combined(items);
    setText('[data-report-pick-total]',qty(pick.total)); setText('[data-report-pick-eligible]',qty(pick.eligible)); setText('[data-report-pick-outside]',qty(pick.outside)); setText('[data-report-pick-time]',time(pick.minutes)); setText('[data-report-pick-norm]',pct(norm(pick.eligible,pick.minutes,n(cfg.pick_per_hour)||210)));
    setText('[data-report-pack-total]',qty(pak.total)); setText('[data-report-pack-eligible]',qty(pak.eligible)); setText('[data-report-pack-outside]',qty(pak.outside)); setText('[data-report-pack-time]',time(pak.minutes)); setText('[data-report-pack-norm]',pct(norm(pak.eligible,pak.minutes,n(cfg.pak_per_hour)||70)));
    setText('[data-report-total]',`${qty(all.total,1)} j.n.`); setText('[data-report-total-eligible]',`${qty(all.eligible,1)} j.n.`); setText('[data-report-total-outside]',`${qty(all.outside,1)} j.n.`); setText('[data-report-total-time]',time(all.minutes)); setText('[data-report-total-norm]',pct(norm(all.eligible,all.minutes,n(cfg.pak_per_hour)||70)));
    const body=document.querySelector('[data-report-body]'); if(body){body.innerHTML=items.length?items.map(x=>{const d=x.daily||{},p=d.pick||{},k=d.pak||{},c=d.combined||{};return `<tr><td><b>${esc(x.employee.display_name)}</b><small>${esc(x.employee.employee_id)}</small></td><td>${qty(p.total)}</td><td>${qty(p.eligible)}</td><td>${qty(p.outside)}</td><td>${time(p.minutes)}</td><td>${pct(p.norm_pct)}</td><td>${qty(k.total)}</td><td>${qty(k.eligible)}</td><td>${qty(k.outside)}</td><td>${time(k.minutes)}</td><td>${pct(k.norm_pct)}</td><td>${qty(c.total_units,1)}</td><td>${qty(c.eligible_units,1)}</td><td>${qty(c.outside_units,1)}</td><td>${time(c.minutes)}</td><td>${pct(c.norm_pct)}</td><td>${d.last_snapshot_at?new Date(d.last_snapshot_at).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}):'—'}</td></tr>`;}).join(''):'<tr><td colspan="17" class="report-empty">Wybierz co najmniej jednego pracownika.</td></tr>';}
    setText('[data-report-generated]',`V3 · ${team.date} · build ${BUILD}`);
  }

  async function load(date=today()){
    const btn=document.querySelector('[data-report-generate]'); if(btn){btn.disabled=true;btn.textContent='Ładowanie…';}
    try{
      team=await api.read('mol-app-v3-performance-team',{date});
      if(!selected.size) (team.items||[]).forEach(x=>selected.add(x.employee.employee_id));
      renderPeople(); renderReport();
    }catch(e){console.error('Etap 4 WWW',e);const body=document.querySelector('[data-report-body]');if(body)body.innerHTML=`<tr><td colspan="17" class="report-empty">${esc(e.message||'Błąd danych V3')}</td></tr>`;}
    finally{if(btn){btn.disabled=false;btn.textContent='Generuj raport';}}
  }

  function init(){
    const from=document.querySelector('[data-report-from]'),to=document.querySelector('[data-report-to]'),btn=document.querySelector('[data-report-generate]');
    if(from) from.value=today(); if(to) to.value=today();
    if(btn){btn.disabled=false;btn.addEventListener('click',()=>{const d=to?.value||from?.value||today();if(from&&to&&from.value!==to.value){alert('Etap 4 V3: raport WWW działa obecnie dla jednego dnia. Zakres wielodniowy nie jest częścią tego etapu.');return;}load(d);});}
    document.querySelector('[data-report-all]')?.addEventListener('click',()=>{(team?.items||[]).forEach(x=>selected.add(x.employee.employee_id));renderPeople();renderReport();});
    document.querySelector('[data-report-clear]')?.addEventListener('click',()=>{selected.clear();renderPeople();renderReport();});
    document.querySelectorAll('[data-report-export]').forEach(b=>{b.disabled=true;b.title='Eksport nie jest częścią Etapu 4 V3.';});
    load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,50),{once:true});else setTimeout(init,50);
})();
