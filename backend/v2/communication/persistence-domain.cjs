'use strict';
// LOCAL CANDIDATE. Bounded Data Table read plans; no I/O or credentials here.
const D=require('./domain.cjs');
const A=require('./api-domain.cjs');
const need=D.requireValue;
const ident=x=>typeof x==='string'&&/^MOL[0-9]+$/.test(x);
const decode=x=>{let p;try{p=JSON.parse(x);}catch{need(false,'COMM_RECORD_CORRUPT');}return p;};
function controls(rows){
 const a=rows.filter(r=>r.key==='WRITES_ENABLED');
 need(a.length===1,'COMM_CONFIG_MISSING_OR_DUPLICATE');
 const writes=decode(a[0].value_json);need(typeof writes==='boolean','COMM_CONFIG_INVALID');
 let config=null,configError=null;
 try{config=D.configFromRows(rows);}catch(e){configError=e.code||'COMM_CONFIG_INVALID';}
 return {writes_enabled:writes,config,config_error:configError};
}
function publicControls(rows){
 const c=controls(rows);
 return {manual_send_enabled:c.writes_enabled&&!!c.config&&D.ruleGate(c.config,'MANUAL').deliver,
  poll_seconds:c.config?.poll_seconds??null,configuration_error:c.config_error,
  mode:c.config?.mode||'OFF',counts_complete:false};
}
function readQuery(actor,query={}){
 need(actor?.active===true&&ident(actor.employee_id)&&['WORKER','LEADER','ADMIN'].includes(actor.role),'COMM_UNAUTHENTICATED');
 need(D.object(query)&&Object.keys(query).every(k=>['employee_id','limit','cursor','since_revision'].includes(k)),'COMM_REQUEST_INVALID');
 const target=query.employee_id??actor.employee_id;need(ident(target),'COMM_REQUEST_INVALID');
 need(target===actor.employee_id||['LEADER','ADMIN'].includes(actor.role),'COMM_FORBIDDEN');
 const number=(v,fallback)=>{if(v===undefined)return fallback;need(typeof v==='string'&&/^\d{1,16}$/.test(v)&&D.integer(Number(v)),'COMM_REQUEST_INVALID');return Number(v);};
 const limit=number(query.limit,25);need(limit>=1&&limit<=100,'COMM_LIMIT_INVALID');
 let cursor=null,stream=Object.hasOwn(query,'since_revision')?'changes':'history';
 const since=number(query.since_revision,0);
 if(Object.hasOwn(query,'cursor')){
  need(!Object.hasOwn(query,'since_revision')&&typeof query.cursor==='string'&&query.cursor.length>0&&query.cursor.length<=2048&&/^[A-Za-z0-9_-]+$/.test(query.cursor),'COMM_CURSOR_INVALID');
  try{cursor=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'));}catch{need(false,'COMM_CURSOR_INVALID');}
  need(D.object(cursor)&&cursor.v===2&&['history','changes'].includes(cursor.stream)&&ident(cursor.viewer)&&ident(cursor.target)&&D.integer(cursor.ceiling)&&D.integer(cursor.edge_id)&&D.integer(cursor.ceiling_id)&&D.integer(cursor.since),'COMM_CURSOR_INVALID');
  need(cursor.viewer===actor.employee_id&&cursor.target===target,'COMM_CURSOR_SCOPE');
  need(cursor.since<=cursor.ceiling,'COMM_CURSOR_INVALID');
  if(cursor.stream==='history')need(cursor.edge_id<=cursor.ceiling_id,'COMM_CURSOR_INVALID');
  stream=cursor.stream;
 }
 return {target,viewer:actor.employee_id,limit,stream,since:cursor?.since??since,cursor};
}
function readPlan({actor,query,global_rows=[],pending=[]}){
 const q=readQuery(actor,query);need(pending.length===0,'COMM_RECOVERY_REQUIRED');
 const g=A.globalState(global_rows);const ceiling=q.cursor?.ceiling??g.revision;
 need(ceiling<=g.revision&&q.since<=ceiling,'COMM_CURSOR_AHEAD');
 const filter=(keyName,condition,keyValue)=>({keyName,condition,keyValue});
 const filters=[filter('kind','eq',q.stream==='history'?'DELIVERY':'EVENT'),filter('scope_id','eq',q.target)];
 if(q.stream==='history'){
  if(q.cursor){filters.push(filter('id','lt',q.cursor.edge_id),filter('id','lte',q.cursor.ceiling_id));}
 }else{
  filters.push(filter('revision','gt',q.since),filter('revision','lte',ceiling),filter('id','gt',q.cursor?.edge_id??0));
 }
 return {...q,revision:g.revision,ceiling,ceiling_id:q.cursor?.ceiling_id??0,
  parameters:{resource:'row',operation:'get',matchType:'allConditions',filters:{conditions:filters},returnAll:false,limit:q.limit+1,orderBy:true,orderByColumn:'id',orderByDirection:q.stream==='history'?'DESC':'ASC',options:{}}};
}
function finishPage({plan,rows=[],now,config_rows=[]}){
 const stamp=D.iso(now),q=plan;
 need(Array.isArray(rows)&&rows.length<=q.limit+1,'COMM_PAGE_OVERFLOW');
 need(new Set(rows.map(r=>r.id)).size===rows.length&&new Set(rows.map(r=>r.record_key)).size===rows.length,'COMM_DUPLICATE_RECORD');
 const sorted=[...rows].sort((a,b)=>q.stream==='history'?b.id-a.id:a.id-b.id);
 const ceilingId=q.stream==='history'?(q.ceiling_id||sorted[0]?.id||0):0;
 const page=sorted.slice(0,q.limit),more=sorted.length>q.limit;
 const decorate=d=>({...d,expired:!!d.valid_until&&Date.parse(d.valid_until)<=Date.parse(stamp)});
 const items=[];
 for(const r of sorted){
  need(D.integer(r.id,1)&&r.scope_id===q.target&&r.kind===(q.stream==='history'?'DELIVERY':'EVENT'),'COMM_PAGE_SCOPE_INVALID');
  if(q.stream==='history')need((!q.cursor||r.id<q.cursor.edge_id)&&r.id<=ceilingId,'COMM_PAGE_SCOPE_INVALID');
  else need(r.revision>q.since&&r.revision<=q.ceiling&&r.id>(q.cursor?.edge_id??0),'COMM_PAGE_SCOPE_INVALID');
 }
 for(const r of page){
  if(q.stream==='history'){
   const d=A.deliveryOf(r);need(d.created_revision<=q.ceiling,'COMM_PAGE_SCOPE_INVALID');items.push(decorate(d));
  }else{
   D.validateRecord(Object.fromEntries(D.RECORD_FIELDS.map(k=>[k,r[k]])));
   const p=decode(r.payload_json);need(['command_audit','delivery_change'].includes(p.stream),'COMM_CHANGE_CORRUPT');
   if(p.stream==='command_audit')continue;
   need(p.revision===r.revision&&p.delivery?.recipient_id===q.target&&p.delivery?.revision===r.revision,'COMM_CHANGE_CORRUPT');
   const d=p.delivery;D.iso(p.occurred_at);
   // Validate the immutable copy with the same delivery rules as current state.
   const valid=A.deliveryOf({record_key:'DELIVERY:'+d.message_id,kind:'DELIVERY',scope_id:q.target,
    version:d.version,revision:d.revision,payload_json:D.canonical(d),last_request_id:r.last_request_id});
   items.push({event:p.event,occurred_at:p.occurred_at,delivery:decorate(valid)});
  }
 }
 const last=page.at(-1),next_cursor=more?Buffer.from(D.canonical({v:2,stream:q.stream,target:q.target,viewer:q.viewer,
  ceiling:q.ceiling,ceiling_id:ceilingId,edge_id:last.id,since:q.since}),'utf8').toString('base64url'):null;
 return {employee_id:q.target,stream:q.stream,revision:q.revision,snapshot_revision:q.ceiling,items,next_cursor,
  sync_revision:q.stream==='changes'&&!more?q.ceiling:null,server_time:stamp,...publicControls(config_rows),
  unread_count:null,unacknowledged_count:null,scanned_rows:page.length};
}
function dispatch(input){
 const stamp=input.now||new Date().toISOString();
 try{
  const c={...(input.context||{})};
  if(input.step==='AUTHORIZE'){
   const actor=A.authorizeSession({...input,now:stamp});const op=input.operation;
   need(['SEND','SHOWN','ACK','LIST','RECIPIENTS'].includes(op),'COMM_ACTION_INVALID');
   let intent=null;
   if(['SEND','SHOWN','ACK'].includes(op))intent=A.normalizeWrite(actor,op,input.body);
   if(op==='LIST')readQuery(actor,input.query||{});
   if(op==='RECIPIENTS'){need(D.object(input.query)&&!Object.keys(input.query).length,'COMM_REQUEST_INVALID');A.listRecipients({actor,employees:[],attendance:[],now:stamp});}
   return {route:'AUTHORIZED',actor,intent,operation:op,body:input.body||{},query:input.query||{},
    canonical:intent?.canonical||D.canonical({actor_id:actor.employee_id,operation:op,query:input.query||{}})};
  }
  if(input.step==='PREPARE'){
   const ctl=controls(c.config_rows);c.writes_enabled=ctl.writes_enabled;
   if(['SEND','SHOWN','ACK'].includes(c.operation)&&(c.prior||(c.pending||[]).length)){
    const d=A.planWrite({...c,now:stamp});return d.execute?{route:'BATCH',batch:d.batch}:{route:'RETURN',response:d.response};
   }
   need((c.pending||[]).length===0,'COMM_RECOVERY_REQUIRED');
   if(['SEND','SHOWN','ACK'].includes(c.operation))need(ctl.writes_enabled,'COMM_WRITES_DISABLED');
   if(c.operation==='SEND'){need(!!ctl.config,'COMM_CONFIG_INVALID');need(D.ruleGate(ctl.config,'MANUAL').deliver,'COMM_SEND_DISABLED');}
   if(c.operation==='LIST')return {route:'PAGE',plan:readPlan({actor:c.actor,query:c.query,global_rows:c.records,pending:c.pending})};
   return {route:['SEND','RECIPIENTS'].includes(c.operation)?'PEOPLE':'RECEIPT'};
  }
  if(input.step==='PLAN_WRITE'){
   need((c.employees||[]).length<=1000&&(c.attendance||[]).length<=100,'COMM_RECIPIENT_CAPACITY_EXCEEDED');
   const d=A.planWrite({...c,writes_enabled:controls(c.config_rows).writes_enabled,now:stamp});
   return d.execute?{route:'BATCH',batch:d.batch}:{route:'RETURN',response:d.response};
  }
  if(input.step==='RECIPIENTS'){
   need(input.employees.length<=1000&&input.attendance.length<=100,'COMM_RECIPIENT_CAPACITY_EXCEEDED');
   const data={items:A.listRecipients({...input,now:stamp}),...publicControls(input.config_rows)};
   return {route:'RETURN',response:{http_status:200,body:{ok:true,request_id:'',data,meta:{api_version:'2.0',server_time:stamp}}}};
  }
  if(input.step==='PAGE')return {route:'RETURN',response:{http_status:200,body:{ok:true,request_id:'',data:finishPage({...input,now:stamp}),meta:{api_version:'2.0',server_time:stamp}}}};
  need(false,'COMM_ACTION_INVALID');
 }catch(e){return {route:'RETURN',response:A.errorResponse(e,input.context?.body?.request_id||input.body?.request_id||'',stamp)};}
}
module.exports={controls,publicControls,readQuery,readPlan,finishPage,dispatch};
