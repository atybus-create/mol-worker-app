(()=>{
  'use strict';

  const AVATARS=['😎','🤓','🦊','🐼','🐸','🦁','🐯','🐵','🦄','🤠','🥸','👾','🧙','🦸','🐙'];
  const $=id=>document.getElementById(id);
  let verifiedUser=null;

  function getSession(){
    try{return JSON.parse(localStorage.getItem('mol.session')||'null')}catch{return null}
  }

  function avatarFor(employeeId,name){
    const seed=String(employeeId||name||'MOL');
    let hash=0;
    for(let i=0;i<seed.length;i++) hash=((hash<<5)-hash+seed.charCodeAt(i))|0;
    return AVATARS[Math.abs(hash)%AVATARS.length];
  }

  function applyUser(user){
    if(!user)return;
    const name=String(user.name||'').trim();
    const role=String(user.role||'').trim();
    const avatar=avatarFor(user.employee_id,name);
    if(name){
      if($('workerName')&&$('workerName').textContent!==name) $('workerName').textContent=name;
      if($('leaderName')&&$('leaderName').textContent!==name) $('leaderName').textContent=name;
    }
    if(role){
      if($('workerRole')&&$('workerRole').textContent!==role) $('workerRole').textContent=role;
      if($('leaderRole')&&$('leaderRole').textContent!==role) $('leaderRole').textContent=role;
    }
    if($('userAvatar')&&$('userAvatar').textContent!==avatar) $('userAvatar').textContent=avatar;
    if($('leaderAvatar')&&$('leaderAvatar').textContent!==avatar) $('leaderAvatar').textContent=avatar;
  }

  async function clearLegacyPwa(){
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>k.startsWith('mol-worker-app-')).map(k=>caches.delete(k)));
      }
    }catch(_){/* cleanup best effort */}
  }

  async function refreshProfile(){
    const session=getSession();
    if(!session?.token)return;
    if(session.user) applyUser(session.user);

    const C=window.MOL_APP_CONFIG;
    if(!C?.apiBase||!C?.endpoints?.config)return;
    try{
      const response=await fetch(`${C.apiBase}/${C.endpoints.config}`,{
        method:'GET',
        headers:{Accept:'application/json',Authorization:`Bearer ${session.token}`},
        cache:'no-store'
      });
      if(!response.ok)return;
      const data=await response.json();
      if(!data?.user)return;
      verifiedUser={...(session.user||{}),...data.user};
      applyUser(verifiedUser);
      localStorage.setItem('mol.session',JSON.stringify({...session,user:verifiedUser}));
    }catch(_){/* zachowaj ostatni poprawny profil */}
  }

  function guardIdentity(){
    if(verifiedUser) applyUser(verifiedUser);
  }

  function start(){
    clearLegacyPwa();
    refreshProfile();
    setTimeout(refreshProfile,350);
    setTimeout(refreshProfile,1200);
    setTimeout(refreshProfile,3000);
    setInterval(guardIdentity,1500);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshProfile()});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
