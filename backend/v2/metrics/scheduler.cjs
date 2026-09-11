'use strict';
// Bounded fair rotation. A constant first-six slice can starve all other workers.
function selectTargets(openDays, jobs, now, batchSize=6) {
 if(!Number.isFinite(now)||!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>24)throw Error('SCHEDULER_CONFIG_INVALID');
 const ids=new Set();
 for(const a of openDays)if(a.attendance_id)ids.add(a.attendance_id);
 for(const j of jobs.filter(j=>j.outbox_id&&Date.parse(j.next_attempt_at)<=now).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)))ids.add(j.aggregate_id);
 const all=[...ids].filter(x=>/^MOL[0-9]+:\d{4}-\d{2}-\d{2}$/.test(x)).sort();
 const start=all.length>batchSize?(Math.floor(now/60000)*batchSize)%all.length:0;
 return Array.from({length:Math.min(batchSize,all.length)},(_,i)=>all[(start+i)%all.length]).map(x=>({employee_id:x.split(':')[0],work_date:x.split(':')[1]}));
}
if(typeof module!=='undefined')module.exports={selectTargets};
