import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {graph,ex,manifest,ref} from '../metrics/graph.mjs';
const root=new URL('./',import.meta.url);
const moduleText=(file,replacements={})=>{let s=readFileSync(new URL(file,root),'utf8');for(const [a,b]of Object.entries(replacements))s=s.replace(a,b);return `(function(){const module={exports:{}};${s}\nreturn module.exports;})()`;};
const bundle=`const D=${moduleText('domain.cjs')};\nconst A=${moduleText('api-domain.cjs',{"const D = require('./domain.cjs');":''})};\nconst P=${moduleText('persistence-domain.cjs',{"const D=require('./domain.cjs');":'',"const A=require('./api-domain.cjs');":''})};\n`;
export const candidateIds={rules:'CANDIDATE_COMM_API_RULES',service:'CANDIDATE_COMM_API_SERVICE'};
const safe=`const fail=(code,status=503)=>({http_status:status,body:{ok:false,request_id:'',error:{code,message:'Nie potwierdzono komunikacji. Odswiez stan lub ponow to samo zadanie.',retryable:status>=500||code==='COMM_BUSY'},meta:{api_version:'2.0',server_time:new Date().toISOString()}}});\n`;
const rowData=n=>`$('${n}').all().map(x=>x.json)`;
export function apiRules(){const g=graph('COMM API RULES',30);g.input();g.code('Dispatch',bundle+'return [{json:P.dispatch($input.first().json)}];');g.link('Input','Dispatch');return g;}
export function apiService(rulesId=candidateIds.rules){
 const g=graph('COMM API SERVICE',180);g.input();
 g.code('Validate Header',safe+String.raw`const i=$input.first().json;const token=/^Bearer ([0-9a-f]{64})$/.exec(i.authorization||'');if(!token)return [{json:fail('COMM_UNAUTHENTICATED',401)}];if(!['SEND','SHOWN','ACK','LIST','RECIPIENTS'].includes(i.operation)||Object.keys(i).some(k=>!['operation','authorization','body','query'].includes(k)))return [{json:fail('COMM_REQUEST_INVALID',400)}];return [{json:{valid:true,session_token:token[1],operation:i.operation,body:i.body||{},query:i.query||{}}}];`);
 g.test('Header Valid','$json.valid === true');
 g.node('Hash Session','crypto',{value:ex(ref('Validate Header')+'.session_token'),dataPropertyName:'token_hash'});
 g.table('Read Session','SESSIONS','get',[['token_hash',ex('$json.token_hash')]]);
 g.code('Session Check',safe+`const ss=$input.all().map(x=>x.json).filter(s=>s.session_id),s=ss[0];return [{json:ss.length===1&&!s.revoked_at&&Date.parse(s.expires_at)>Date.now()?{valid:true,employee_id:s.employee_id}:fail('COMM_UNAUTHENTICATED',401)}];`);
 g.test('Session Valid','$json.valid === true');g.table('Read Actor','EMPLOYEES','get',[['employee_id',ex(ref('Session Check')+'.employee_id')]]);
 g.code('Authorization Input',`const i=${ref('Validate Header')};return [{json:{step:'AUTHORIZE',operation:i.operation,body:i.body,query:i.query,token_hash:${ref('Hash Session')}.token_hash,sessions:${rowData('Read Session')},employees:${rowData('Read Actor')},now:new Date().toISOString()}}];`);
 g.execute('Authorize Request',rulesId);g.test('Authorized',"$json.route === 'AUTHORIZED'");
 g.node('Hash Intent','crypto',{value:ex(ref('Authorize Request')+'.canonical'),dataPropertyName:'payload_hash'});
 g.table('Acquire Writer','LOCKS','update',[['lock_key','command-writer'],['owner','']],{owner:ex('String($execution.id)'),lease_until:ex('$now.plus({seconds:180}).toISO()')});
 g.test('Owns Writer','$json.owner === String($execution.id)');
 g.code('Busy',safe+"return [{json:fail('COMM_BUSY',409)}];");
 g.table('Read Pending','COMM_COMMANDS','get',[['status','PREPARED']]);
 g.table('Read Prior','COMM_COMMANDS','get',[['request_id',ex(ref('Authorize Request')+".intent?.request_id || ''")]]);
 g.table('Read Global','COMM_RECORDS','get',[['record_key','STATE:COMM_GLOBAL']]);
 g.table('Read Config','CONFIG','get',[['key','COMMUNICATIONS_CONFIG'],['key','WRITES_ENABLED']]);Object.assign(g.nodes.at(-1).parameters,{matchType:'anyCondition',limit:5});
 g.code('Context',safe+`const a=${ref('Authorize Request')},prior=${rowData('Read Prior')}.filter(r=>r.request_id),globals=${rowData('Read Global')}.filter(r=>r.record_key);if(prior.length>1||globals.length>1)return [{json:{invalid:true,response:fail('COMM_JOURNAL_INVALID')}}];return [{json:{...a,prior:prior[0]||null,pending:${rowData('Read Pending')}.filter(r=>r.request_id),records:globals,config_rows:${rowData('Read Config')}.filter(r=>r.key),payload_hash:${ref('Hash Intent')}.payload_hash,lock_owner:String($execution.id)}}];`);
 g.test('Context Valid','$json.invalid !== true');
 g.code('Prepare Input',`return [{json:{step:'PREPARE',context:${ref('Context')},now:new Date().toISOString()}}];`);g.execute('Prepare',rulesId);
 g.test('Needs People',"$json.route === 'PEOPLE'");g.test('Needs Receipt',"$json.route === 'RECEIPT'");g.test('Needs Page',"$json.route === 'PAGE'");
 g.table('Read Active Employees','EMPLOYEES','get',[['active',true]]);g.nodes.at(-1).parameters.limit=1001;
 g.table('Read Open Attendance','ATTENDANCE','get',[['state','OPEN']]);g.nodes.at(-1).parameters.limit=101;
 g.code('People Input',`const c=${ref('Context')},employees=${rowData('Read Active Employees')}.filter(r=>r.employee_id),attendance=${rowData('Read Open Attendance')}.filter(r=>r.attendance_id);return [{json:c.operation==='SEND'?{step:'PLAN_WRITE',context:{...c,employees,attendance},now:new Date().toISOString()}:{step:'RECIPIENTS',actor:c.actor,employees,attendance,config_rows:c.config_rows,now:new Date().toISOString()}}];`);
 g.execute('Plan People',rulesId);
 g.table('Read Delivery','COMM_RECORDS','get',[['record_key',ex("'DELIVERY:'+"+ref('Context')+'.intent.normalized.message_id')],['scope_id',ex(ref('Context')+'.actor.employee_id')]]);
 g.code('Receipt Input',safe+`const c=${ref('Context')},rows=$input.all().map(x=>x.json).filter(r=>r.record_key);if(rows.length>1)return [{json:{step:'INVALID'}}];return [{json:{step:'PLAN_WRITE',context:{...c,records:c.records.concat(rows)},now:new Date().toISOString()}}];`);g.execute('Plan Receipt',rulesId);
 g.table('Read Page','COMM_RECORDS','get',[]);const page=g.nodes.at(-1).parameters;Object.assign(page,{filters:ex(ref('Prepare')+'.plan.parameters.filters'),limit:ex(ref('Prepare')+'.plan.parameters.limit'),orderBy:true,orderByColumn:'id',orderByDirection:ex(ref('Prepare')+'.plan.parameters.orderByDirection')});
 g.code('Page Input',`return [{json:{step:'PAGE',plan:${ref('Prepare')}.plan,rows:$input.all().map(x=>x.json).filter(r=>r.record_key),config_rows:${ref('Context')}.config_rows,now:new Date().toISOString()}}];`);g.execute('Build Page',rulesId);
 g.test('Has Batch',"$json.route === 'BATCH'");g.code('Batch Input','return [{json:$input.first().json.batch}];');g.execute('Execute Batch',manifest.workflows.comm_batch_service,'once',true);
 g.code('Batch Result',safe+`const r=$input.first().json;if(r.ok===true&&r.committed===true&&r.response?.body?.ok===true&&[200,201].includes(r.response.http_status))return [{json:{response:r.response}}];return [{json:{response:fail('COMM_WRITE_NOT_CONFIRMED')}}];`);
 g.code('Final Response',safe+`const x=$input.first().json,r=x.response||x;return [{json:r.body&&Number.isInteger(r.http_status)?r:fail('COMM_INTERNAL_ERROR')}];`);
 g.table('Release Writer','LOCKS','update',[['lock_key','command-writer'],['owner',ex('String($execution.id)')]],{owner:'',lease_until:'1970-01-01T00:00:00.000Z'});
 g.code('Return',`return [{json:${ref('Final Response')}}];`);
 g.code('Early Return',safe+`const x=$input.first().json,r=x.response||x;return [{json:r.body&&Number.isInteger(r.http_status)?r:fail('COMM_INTERNAL_ERROR')}];`);
 g.chain('Input','Validate Header','Header Valid');g.link('Header Valid','Hash Session');g.link('Header Valid','Early Return',1);
 g.chain('Hash Session','Read Session','Session Check','Session Valid');g.link('Session Valid','Read Actor');g.link('Session Valid','Early Return',1);
 g.chain('Read Actor','Authorization Input','Authorize Request','Authorized');g.link('Authorized','Hash Intent');g.link('Authorized','Early Return',1);
 g.chain('Hash Intent','Acquire Writer','Owns Writer');g.link('Owns Writer','Read Pending');g.link('Owns Writer','Busy',1);g.link('Busy','Early Return');
 g.chain('Read Pending','Read Prior','Read Global','Read Config','Context','Context Valid');g.link('Context Valid','Prepare Input');g.link('Context Valid','Final Response',1);
 g.chain('Prepare Input','Prepare','Needs People');g.link('Needs People','Read Active Employees');g.link('Needs People','Needs Receipt',1);
 g.chain('Read Active Employees','Read Open Attendance','People Input','Plan People','Has Batch');
 g.link('Needs Receipt','Read Delivery');g.link('Needs Receipt','Needs Page',1);g.chain('Read Delivery','Receipt Input','Plan Receipt','Has Batch');
 g.link('Needs Page','Read Page');g.link('Needs Page','Has Batch',1);g.chain('Read Page','Page Input','Build Page','Has Batch');
 g.link('Has Batch','Batch Input');g.link('Has Batch','Final Response',1);g.chain('Batch Input','Execute Batch','Batch Result','Final Response','Release Writer','Return');return g;
}
export function publicAPI(path,operation,method,serviceId=candidateIds.service){
 const g=graph('API COMM '+operation,180);
 g.node('Webhook','webhook',{httpMethod:method,path:'mol-app-v2-'+path,responseMode:'responseNode',options:{allowedOrigins:'https://atybus-create.github.io'}},{webhookId:'mol-v2-comm-'+operation.toLowerCase()});
 g.code('Request',`const i=$input.first().json;return [{json:{operation:'${operation}',authorization:i.headers?.authorization||'',${method==='GET'?'query:i.query||{}':'body:i.body||{}'}}}];`);
 g.execute('API Service',serviceId,'once',true);
 g.code('Public Result',safe+`const r=$input.first().json;return [{json:r.body&&Number.isInteger(r.http_status)&&r.http_status>=200&&r.http_status<=599?r:fail('COMM_INTERNAL_ERROR')}];`);
 g.node('Respond','respondToWebhook',{respondWith:'json',responseBody:ex('$json.body'),options:{responseCode:ex('$json.http_status'),responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'}]}}});
 g.chain('Webhook','Request','API Service','Public Result','Respond');return g;
}
export function buildAPI(ids=candidateIds){return {
 'comm-api-rules':apiRules(),'comm-api-service':apiService(ids.rules),
 'leader-message':publicAPI('leader-message','SEND','POST',ids.service),
 'message-shown':publicAPI('message-shown','SHOWN','POST',ids.service),
 'message-ack':publicAPI('message-ack','ACK','POST',ids.service),
 'messages':publicAPI('messages','LIST','GET',ids.service),
 'leader-message-recipients':publicAPI('leader-message-recipients','RECIPIENTS','GET',ids.service)};}
if(process.argv[1]?.endsWith('/communication/build-api-candidate.mjs')){
 const target=new URL('./candidate-workflows/',import.meta.url);mkdirSync(target,{recursive:true});
 for(const [name,g]of Object.entries(buildAPI())){writeFileSync(new URL(name+'.json',target),JSON.stringify(g,null,2)+'\n');console.log(name+': '+g.nodes.length+' nodes; CANDIDATE ONLY');}
}
