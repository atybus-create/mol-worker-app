(()=>{
  'use strict';

  const AVATARS=['😎','🤓','🦊','🐼','🐸','🦁','🐯','🐵','🦄','🤠','🥸','👾','🧙','🦸','🐙'];
  const $=id=>document.getElementById(id);

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
      if($('workerName')) $('workerName').textContent=name;
      if($('leaderName')) $('leaderName').textContent=name;
    }
    if(role){
      if($('workerRole')) $('workerRole').textContent=role;
      if($('leaderRole')) $('leaderRole').textContent=role;
    }
    if($('userAvatar')) $('userAvatar').textContent=avatar;
    if($('leaderAvatar')) $('leaderAvatar').textContent=avatar;
  }

  async function refreshProfile(){
    const session=getSession();
    if(!session?.token)return;

    applyUser(session.user);

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
      applyUser(data.user);
      localStorage.setItem('mol.session',JSON.stringify({...session,user:{...(session.user||{}),...data.user}}));
    }catch(_){/* UI fallback pozostaje aktywny */}
  }

  window.addEventListener('DOMContentLoaded',refreshProfile,{once:true});
  window.addEventListener('mol-session-updated',refreshProfile);
  setTimeout(refreshProfile,400);
  setTimeout(refreshProfile,1600);
})();
