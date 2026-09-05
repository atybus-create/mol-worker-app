const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../v2/attendance.js'),'utf8');
const settle=()=>new Promise(r=>setImmediate(r));
function browser(storage=new Map()){
  const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,disabled:false,textContent:'',addEventListener(event,fn){this[event]=fn;}});return elements.get(id);};
  const window={},calls=[],modes={offline:false,delayed:null},state={attendance:null,snapshot_version:0};
  const context=vm.createContext({window,document:{getElementById:el},Intl,Date,JSON,TypeError,Error,AbortController,crypto:{randomUUID:()=> 'a7500000-1000-4000-8000-000000000001'},setTimeout:()=>1,clearTimeout(){},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async(url,options)=>{calls.push({url,body:options.body?JSON.parse(options.body):null});if(modes.delayed)await modes.delayed;if(modes.offline)throw new TypeError('offline');if(modes.reject&&options.body)return {ok:false,status:409,json:async()=>({ok:false,error:{code:'VERSION_CONFLICT',message:'Wersja dnia zmieniła się.'}})};return {ok:true,json:async()=>({ok:true,data:url.includes('status')?{employee:{employee_id:'MOL004'},work_date:el('workDate').value,open_day:null,writes_enabled:true,...state}:{attendance:{},snapshot_version:1}})};}});
  vm.runInContext(source,context);return {el,window,calls,modes,state,storage};
}
(async()=>{
  const b=browser(),profile={user:{employee_id:'MOL004',role:'WORKER'}},token='a'.repeat(64);
  b.window.molAttendance.activate(profile,token);await settle();assert.equal(b.el('workState').textContent,'Dzień nierozpoczęty');assert.equal(b.el('workStart').disabled,false);
  b.modes.offline=true;b.el('workStart').click();b.el('workStart').click();await settle();assert.equal(b.calls.filter(c=>c.body).length,1);assert.equal(b.el('attendanceRetry').hidden,false);assert.equal(b.el('workStart').disabled,true);
  const first=b.calls.find(c=>c.body).body.request_id;assert.ok(b.storage.size);
  b.el('correctionReason').value='private draft';b.el('sheetCorrectionId').value='old id';
  b.window.molAttendance.hide();assert.equal(b.el('attendancePanel').hidden,true);assert.equal(b.el('correctionReason').value,'');assert.equal(b.el('sheetCorrectionId').value,'');
  const reloaded=browser(b.storage);reloaded.window.molAttendance.activate(profile,token);await settle();assert.equal(reloaded.el('attendanceRetry').hidden,false);assert.equal(reloaded.el('workStart').disabled,true);
  reloaded.el('attendanceRetry').click();await settle();assert.equal(reloaded.calls.find(c=>c.body).body.request_id,first);assert.equal(reloaded.storage.size,0);
  reloaded.modes.reject=true;reloaded.el('workStart').click();await settle();assert.equal(reloaded.el('attendanceMessage').textContent,'Wersja dnia zmieniła się.');assert.equal(reloaded.storage.size,0);
  assert.equal(reloaded.el('sheetApprovalPanel').hidden,true);reloaded.window.molAttendance.activate({user:{...profile.user,role:'LEADER'}},token);await settle();assert.equal(reloaded.el('sheetApprovalPanel').hidden,false);
  const delayed=browser();let resolve;delayed.modes.delayed=new Promise(r=>resolve=r);delayed.window.molAttendance.activate(profile,token);delayed.window.molAttendance.hide();resolve();await settle();assert.equal(delayed.el('attendancePanel').hidden,true);assert.notEqual(delayed.el('workState').textContent,'Dzień nierozpoczęty');
  console.log('Attendance UI PASS: confirmed state, double-click, offline retry, request ID persistence, reload recovery, stale response after logout.');
})().catch(e=>{console.error(e);process.exitCode=1;});
