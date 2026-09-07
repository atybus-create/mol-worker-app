(() => {
  'use strict';
  const BASE='https://n8n.estyl.team/webhook/';
  const SESSION_KEY='mol.v2.session';
  let token='';
  try{token=sessionStorage.getItem(SESSION_KEY)||'';}catch{}
  class MOLApiError extends Error{constructor(message,{status=0,code='',retryable=false,details=null}={}){super(message);this.name='MOLApiError';this.status=status;this.code=code;this.retryable=retryable;this.details=details;}}
  const requestId=()=>globalThis.crypto?.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
  const setToken=v=>{token=String(v||'');try{token?sessionStorage.setItem(SESSION_KEY,token):sessionStorage.removeItem(SESSION_KEY)}catch{}};
  const clearToken=()=>setToken(''); const getToken=()=>token;
  async function request(path,{method='GET',query=null,body=null,auth=true,binary=false,timeoutMs=45000}={}){
    const url=new URL(BASE+String(path||'').replace(/^\/+/,''));
    if(query)for(const[k,v]of Object.entries(query)){if(v===undefined||v===null||v==='')continue;url.searchParams.set(k,Array.isArray(v)?v.join(','):String(v));}
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs),headers={};
    if(auth){if(!token)throw new MOLApiError('Brak aktywnej sesji.',{status:401,code:'UNAUTHENTICATED'});headers.Authorization=`Bearer ${token}`;}
    if(body!==null)headers['Content-Type']='application/json';
    try{
      const response=await fetch(url,{method,cache:'no-store',credentials:'omit',headers,body:body!==null?JSON.stringify(body):undefined,signal:controller.signal});
      if(binary){if(!response.ok)throw new MOLApiError(`HTTP ${response.status}`,{status:response.status});return{blob:await response.blob(),disposition:response.headers.get('content-disposition')||'',contentType:response.headers.get('content-type')||''};}
      let envelope;try{envelope=await response.json();}catch{throw new MOLApiError('Backend nie zwrócił poprawnej odpowiedzi JSON.',{status:response.status});}
      if(!response.ok||envelope?.ok!==true)throw new MOLApiError(envelope?.error?.message||'Operacja nie została potwierdzona.',{status:response.status,code:envelope?.error?.code||'',retryable:envelope?.error?.retryable===true,details:envelope?.error?.details||null});
      return envelope.data;
    }catch(error){if(error?.name==='AbortError'||error instanceof TypeError)throw new MOLApiError('Brak potwierdzenia z serwera. Sprawdź połączenie i spróbuj ponownie.',{retryable:true});throw error;}finally{clearTimeout(timer);}
  }
  async function login(loginName,password){const body={request_id:requestId(),login:String(loginName||'').trim(),password:String(password||'')};try{const data=await request('mol-app-v2-auth-login',{method:'POST',body,auth:false,timeoutMs:30000});if(!/^[0-9a-f]{64}$/.test(String(data?.session_token||''))||!data?.user?.employee_id)throw new MOLApiError('Backend zwrócił nieprawidłową sesję.');setToken(data.session_token);return data;}finally{body.password='';}}
  const session=()=>request('mol-app-v2-auth-session',{timeoutMs:30000});
  async function logout({clearOnFailure=false}={}){if(!token){clearToken();return{alreadyInactive:true}};try{const data=await request('mol-app-v2-auth-logout',{method:'POST',body:{request_id:requestId()},timeoutMs:30000});clearToken();return data;}catch(error){if(error.status===401||clearOnFailure)clearToken();throw error;}}
  async function requireSession({surface='mobile'}={}){if(!token)return null;try{const data=await session(),role=String(data?.user?.role||'').toUpperCase();if(!data?.user?.employee_id||!['WORKER','LEADER','ADMIN'].includes(role))throw new MOLApiError('Nieprawidłowy zakres sesji.',{status:401,code:'UNAUTHENTICATED'});if(surface==='web'&&role==='WORKER')throw new MOLApiError('Panel WWW jest dostępny tylko dla LEADER/ADMIN.',{status:403,code:'FORBIDDEN'});return data;}catch(error){if(error.status===401||error.status===403)clearToken();throw error;}}
  const read=(path,query=null)=>request(path,{query}); const write=(path,body)=>request(path,{method:'POST',body});
  async function download(path,query,fallbackName){const r=await request(path,{query,binary:true}),m=/filename="?([^";]+)"?/i.exec(r.disposition),name=m?.[1]||fallbackName||'mol-v2-export.bin',u=URL.createObjectURL(r.blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200);return name;}
  function redirectLogin(reason=''){location.replace(`./login.html${reason?`?reason=${encodeURIComponent(reason)}`:''}`)}
  function canonicalizeRole(role){const expected=String(role||'').toUpperCase(),p=new URLSearchParams(location.search),current=String(p.get('role')||'').toUpperCase();if(current===expected)return false;p.set('role',expected);location.replace(`${location.pathname}?${p.toString()}${location.hash||''}`);return true;}
  function reveal(){document.documentElement.classList.remove('mol-live-pending');document.getElementById('molLivePendingStyle')?.remove();}
  window.MOLApi=Object.freeze({BASE,SESSION_KEY,MOLApiError,requestId,getToken,setToken,clearToken,request,read,write,login,logout,session,requireSession,download,redirectLogin,canonicalizeRole,reveal});
})();
