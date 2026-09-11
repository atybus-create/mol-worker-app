'use strict';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const ident=x=>typeof x==='string'&&/^MOL[0-9]+$/.test(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const iso=x=>{const n=Date.parse(x);if(!Number.isFinite(n))throw Error('COMM_TIME_INVALID');return new Date(n).toISOString()};
function config(rows){const r=rows.filter(x=>x.key==='COMMUNICATIONS_CONFIG');if(r.length!==1)throw Error('COMM_CONFIG_MISSING_OR_DUPLICATE');const c=JSON.parse(r[0].value_json),rule=c?.rules?.ATTENDANCE_CORRECTION;if(c.mode==='OFF'||!rule?.enabled)return {evaluate:false,deliver:false,reason:c.mode==='OFF'?'MODULE_OFF':'RULE_DISABLED'};if(typeof rule.ack_required!=='boolean')return {evaluate:false,deliver:false,reason:'PARAMETERS_NOT_CONFIRMED'};return {evaluate:true,deliver:c.mode==='LIVE',reason:c.mode==='LIVE'?null:'OBSERVE_ONLY',ack_required:rule.ack_required};}
function decide({config_rows,event,command,employee,managers=[],records=[],now}){
 const gate=config(config_rows),stamp=iso(now);if(!gate.evaluate)return {status:'DISABLED',reason:gate.reason,episode:null,deliveries:[]};
 if(!event||event.status!=='COMMITTED'||!['ATTENDANCE_CORRECTED','WORK_REOPENED'].includes(event.event_type)||!uuid(event.request_id))throw Error('COMM_CORRECTION_EVENT_INVALID');
 if(!command||command.request_id!==event.request_id||command.status!=='COMMITTED'||command.employee_id!==event.employee_id||!['ATTENDANCE_CORRECT','ATTENDANCE_REOPEN'].includes(command.operation))throw Error('COMM_CORRECTION_COMMAND_INVALID');
 if(!employee||employee.employee_id!==event.employee_id||!ident(employee.employee_id))throw Error('COMM_CORRECTION_EMPLOYEE_INVALID');
 if(event.actor_id!==command.actor_id)throw Error('COMM_CORRECTION_ACTOR_MISMATCH');
 const seen=new Set(),recipients=[];for(const m of managers){if(!m?.active||!ident(m.employee_id)||!['LEADER','ADMIN'].includes(m.role))continue;if(seen.has(m.employee_id))throw Error('COMM_CORRECTION_MANAGER_DUPLICATE');seen.add(m.employee_id);recipients.push(m.employee_id)}recipients.sort();
 const anchor=event.request_id,episode_id=employee.employee_id+'|ATTENDANCE_CORRECTION|'+anchor;
 const existing=records.filter(r=>r.kind==='EPISODE').map(r=>JSON.parse(r.payload_json)).find(e=>e.episode_id===episode_id);
 if(existing){if(existing.status!=='RESOLVED')throw Error('COMM_CORRECTION_EPISODE_STATE');return {status:'ALREADY_RECORDED',reason:null,episode:clone(existing),deliveries:[]};}
 let after;try{after=JSON.parse(event.after_json)}catch{throw Error('COMM_CORRECTION_EVENT_INVALID')}const attendance=after.attendance||after;if(!attendance||attendance.employee_id!==employee.employee_id||attendance.last_request_id!==event.request_id)throw Error('COMM_CORRECTION_EVENT_INVALID');
 let payload={};try{payload=JSON.parse(command.payload_json||'{}')}catch{throw Error('COMM_CORRECTION_COMMAND_INVALID')}
 const opened=iso(event.occurred_at),type=event.event_type==='WORK_REOPENED'?'Wznowienie dnia':'Korekta czasu pracy',reason=typeof payload.reason==='string'?payload.reason.trim():null;
 const episode={episode_id,employee_id:employee.employee_id,type:'ATTENDANCE_CORRECTION',anchor,status:'RESOLVED',opened_at:opened,resolved_at:opened,resolution_reason:'ATTENDANCE_CHANGE_COMMITTED',version:1,details:{event_type:event.event_type,work_date:attendance.work_date,attendance_version:attendance.version,actor_id:event.actor_id,reason}};
 const name=employee.display_name||employee.employee_id,content=`${type}: ${name}, ${attendance.work_date}${reason?'. Powód: '+reason:''}`;
 const deliveries=gate.deliver?recipients.map(recipient_id=>({message_id:'ALERT:'+episode_id+':'+recipient_id,episode_id,recipient_id,sender_id:'SYSTEM',type:'ATTENDANCE_CORRECTION',content,ack_required:gate.ack_required,sent_at:stamp,shown_at:null,ack_at:null,valid_until:null,delivery_status:'PENDING',cause_status:'RESOLVED',resolved_at:opened,version:1})):[];
 return {status:'RESOLVED',reason:gate.reason,episode,deliveries};
}
function plan({decision,records=[],request_id,payload_hash,lock_owner,now}){
 if(!decision?.episode||decision.status==='ALREADY_RECORDED')return {execute:false};if(!uuid(request_id)||!/^[0-9a-f]{64}$/.test(payload_hash||'')||!/^\d+$/.test(String(lock_owner)))throw Error('COMM_BATCH_INVALID');
 const state=records.find(r=>r.record_key==='STATE:COMM_GLOBAL'),revision=state?JSON.parse(state.payload_json).revision+1:1,writes=[];const add=(key,kind,scope,data,old=null)=>writes.push({row:{record_key:key,kind,scope_id:scope,version:(old?.version||0)+1,revision,payload_json:canonical(data),last_request_id:request_id},expected_version:old?.version||0});
 const ek='EPISODE:'+decision.episode.episode_id;if(!records.find(r=>r.record_key===ek))add(ek,'EPISODE',decision.episode.employee_id,decision.episode);
 for(const d of decision.deliveries){const key='DELIVERY:'+d.message_id;if(records.find(r=>r.record_key===key))continue;add(key,'DELIVERY',d.recipient_id,{...d,created_revision:revision});add('EVENT:'+request_id+':'+d.message_id,'EVENT',d.recipient_id,{stream:'delivery_change',event:'SENT',actor_id:'SYSTEM',occurred_at:iso(now),revision,delivery:{...d,created_revision:revision,revision}})}
 if(!writes.length)return {execute:false};add('STATE:COMM_GLOBAL','STATE','GLOBAL',{revision},state);return {execute:true,batch:{lock_owner:String(lock_owner),request_id,payload_hash,actor_id:'SYSTEM',operation:'OBSERVE',records:writes,response:{ok:true,type:'ATTENDANCE_CORRECTION',revision,status:decision.status}}};
}
module.exports={config,decide,plan};
