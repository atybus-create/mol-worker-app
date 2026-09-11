'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v2/attendance.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'v2/norms.js'),'utf8');
const settle=()=>new Promise(r=>setImmediate(r));
const norm=(extra={})=>({pak_percent:100,pick_percent:100,combined_percent:100,eligible_pak:70,eligible_pick:210,outside_pak:0,outside_pick:0,pak_seconds:3600,pick_seconds:3600,freshness:'FRESH',coverage:'COMPLETE',has_value:true,reason:null,source_error:null,version:4,calculated_at:'2026-09-05T10:00:00Z',...extra});
function browser(){
 const elements=new Map(),listeners={},intervals=[],calls=[],storage=new Map(),waiting=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,disabled:false,textContent:'',dataset:{},replaceChildren(...children){this.children=children;},addEventListener(type,fn){this[type]=fn;}});return elements.get(id);};
 const profile={user:{employee_id:'MOL004',role:'WORKER'}};
 const state={version:50,attendanceVersion:8,day:norm(),month:norm(),offline:false,defer:false,omit:null,invalid:null};
 const data=()=>({user:profile.user,employee:{employee_id:profile.user.employee_id},work_date:el('workDate').value,month:el('normMonth').value,
 attendance:{state:'OPEN',version:state.attendanceVersion,start_at:'2026-09-05T06:00:00Z',stop_at:null},open_day:{state:'OPEN',version:state.attendanceVersion,work_date:el('workDate').value},attendance_version:state.attendanceVersion,snapshot_version:state.version,
 norm:state.day,monthly_norm:state.month,writes_enabled:true,moniti_enabled:false,active_process:null,process_catalog:[{process_code:'PAKOWANIE',display_name:'Pakowanie'}],process_sessions:[],process_seconds:7200,no_process_seconds:60});
 const context=vm.createContext({window:{},document:{getElementById:el,createElement:()=>({}),hidden:false,addEventListener(type,fn){listeners[type]=fn;}},Intl,Date,JSON,Math,Number,Object,Set,TypeError,Error,AbortController,
 crypto:{randomUUID:()=> '7a000000-0000-4000-8000-000000000001'},setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length;},setTimeout:()=>1,clearTimeout(){},
 sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async(url,options)=>{
   calls.push({url,options,body:options.body?JSON.parse(options.body):null});
   if(state.offline)throw new TypeError('offline');
   let payload=data();if(state.omit)delete payload[state.omit];if(state.invalid)payload[state.invalid.key]=state.invalid.value;
   const result={ok:true,status:200,json:async()=>({ok:true,data:payload})};
   if(state.defer)return await new Promise(r=>waiting.push(()=>r(result)));
   return result;
 }});
 vm.runInContext(renderer,context);vm.runInContext(source,context);
 return {el,state,profile,data,calls,waiting,intervals,context,activate:()=>context.window.molAttendance.activate(profile,'a'.repeat(64)),refresh:()=>el('attendanceRefresh').click(),hide:()=>context.window.molAttendance.hide()};
}
let count=0;function check(name,fn){fn();count++;console.log('PASS '+name);}
(async()=>{
 const b=browser();b.activate();await settle();
 check('A single request supplies attendance and both norms',()=>{assert.equal(b.calls.length,1);assert.ok(b.calls[0].url.includes('/mol-app-v2-worker-status?'));assert.ok(b.calls[0].url.includes('month='));});
 check('Daily and weighted monthly results render',()=>{assert.equal(b.el('normDayPercent').textContent,'100%');assert.equal(b.el('normMonthPercent').textContent,'100%');});
 check('Counts and eligible times are shown',()=>{assert.match(b.el('normDayDetails').textContent,/PAK: 70 \/ 1 h/);assert.match(b.el('normDayDetails').textContent,/PICK: 210 \/ 1 h/);});
 b.state.version=51;b.state.day=norm({combined_percent:75});b.state.month=norm({combined_percent:25});b.refresh();await settle();
 check('Norm-only revision updates without attendance version change',()=>{assert.equal(b.el('normDayPercent').textContent,'75%');assert.equal(b.el('normMonthPercent').textContent,'25%');});
 b.state.version=49;b.state.day=norm({combined_percent:10});b.refresh();await settle();
 check('Older snapshot cannot erase newer norms',()=>assert.equal(b.el('normDayPercent').textContent,'75%'));
 b.state.version=52;b.state.omit='norm';b.refresh();await settle();
 check('Partial success preserves whole previous snapshot',()=>{assert.equal(b.el('normDayPercent').textContent,'75%');assert.equal(b.el('normMonthPercent').textContent,'25%');assert.match(b.el('normConnection').textContent,/snapshot/);});
 b.state.omit=null;b.state.offline=true;b.refresh();await settle();
 check('Network failure retains values and marks them unconfirmed',()=>{assert.equal(b.el('normDayPercent').textContent,'75%');assert.equal(b.el('normDayFreshness').dataset.freshness,'STALE');});
 b.state.offline=false;b.state.day=norm({combined_percent:0,pak_percent:0});b.refresh();await settle();
 check('Real zero is displayed as zero, not missing data',()=>assert.equal(b.el('normDayPercent').textContent,'0%'));
 b.state.version++;b.state.day=norm({combined_percent:null,pak_percent:null,pick_percent:null,reason:'NO_ELIGIBLE_PROCESS_TIME'});b.refresh();await settle();
 check('Zero denominator is a dash with explanation',()=>{assert.equal(b.el('normDayPercent').textContent,'\u2014');assert.match(b.el('normDayNote').textContent,/Brak czasu/);});
 b.state.version++;b.state.day=norm({combined_percent:null,pak_percent:null,pick_percent:null,freshness:'UNAVAILABLE',has_value:false,source_error:'ES_OPERATOR_NOT_FOUND',coverage:'UNOBSERVED'});b.refresh();await settle();
 check('ES missing operator is not reported as zero percent',()=>{assert.equal(b.el('normDayPercent').textContent,'\u2014');assert.match(b.el('normDayNote').textContent,/nie zawiera tego operatora/);});
 b.state.version++;b.state.day=norm({freshness:'STALE',source_error:'ES_STALE',coverage:'GAPPED'});b.refresh();await settle();
 check('Stale and incomplete source preserve numeric values with warning',()=>{assert.equal(b.el('normDayPercent').textContent,'100%');assert.match(b.el('normDayNote').textContent,/luka/);assert.equal(b.el('normDayFreshness').dataset.freshness,'STALE');});
 b.el('processChoice').value='PAKOWANIE';b.el('processStart').click();await settle();
 check('Mutation uses attendance version, not view revision',()=>assert.equal(b.calls.find(x=>x.body).body.expected_version,8));
 const poll=b.intervals.find(x=>x.ms===30000);
 check('Polling interval is 30 seconds',()=>assert.ok(poll));
 let before=b.calls.length;poll.fn();await settle();
 check('Visible idle page refreshes',()=>assert.equal(b.calls.length,before+1));
 b.context.document.hidden=true;before=b.calls.length;poll.fn();await settle();
 check('Hidden page does not poll',()=>assert.equal(b.calls.length,before));
 b.context.document.hidden=false;b.el('correctionReason').value='draft';b.el('correctionReason').input();poll.fn();await settle();
 check('Polling does not overwrite a correction draft',()=>{assert.equal(b.calls.length,before);assert.equal(b.el('correctionReason').value,'draft');});
 b.refresh();await settle();
 b.el('normMonth').value='2026-08';b.state.version=1;b.el('normMonth').change();await settle();
 check('Month has its own revision scope',()=>{assert.equal(b.el('normMonthLabel').textContent,'Miesi\u0105c 2026-08');assert.match(b.calls.at(-1).url,/month=2026-08/);});
 b.state.defer=true;b.refresh();await settle();b.hide();b.waiting.shift()();await settle();
 check('Response arriving after logout cannot restore norms',()=>{assert.equal(b.el('normDayPercent').textContent,'');assert.equal(b.el('attendancePanel').hidden,true);});
 before=b.calls.length;poll.fn();await settle();
 check('Polling stops after logout',()=>assert.equal(b.calls.length,before));
 const c=browser();c.activate();await settle();c.profile.user={employee_id:'MOL015',role:'ADMIN'};c.activate();await settle();
 check('Changing account resets previous scope and displays new one',()=>assert.equal(c.el('sheetApprovalPanel').hidden,false));
 c.state.invalid={key:'attendance_version',value:99};c.refresh();await settle();
 check('Incoherent attendance/view snapshot is rejected',()=>assert.match(c.el('attendanceMessage').textContent,/Niepe\u0142ny snapshot/));
 c.state.invalid=null;c.state.version++;c.state.day=norm({combined_percent:NaN});c.refresh();await settle();
 check('Non-finite norm cannot overwrite a previous result',()=>assert.equal(c.el('normDayPercent').textContent,'100%'));
 const html=fs.readFileSync(path.join(root,'v2/index.html'),'utf8');
 check('Renderer loads before attendance without inline JavaScript',()=>{assert.ok(html.indexOf('./norms.js')<html.indexOf('./attendance.js'));assert.ok(!/<script>(?!\s*<\/script>)/.test(html));});
 check('Renderer has no separate network reader',()=>assert.ok(!/fetch\(/.test(renderer)));
 console.log(`Norm UI PASS: ${count} cases; isolated DOM/network fixtures, not a live authenticated browser test.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
