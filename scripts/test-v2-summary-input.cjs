'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),M=require('../backend/v2/metrics/domain.cjs');
const graph=JSON.parse(cp.execFileSync(process.execPath,['backend/v2/metrics/build-summary.mjs'],{encoding:'utf8',cwd:require('node:path').join(__dirname,'..')}));
const code=graph.nodes.find(n=>n.name==='Build Input').parameters.jsCode;
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
function run(options={}){const data={
 Context:[{employee_id:'MOL7001',work_date:'2026-09-04',aggregate_id:'MOL7001:2026-09-04',month:'2026-09',summary_id:'MOL7001:2026-09'}],
 'Read Attendance':[{attendance_id:'MOL7001:2026-09-04',state:'CLOSED',start_at:'2026-09-04T20:00:00Z',stop_at:'2026-09-04T23:00:00Z'}],
 'Read Month':[],'Read Commands':[],'Read Pending Batch':[],'Read Config':[],'Read Boundary Commands':[],
 'Read Current Checkpoint':[{checkpoint_id:'MOL7001:2026-09-05'}],'Read Checkpoint':[{checkpoint_id:'MOL7001:2026-09-04'}],
 'Read Employees':[{employee_id:'MOL7001',es_worker_id:'fixture',active:true}],'Read Processes':[],'Read Deltas':[],...options};
 const lookup=name=>({all:()=>data[name].map(json=>({json})),first:()=>({json:data[name][0]||{}})});
 const DateTime={now:()=>({setZone:()=>({toISODate:()=> '2026-09-05'})}),fromISO:value=>({setZone:()=>({toISODate:()=> M.dayPL(value)})})};
 return new Function('$','DateTime',code)(lookup,DateTime)[0].json;
}
test('Closed overnight day uses checkpoint from the STOP calendar date',()=>assert.equal(run().input.checkpoint.checkpoint_id,'MOL7001:2026-09-05'));
test('Open overnight day uses current calendar checkpoint',()=>assert.equal(run({'Read Attendance':[{attendance_id:'MOL7001:2026-09-04',state:'OPEN',stop_at:null}]}).input.checkpoint.checkpoint_id,'MOL7001:2026-09-05'));
test('Regular closed day retains its own checkpoint',()=>assert.equal(run({'Read Attendance':[{attendance_id:'MOL7001:2026-09-04',state:'CLOSED',stop_at:'2026-09-04T20:00:00Z'}]}).input.checkpoint.checkpoint_id,'MOL7001:2026-09-04'));
test('No attendance does not borrow another date checkpoint',()=>assert.equal(run({'Read Attendance':[]}).input.checkpoint.checkpoint_id,'MOL7001:2026-09-04'));
test('Boundary command from another employee is included by request ID',()=>{const r=run({'Read Boundary Commands':[{request_id:'other-worker-command',status:'COMMITTED',employee_id:'MOL7002'}]});assert.equal(r.input.commands[0].request_id,'other-worker-command');assert.equal(Object.keys(r.input.commands[0]).length,2);});
test('Own and boundary lookups for the same command are deduplicated',()=>{const cmd={request_id:'same',status:'COMMITTED'};assert.equal(run({'Read Commands':[cmd],'Read Boundary Commands':[cmd]}).input.commands.length,1);});
test('Duplicated boundary command records fail closed',()=>assert.throws(()=>run({'Read Boundary Commands':[{request_id:'same'},{request_id:'same'}]}),/BOUNDARY_COMMAND_DUPLICATE/));
test('Pending attendance command blocks aggregate publication',()=>assert.equal(run({'Read Commands':[{request_id:'pending',status:'RECOVERY_REQUIRED'}]}).blocked,true));
test('Prepared ES batch blocks aggregate publication',()=>assert.equal(run({'Read Pending Batch':[{batch_id:'prepared'}]}).blocked,true));
test('Boundary requests are executed for each unique source, not only first item',()=>{assert.equal(graph.nodes.find(n=>n.name==='Read Boundary Commands').executeOnce,false);assert.equal(graph.nodes.find(n=>n.name==='Read Commands').executeOnce,true);});
console.log(`Summary input PASS: ${n} isolated cases.`);
