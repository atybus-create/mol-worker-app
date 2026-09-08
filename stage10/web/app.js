(() => {
  'use strict';
  const BUILD='20260908.4';
  const shell=document.querySelector('.web-shell'); if(!shell)return;
  const hintedRole=window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role')||'LEADER');
  const capabilities=window.MOLRoles.get(hintedRole);
  if(!capabilities?.web){document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;background:#050b12;color:#f4f8fb;font-family:system-ui"><section><h1>Panel WWW niedostępny dla WORKER</h1><p>Użyj aplikacji mobilnej.</p></section></main>';return;}
  const sidebar=document.querySelector('.sidebar nav');
  const reportsButton=sidebar?.querySelector('[data-section="reports"]');
  const addNav=(name,label,icon,after)=>{let b=sidebar?.querySelector(`[data-section="${name}"]`);if(!b&&sidebar){b=document.createElement('button');b.dataset.section=name;b.innerHTML=`${icon} <span>${label}</span>`;after?.after(b);}return b;};
  const worktimeButton=addNav('worktime','Czas pracy','◷',reportsButton); const messageButton=addNav('leader-messages','Komunikaty','✉',worktimeButton);
  const content=document.querySelector('.content');
  const ensureView=(name,afterName)=>{let v=document.querySelector(`[data-view="${name}"]`);if(!v){v=document.createElement('section');v.className='view';v.dataset.view=name;v.hidden=true;document.querySelector(`[data-view="${afterName}"]`)?.after(v)||content?.append(v);}return v;};
  ensureView('worktime','reports'); ensureView('leader-messages','worktime');
  const show=(section)=>{document.querySelectorAll('.sidebar [data-section]').forEach(b=>b.classList.toggle('is-active',b.dataset.section===section));document.querySelectorAll('[data-view]').forEach(v=>{v.hidden=v.dataset.view!==section;v.classList.toggle('is-active',v.dataset.view===section);});};
  document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.section)));
  window.MOLWebShow=show;
  const versioned=(src)=>`${src}${src.includes('?')?'&':'?'}v=${BUILD}`;
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=versioned(src);s.onload=resolve;s.onerror=()=>reject(new Error(`Nie udało się załadować ${src}`));document.head.append(s);});
  const bootstrap=async()=>{const css=document.createElement('link');css.rel='stylesheet';css.href=versioned('./details.css');document.head.append(css);await load('../shared/states.js');await load('./details.js');await load('./worktime.js');await load('./leader-messages.js');await load('../shared/api.js');await load('./live.js');await load('./live-actions.js');};
  bootstrap().catch(error=>{console.error(error);const box=document.createElement('div');box.style.cssText='position:fixed;inset:24px;display:grid;place-items:center;z-index:9999;color:#fff;background:#050b12;font-family:system-ui';box.innerHTML=`<div><h2>Nie udało się uruchomić panelu WWW</h2><p>${error.message}</p></div>`;document.body.append(box);});
  show('team');
})();
