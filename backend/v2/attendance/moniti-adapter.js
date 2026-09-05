// n8n Code node; only the explicitly authorized test day and three workers.
const req=$('Adapter Input').first().json;
const cookie=$input.first().json.cookieHeader;
const allowedWorkers=[99191,99186,99185], testDate='2026-09-05';
const today=DateTime.now().setZone('Europe/Warsaw').toISODate();
const workerId=Number(req.worker_id),date=req.work_date;
const failure=(code,uncertain=false)=>[{json:{ok:false,code,uncertain,worker_id:workerId,work_date:date}}];
if(!allowedWorkers.includes(workerId)||date!==testDate)return failure('MONITI_TEST_SCOPE');
if(req.mode!=='read'&&today!==testDate)return failure('MONITI_TEST_WINDOW_CLOSED');
if(!['read','apply'].includes(req.mode))return failure('MONITI_INVALID_MODE');
if(!/^PHPSESSID=[^;\s]+$/.test(cookie||''))return failure('MONITI_AUTH_FAILED');
const base='https://admin.moniti.app/api/worker_days';
const day=DateTime.fromISO(date,{zone:'Europe/Warsaw'});
const query=`${base}?worker=${workerId}&date%5Bafter%5D=${day.minus({days:1}).toISODate()}&date%5Bbefore%5D=${day.plus({days:1}).toISODate()}&order%5Bdate%5D=asc`;
const headers={accept:'application/json',cookie,'content-type':'application/json','x-api-format':'2.7',referer:'https://admin.moniti.app/'};
const call=opts=>this.helpers.httpRequest({...opts,headers,json:true,timeout:20000});
const iso=value=>value?new Date(value).toISOString():null;
const members=body=>Array.isArray(body?.['hydra:member'])?body['hydra:member']:Array.isArray(body)?body:[];
const read=async()=>{const body=await call({method:'GET',url:query});const rows=members(body).filter(r=>String(r.date).slice(0,10)===date);if(rows.length>1)throw new Error('MONITI_DUPLICATE_DAY');return rows[0]||null;};
const matches=(entry,target)=>!!entry&&!!target&&iso(entry.start)===iso(target.start_at)&&iso(entry.finish)===iso(target.stop_at);
let wrote=false;
try{
  let current=await read();
  let entries=Array.isArray(current?.workerDayEntries)?current.workerDayEntries:[];
  if(req.mode==='read')return [{json:{ok:true,worker_id:workerId,work_date:date,day_id:current?.id||null,finished:current?.finished??false,entries:entries.map(e=>({entry_id:e.id,start_at:iso(e.start),stop_at:iso(e.finish)}))}}];
  const after=req.after,before=req.before;
  if(!after?.start_at||after.work_date!==date||DateTime.fromISO(after.start_at).setZone('Europe/Warsaw').toISODate()!==date)return failure('MONITI_INVALID_TARGET');
  if(!Number.isFinite(Date.parse(after.start_at))||Date.parse(after.start_at)>Date.now()||(after.stop_at&&(!Number.isFinite(Date.parse(after.stop_at))||Date.parse(after.stop_at)>Date.now()||Date.parse(after.stop_at)<Date.parse(after.start_at))))return failure('MONITI_INVALID_TARGET');
  if(entries.length>1)return failure('MONITI_MULTIPLE_ENTRIES');
  if(entries.length===1&&matches(entries[0],after)&&current.finished===(after.state==='CLOSED'))return [{json:{ok:true,verified:true,idempotent:true,day_id:current.id,entry_id:entries[0].id,start_at:iso(entries[0].start),stop_at:iso(entries[0].finish)}}];
  if((!before&&entries.length)||(before&&(entries.length!==1||!matches(entries[0],before))))return failure('MONITI_EXTERNAL_CONFLICT');
  if(!current){
    if(before)return failure('MONITI_EXTERNAL_CONFLICT');
    wrote=true;await call({method:'POST',url:base+'/generate',body:{from:date,to:date,workers:[`/api/workers/${workerId}`]}});
    current=await read();if(!current?.id)return failure('MONITI_DAY_NOT_CREATED',true);
    entries=Array.isArray(current.workerDayEntries)?current.workerDayEntries:[];
    if(entries.length)return failure('MONITI_EXTERNAL_CONFLICT',true);
  }
  const entry=entries[0]||{department:null,approved:true,workerDayEntryActivities:[],workerDay:`/api/worker_days/${current.id}`,odometer:0,startAction:null,finishAction:null,jobPosition:null,isRemote:false,warnings:[],note:'MOL V2 — test 2026-09-05'};
  const updated={...entry,start:after.start_at,finish:after.stop_at||null,finished:after.state==='CLOSED',totalTime:after.stop_at?Math.round((Date.parse(after.stop_at)-Date.parse(after.start_at))/60000):0};
  wrote=true;
  await call({method:'PUT',url:base+'/'+current.id,body:{...current,workerDayEntries:[updated],finished:after.state==='CLOSED',dayEndDate:after.stop_at||after.start_at}});
  const checked=await read(),verified=checked?.workerDayEntries||[];
  if(verified.length!==1||!matches(verified[0],after)||checked.finished!==(after.state==='CLOSED'))return failure('MONITI_WRITE_NOT_CONFIRMED',true);
  return [{json:{ok:true,verified:true,idempotent:false,day_id:checked.id,entry_id:verified[0].id,start_at:iso(verified[0].start),stop_at:iso(verified[0].finish)}}];
}catch{return failure('MONITI_UNAVAILABLE',wrote);}
