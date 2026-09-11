import {Graph} from './build-workflows.mjs';
const g=new Graph('ATTENDANCE RECOVERY');
g.node('Schedule','scheduleTrigger',{rule:{interval:[{field:'minutes',minutesInterval:1}]}},{typeVersion:1.2});
g.node('Internal Input','executeWorkflowTrigger',{inputSource:'passthrough'});
g.table('Read Pending','COMMANDS','get',[['status','RECOVERY_REQUIRED']],{},true);
g.code('Choose Due',`const rows=$input.all().map(i=>i.json).filter(c=>c.request_id&&c.operation?.startsWith('ATTENDANCE_')&&(c.attempts||0)<8&&Date.now()-Date.parse(c.updatedAt)>60000*Math.min(30,2**Math.min(c.attempts||0,5)));rows.sort((a,b)=>Date.parse(a.updatedAt)-Date.parse(b.updatedAt));return rows.slice(0,1).map(c=>({json:{recovery_request_id:c.request_id}}));`);
g.execute('Recover','qPVmcfp6pUg3GbzH');g.chain('Schedule','Read Pending','Choose Due','Recover');g.link('Internal Input','Read Pending');
console.log(JSON.stringify(g));
