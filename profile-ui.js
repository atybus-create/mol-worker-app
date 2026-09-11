(()=>{
  'use strict';

  const AVATARS=['😎','🤓','🦊','🐼','🐸','🦁','🐯','🐵','🦄','🤠','🥸','👾','🧙','🦸','🐙'];
  const $=id=>document.getElementById(id);
  let lastAppliedKey='';

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
    if(!name)return;
    const avatar=avatarFor(user.employee_id,name);
    const key=`${user.employee_id||''}|${name}|${role}|${avatar}`;
    if(key===lastAppliedKey)return;
    lastAppliedKey=key;
    if($('workerName')) $('workerName').textContent=name;
    if($('leaderName')) $('leaderName').textContent=name;
    if($('workerRole')) $('workerRole').textContent=role;
    if($('leaderRole')) $('leaderRole').textContent=role;
    if($('userAvatar')) $('userAvatar').textContent=avatar;
    if($('leaderAvatar')) $('leaderAvatar').textContent=avatar;
  }

  function hydrateProfile(){
    const session=getSession();
    if(session?.user?.name) applyUser(session.user);
  }

  function watchLoginTransition(){
    const shell=$('appShell');
    if(!shell)return;
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!shell.hidden){
          hydrateProfile();
        }
      }
    });
    observer.observe(shell,{attributes:true,attributeFilter:['hidden']});
  }

  function start(){
    const session=getSession();
    if(session?.user?.name) applyUser(session.user);
    watchLoginTransition();
    if(session?.token) hydrateProfile();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&getSession()?.token)hydrateProfile()});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
