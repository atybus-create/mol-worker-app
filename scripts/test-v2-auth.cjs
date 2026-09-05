const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname,'..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const login = read('backend/v2/workflows/auth-login.json');
const session = read('backend/v2/workflows/auth-session.json');
const logout = read('backend/v2/workflows/auth-logout.json');
const run = (graph,name,input,refs={}) => new Function('$input','$','$execution',graph.nodes.find(n=>n.name===name).parameters.jsCode)(
  {first:()=>({json:input}),all:()=>[].concat(input).map(json=>({json}))}, name=>({first:()=>({json:refs[name]})}),{id:'unit-test'}
)[0].json;
const request_id='01740000-1000-4000-8000-000000000001';
for(const graph of [login,session,logout]) {
  assert.equal(graph.settings.saveDataErrorExecution,'none');
  assert.equal(graph.settings.saveDataSuccessExecution,'none');
  assert.equal(graph.settings.saveManualExecutions,false);
  assert.equal(graph.settings.errorWorkflow,'rnELTCKClbzY8lxZ');
  assert.equal(graph.nodes.find(n=>n.type.endsWith('.webhook')).parameters.options.allowedOrigins,'https://atybus-create.github.io');
}
assert.equal(run(login,'Validate Input',{body:{request_id,login:' Test ',password:'test'}}).login,'test');
for(const invalid of [null,123,[request_id],{},'invalid']) assert.equal(run(login,'Validate Input',{body:{request_id:invalid,login:'test',password:'test'}}).http_status,400);
assert.equal(run(session,'Validate Input',{headers:{}}).http_status,401);
assert.equal(run(session,'Validate Input',{headers:{authorization:'Bearer '+'a'.repeat(64)}}).valid,true);
const refs={'Validate Input':{request_id}};
assert.equal(run(login,'Check Limit',{attempts:5,limit_key:'test',window_start:new Date().toISOString()},refs).http_status,429);
assert.equal(run(login,'Check Limit',{attempts:5,limit_key:'test',window_start:'1970-01-01T00:00:00Z'},refs).attempts,1);
assert.equal(run(session,'Check Session',{session_id:request_id,expires_at:'1970-01-01T00:00:00Z'},refs).http_status,401);
assert.equal(run(session,'Check Session',{session_id:request_id,expires_at:'2099-01-01T00:00:00Z',revoked_at:new Date().toISOString()},refs).http_status,401);
const receiptRefs={'Verify Password':{user:{employee_id:'A'}}};
assert.equal(run(login,'Receipt State',{request_id,employee_id:'B',expires_at:'2099-01-01T00:00:00Z'},receiptRefs).http_status,409);
const revoked='2026-09-05T00:00:00.000Z';
assert.equal(run(logout,'Logout Success',{session:{revoked_at:revoked}},refs).body.meta.server_time,revoked);

const source=fs.readFileSync(path.join(root,'v2/app.js'),'utf8');
function browser(initialToken='') {
  const elements=new Map();const storage=new Map(initialToken?[['mol.v2.session',initialToken]]:[]);const timers=new Map();let seq=0;
  const el=id=>{if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,value:'',textContent:'',addEventListener(name,fn){this[name]=fn;}});return elements.get(id);};
  const calls=[];const modes={logoutFail:false,badLogin:false,unauthorized:false};
  const user={employee_id:'A',display_name:'Test <safe>',role:'ADMIN'};
  const data={user,expires_at:new Date(Date.now()+3600000).toISOString()};
  const context=vm.createContext({document:{getElementById:el,addEventListener(){}},window:{addEventListener(){}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},crypto:{randomUUID:()=>request_id},AbortController,Date,TypeError,console,setTimeout:(fn,ms)=>{timers.set(++seq,{fn,ms});return seq;},clearTimeout:id=>timers.delete(id),fetch:async(url,options)=>{
    const action=url.includes('health')?'health':url.split('-').at(-1);calls.push(action);
    if(action==='logout'&&modes.logoutFail)throw new TypeError('offline');
    const denied=(action==='login'&&modes.badLogin)||(action==='session'&&modes.unauthorized);
    return {ok:!denied,status:denied?401:200,json:async()=>action==='health'?{ok:true,service:'MOL_APP_V2',core_status:'READY',database:'ONLINE',version:'0.4.0'}:denied?{ok:false,error:{message:'Odmowa'}}:{ok:true,data:action==='login'?{...data,session_token:'a'.repeat(64)}:action==='logout'?{logged_out:true}:data}};
  }});
  vm.runInContext(source,context);return {el,storage,calls,modes,timers};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const b=browser();await settle();assert.equal(b.el('loginForm').hidden,false);
  b.el('login').value='test';b.el('password').value='test';
  await Promise.all([b.el('loginForm').submit({preventDefault(){}}),b.el('loginForm').submit({preventDefault(){}})]);
  assert.equal(b.calls.filter(c=>c==='login').length,1);assert.equal(b.el('sessionPanel').hidden,false);assert.equal(b.el('userName').textContent,'Test <safe>');assert.equal(b.el('password').value,'');
  const token=b.storage.get('mol.v2.session');assert.equal(token,'a'.repeat(64));
  const restored=browser(token);await settle();assert.equal(restored.el('sessionPanel').hidden,false);
  b.modes.logoutFail=true;await b.el('logoutButton').click();assert.equal(b.storage.get('mol.v2.session'),token);assert.match(b.el('authMessage').textContent,/nie zostało potwierdzone/);
  b.modes.logoutFail=false;await b.el('logoutButton').click();assert.equal(b.storage.has('mol.v2.session'),false);assert.equal(b.el('loginForm').hidden,false);
  b.modes.badLogin=true;b.el('password').value='bad';await b.el('loginForm').submit({preventDefault(){}});assert.equal(b.el('sessionPanel').hidden,true);assert.equal(b.el('password').value,'');
  restored.modes.unauthorized=true;await restored.el('sessionRetry').click();assert.equal(restored.storage.has('mol.v2.session'),false);
  const expires=browser(token);await settle();const expiry=[...expires.timers.values()].find(t=>t.ms>20000);assert.ok(expiry);expiry.fn();assert.equal(expires.storage.has('mol.v2.session'),false);assert.equal(expires.el('loginForm').hidden,false);
  console.log('V2 auth PASS: input, rate limits, expiry, role/session checks, logout, UI restore, double-submit, network failure and expired UI state.');
})().catch(e=>{console.error(e);process.exitCode=1;});
