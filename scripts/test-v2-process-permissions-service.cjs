'use strict';
// Executes the actual generated Decide node against in-memory fixtures only.
// No n8n, Moniti, Drive, network requests or persistent writes are performed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const workflow=JSON.parse(fs.readFileSync(path.join(root,'backend/v2/workflows/attendance-service.json'),'utf8'));
const code=workflow.nodes.find(n=>n.name==='Decide').parameters.jsCode;
const fixed='2026-09-05T08:30:20.000Z';
class Clock extends Date {constructor(...args){super(...(args.length?args:[fixed]));}static now(){return Date.parse(fixed);}}
const dateTime={now:()=>({setZone:()=>({toISODate:()=> '2026-09-05'})})};
const execute=new Function('$','$input','DateTime','Date',code);
const employee={employee_id:'MOL004',role:'WORKER',active:true,display_name:'Fixture',moniti_worker_id:'99186'};
const attendance={attendance_id:'MOL004:2026-09-05',employee_id:'MOL004',work_date:'2026-09-05',state:'OPEN',start_at:'2026-09-05T06:00:00.000Z',stop_at:null,version:1,moniti_sync:'NOT_REQUIRED'};
const active={process_session_id:'fixture:process',employee_id:'MOL004',attendance_id:attendance.attendance_id,process_code:'PAKOWANIE',start_at:'2026-09-05T08:00:00.000Z',stop_at:null,version:1};
const roleKey='ALLOWED_PROCESSES_ROLE_WORKER',personKey='ALLOWED_PROCESSES_EMPLOYEE_MOL004';
const cfg=(key,value)=>({key,value_json:JSON.stringify(value)});
function run(options={}) {
  const target={...employee,...options.employee};
  const actor={...target,...options.actor};
  const request_id='66000000-0000-4000-8000-000000000001';
  const config=[cfg('WRITES_ENABLED',true),cfg('MONITI_ENABLED',false),...(options.config||[cfg('ALLOWED_PROCESSES_ROLE_'+target.role,['PAKOWANIE','KOMPLETACJA','PRZERWA','BIURO'])])];
  const data={
    'Validate Input':[{operation:options.operation||'STATUS',request_id,payload:{work_date:'2026-09-05',expected_version:1,process_code:options.process_code||'PAKOWANIE'}}],
    'Authorize':[{actor,target:target.employee_id}],
    'Read Employee':[target], 'Read Commands':[], 'Read Request':options.prior?[options.prior]:[],
    'Hash Command':[{payload_hash:'fixture'}], 'Read Attendance':[attendance],
    'Read Processes':options.processes||[], 'Read Config':config,
    'Read Catalog':['PAKOWANIE','KOMPLETACJA','PRZERWA','BIURO'].map(process_code=>({process_code,display_name:process_code,active:true})),
    'Read Notices':[], 'Read Notice Commands':[], 'Read Pending ES':[]
  };
  const before=JSON.stringify(data);
  const lookup=name=>{assert.ok(Object.hasOwn(data,name),'Unexpected node '+name);return {first:()=>({json:data[name][0]||{}}),all:()=>data[name].map(json=>({json}))};};
  const result=execute(lookup,{first:()=>({json:{}}),all:()=>[]},dateTime,Clock)[0].json;
  assert.equal(JSON.stringify(data),before,'Decision mutated its fixture inputs');
  return result;
}
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const codes=r=>r.body.data.process_catalog.map(p=>p.process_code);
test('WORKER catalog excludes BIURO even when allowlist includes it',()=>assert.ok(!codes(run()).includes('BIURO')));
for(const role of ['LEADER','ADMIN'])test(role+' catalog includes BIURO',()=>assert.ok(codes(run({employee:{role}})).includes('BIURO')));
for(const operation of ['PROCESS_START','PROCESS_CHANGE'])test('WORKER '+operation+' BIURO rejected before write plan',()=>{const r=run({operation,process_code:'BIURO',processes:operation==='PROCESS_CHANGE'?[active]:[]});assert.equal(r.http_status,403);assert.equal(r.body.error.code,'PROCESS_FORBIDDEN');assert.notEqual(r.execute,true);});
test('Allowed start creates plan without Moniti',()=>{const r=run({operation:'PROCESS_START'});assert.equal(r.execute,true);assert.equal(r.moniti_enabled,false);assert.equal(r.plan.active_process.process_code,'PAKOWANIE');});
test('LEADER reading WORKER uses target permissions',()=>assert.ok(!codes(run({actor:{employee_id:'MOL014',role:'LEADER'}})).includes('BIURO')));
test('LEADER cannot change another worker process',()=>{const r=run({operation:'PROCESS_START',actor:{employee_id:'MOL014',role:'LEADER'}});assert.equal(r.http_status,403);assert.equal(r.body.error.code,'FORBIDDEN');});
test('Employee override replaces role list',()=>assert.deepEqual(codes(run({config:[cfg(roleKey,['PAKOWANIE','KOMPLETACJA']),cfg(personKey,['PRZERWA'])]})),['PRZERWA']));
test('Empty override does not fall back to role',()=>assert.deepEqual(codes(run({config:[cfg(roleKey,['PAKOWANIE']),cfg(personKey,[])]})),[]));
for(const [label,config] of [
  ['missing',[]],
  ['malformed',[cfg(roleKey,['PAKOWANIE']),{key:personKey,value_json:'invalid-json'}]],
  ['duplicate',[cfg(personKey,['PAKOWANIE']),cfg(personKey,['KOMPLETACJA'])]],
  ['null',[cfg(roleKey,['PAKOWANIE']),cfg(personKey,null)]]
]) {
  test(label+' permissions retain status and active process',()=>{const r=run({config,processes:[active]});assert.equal(r.http_status,200);assert.deepEqual(codes(r),[]);assert.equal(r.body.data.process_permission_error,'PROCESS_PERMISSION_CONFIG_INVALID');assert.equal(r.body.data.active_process.process_code,'PAKOWANIE');assert.equal(r.body.data.attendance.version,1);});
  test(label+' permissions block new process',()=>{const r=run({config,operation:'PROCESS_START'});assert.equal(r.http_status,503);assert.equal(r.body.error.code,'PROCESS_PERMISSION_CONFIG_INVALID');assert.notEqual(r.execute,true);});
  test(label+' permissions allow logout and STOP plans',()=>{const out=run({config,operation:'PROCESS_LOGOUT',processes:[active]});assert.equal(out.execute,true);assert.equal(out.plan.active_process,null);assert.equal(out.plan.after.state,'OPEN');assert.equal(out.moniti_enabled,false);const stop=run({config,operation:'FINISH',processes:[active]});assert.equal(stop.execute,true);assert.equal(stop.plan.after.state,'CLOSED');assert.equal(stop.plan.process_updates[0].stop_at,stop.plan.after.stop_at);});
}
test('Frozen recovery completes after permission revocation',()=>{
  const prepared=run({operation:'PROCESS_START'});
  const prior={request_id:'66000000-0000-4000-8000-000000000001',payload_hash:'fixture',status:'RECOVERY_REQUIRED',attempts:1,response_json:JSON.stringify({plan:prepared.plan,response:prepared.response,moniti_enabled:false})};
  const r=run({operation:'PROCESS_START',prior,config:[cfg(personKey,null)]});
  assert.equal(r.execute,true);assert.equal(r.attempts,2);assert.deepEqual(r.plan,prepared.plan);
});
console.log(`Generated process permissions service PASS: ${count} cases; in-memory fixtures only.`);
