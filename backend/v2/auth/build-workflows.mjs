import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const bundle = readFileSync(new URL('./password.bundle.js', import.meta.url), 'utf8');
const ids = { employees:'npCr4h1LjhVL205w', sessions:'JXNEIdijeKfhuwYD', locks:'uKfyrOkB2zoSEuBH', limits:'XNQosSJXp23l2EBU', receipts:'sbWYwBwKoktbD3Yf' };
const credentials = { crypto: { id:'79mc2IFYLaJLMrgJ', name:'MOL V2 AUTH receipt encryption' } };
const settings = { executionOrder:'v1', timezone:'Europe/Warsaw', executionTimeout:60, saveDataSuccessExecution:'none', saveDataErrorExecution:'none', saveManualExecutions:false, errorWorkflow:'rnELTCKClbzY8lxZ' };
const ex = text => `={{ ${text} }}`;
const ref = name => `$('${name}').first().json`;
const uuid = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';
const prelude = `const result=(status,code,message,request_id='')=>({http_status:status,body:{ok:false,request_id,error:{code,message},meta:{api_version:'2.0',server_time:new Date().toISOString()}}});\n`;
class Graph {
  constructor(name) { this.name=name; this.nodes=[]; this.connections={}; this.settings=settings; }
  node(name,type,parameters,extra={}) { this.nodes.push({id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,type:'n8n-nodes-base.'+type,typeVersion:({code:2,dataTable:1.1,webhook:2.1,respondToWebhook:1.5,if:2.2,crypto:2})[type],position:[this.nodes.length*240,0],parameters,...extra}); return name; }
  code(name,code) { return this.node(name,'code',{mode:'runOnceForAllItems',jsCode:prelude+code}); }
  link(a,b,branch=0) { const main=(this.connections[a]??={main:[]}).main; while(main.length<=branch)main.push([]); main[branch].push({node:b,type:'main',index:0}); }
  chain(...names) { for(let i=1;i<names.length;i++)this.link(names[i-1],names[i]); }
  test(name,expr) { return this.node(name,'if',{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:name,leftValue:ex(expr),rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}}); }
  table(name,table,operation,filters=[],values={}) { const parameters={resource:'row',operation,dataTableId:{__rl:true,mode:'id',value:ids[table]},matchType:'allConditions',filters:{conditions:filters.map(([keyName,keyValue])=>({keyName,condition:'eq',keyValue}))},options:{}};
    if(operation==='get')Object.assign(parameters,{returnAll:false,limit:2});
    else parameters.columns={mappingMode:'defineBelow',value:values,matchingColumns:[],schema:[],attemptToConvertTypes:false,convertFieldsToString:false};
    return this.node(name,'dataTable',parameters,{alwaysOutputData:true}); }
  webhook(method,path) { this.node('Webhook','webhook',{httpMethod:method,path,responseMode:'responseNode',options:{allowedOrigins:'https://atybus-create.github.io'}},{webhookId:randomUUID()}); }
  respond() { this.node('Respond','respondToWebhook',{respondWith:'json',responseBody:ex('$json.body'),options:{responseCode:ex('$json.http_status'),responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'},{name:'Pragma',value:'no-cache'}]}}}); }
  lock() {
    this.table('Acquire Auth Lock','locks','update',[['lock_key','auth-writer'],['owner','']],{owner:ex('String($execution.id)'),lease_until:ex('$now.plus({seconds:60}).toISO()')});
    this.test('Own Lock',`$json.owner === String($execution.id)`);
    this.code('Busy',`return [{json:result(409,'AUTH_BUSY','Trwa inne żądanie. Spróbuj ponownie.',${ref('Validate Input')}.request_id)}];`);
    this.table('Release Auth Lock','locks','update',[['lock_key','auth-writer'],['owner',ex('String($execution.id)')]],{owner:'',lease_until:'1970-01-01T00:00:00.000Z'});
    this.code('Final Response',`return [{json:${ref('Prepare Response')}}];`);
    this.chain('Acquire Auth Lock','Own Lock'); this.link('Own Lock','Busy',1); this.link('Busy','Respond');
    this.chain('Prepare Response','Release Auth Lock','Final Response','Respond');
  }
  hash(name,value) { this.node(name,'crypto',{action:'hash',type:'SHA256',binaryData:false,value:ex(value),dataPropertyName:'token_hash',encoding:'hex'}); }
}

function login() {
  const g=new Graph('MOL // APP V2 // AUTH LOGIN'); g.webhook('POST','mol-app-v2-auth-login'); g.respond();
  g.code('Validate Input',`const b=$input.first().json.body||{};const valid=typeof b.request_id==='string'&&${uuid}.test(b.request_id||'')&&typeof b.login==='string'&&b.login.trim().length>0&&b.login.length<=100&&typeof b.password==='string'&&b.password.length>0&&b.password.length<=200;return [{json:valid?{valid:true,request_id:b.request_id.toLowerCase(),login:b.login.trim().toLowerCase(),password:b.password}:result(400,'VALIDATION_ERROR','Podaj login i hasło oraz poprawny request_id.')}];`);
  g.test('Input Valid','$json.valid === true'); g.lock();
  g.chain('Webhook','Validate Input','Input Valid');g.link('Input Valid','Acquire Auth Lock');g.link('Input Valid','Respond',1);
  g.table('Read Employee','employees','get',[['login',ex(ref('Validate Input')+'.login')]]);
  g.code('Employee Context',`const rows=$input.all().map(i=>i.json).filter(r=>r.employee_id);const employee=rows.length===1?rows[0]:null;return [{json:{employee,limit_key:employee?.employee_id||'_unknown'}}];`);
  g.table('Read Limit','limits','get',[['limit_key',ex(ref('Employee Context')+'.limit_key')]]);
  g.code('Check Limit',`const rows=$input.all().map(i=>i.json).filter(r=>r.limit_key);const row=rows[0]||{};const now=Date.now();const fresh=Number.isFinite(Date.parse(row.window_start))&&now-Date.parse(row.window_start)<900000;const attempts=fresh?Number(row.attempts):0;if(rows.length>1||!Number.isFinite(attempts))return [{json:result(503,'AUTH_UNAVAILABLE','Logowanie chwilowo niedostępne.')}];if(attempts>=5)return [{json:result(429,'RATE_LIMITED','Za dużo prób. Spróbuj po 15 minutach.',${ref('Validate Input')}.request_id)}];return [{json:{allowed:true,attempts:attempts+1,window_start:fresh?row.window_start:new Date(now).toISOString()}}];`);
  g.test('Limit Allows','$json.allowed === true');
  g.table('Count Attempt','limits','upsert',[['limit_key',ex(ref('Employee Context')+'.limit_key')]],{limit_key:ex(ref('Employee Context')+'.limit_key'),attempts:ex(ref('Check Limit')+'.attempts'),window_start:ex(ref('Check Limit')+'.window_start')});
  g.code('Verify Password',bundle+`\nconst e=${ref('Employee Context')}.employee;const input=${ref('Validate Input')};const matches=MolPassword.verifyPassword(input.password,e?.password_hash);if(!matches||e?.active!==true||!['WORKER','LEADER','ADMIN'].includes(e?.role))return [{json:result(401,'INVALID_CREDENTIALS','Nieprawidłowy login lub hasło.',input.request_id)}];return [{json:{verified:true,user:{employee_id:e.employee_id,display_name:e.display_name,role:e.role}}}];`);
  g.test('Password Valid','$json.verified === true');
  g.table('Read Receipt','receipts','get',[['request_id',ex(ref('Validate Input')+'.request_id')]]);
  g.code('Receipt State',`const rows=$input.all().map(i=>i.json).filter(r=>r.request_id);const row=rows[0];if(rows.length>1)return [{json:result(503,'AUTH_UNAVAILABLE','Niespójne dane sesji.')}];if(row&&(row.employee_id!==${ref('Verify Password')}.user.employee_id))return [{json:result(409,'REQUEST_ID_CONFLICT','Użyj nowego identyfikatora logowania.')}];if(row&&!(Date.parse(row.expires_at)>Date.now()))return [{json:result(401,'SESSION_EXPIRED','Poprzednia sesja wygasła. Zaloguj się ponownie.')}];return [{json:{usable:true,exists:!!row,receipt:row||null}}];`);
  g.test('Receipt Usable','$json.usable === true');g.test('Receipt Exists','$json.exists === true');
  g.node('Generate Token','crypto',{action:'generate',dataPropertyName:'session_token',encodingType:'hex',stringLength:64});g.hash('Hash Token','$json.session_token');
  g.code('Build Login Response',`const token=$input.first().json.session_token;if(!/^[0-9a-f]{64}$/.test(token))throw new Error('TOKEN_GENERATION_FAILED');const expires_at=new Date(Date.now()+12*3600000).toISOString();const response={ok:true,request_id:${ref('Validate Input')}.request_id,data:{session_token:token,expires_at,user:${ref('Verify Password')}.user},meta:{api_version:'2.0',server_time:new Date().toISOString()}};return [{json:{response,expires_at,token_hash:$input.first().json.token_hash}}];`);
  g.node('Encrypt Receipt','crypto',{action:'encrypt',mode:'symmetric',cipher:'aes-256-gcm',value:ex('JSON.stringify($json.response)'),dataPropertyName:'encrypted_response'},{credentials});
  g.table('Store Receipt','receipts','insert',[],{request_id:ex(ref('Validate Input')+'.request_id'),employee_id:ex(ref('Verify Password')+'.user.employee_id'),encrypted_response:ex('$json.encrypted_response'),token_hash:ex(ref('Build Login Response')+'.token_hash'),expires_at:ex(ref('Build Login Response')+'.expires_at')});
  g.code('Receipt Context',`const input=$input.first().json;return [{json:input.receipt||input}];`);
  g.table('Read Issued Session','sessions','get',[['session_id',ex(ref('Validate Input')+'.request_id')]]);
  g.code('Issued Session State',`const rows=$input.all().map(i=>i.json).filter(r=>r.session_id);const s=rows[0];const r=${ref('Receipt Context')};if(rows.length>1||s&&(s.token_hash!==r.token_hash||s.employee_id!==r.employee_id))return [{json:result(503,'AUTH_UNAVAILABLE','Niespójne dane sesji.')}];if(s&&(s.revoked_at||!(Date.parse(s.expires_at)>Date.now())))return [{json:result(401,'SESSION_EXPIRED','Sesja została zakończona. Zaloguj się ponownie.')}];return [{json:{usable:true,exists:!!s}}];`);
  g.test('Issued Session Usable','$json.usable === true');g.test('Session Exists','$json.exists === true');
  g.table('Insert Session','sessions','insert',[],{session_id:ex(ref('Validate Input')+'.request_id'),employee_id:ex(ref('Receipt Context')+'.employee_id'),token_hash:ex(ref('Receipt Context')+'.token_hash'),expires_at:ex(ref('Receipt Context')+'.expires_at'),last_seen_at:ex('$now.toISO()')});
  g.node('Decrypt Receipt','crypto',{action:'decrypt',mode:'symmetric',cipher:'aes-256-gcm',value:ex(ref('Receipt Context')+'.encrypted_response'),dataPropertyName:'clear_response'},{credentials});
  g.table('Reset Limit','limits','update',[['limit_key',ex(ref('Employee Context')+'.limit_key')]],{attempts:0,window_start:ex('$now.toISO()')});
  g.code('Login Success',`return [{json:{http_status:200,body:JSON.parse(${ref('Decrypt Receipt')}.clear_response)}}];`);
  g.code('Prepare Response','return $input.all();');
  g.link('Own Lock','Read Employee');g.chain('Read Employee','Employee Context','Read Limit','Check Limit','Limit Allows');g.link('Limit Allows','Count Attempt');g.link('Limit Allows','Prepare Response',1);
  g.chain('Count Attempt','Verify Password','Password Valid');g.link('Password Valid','Read Receipt');g.link('Password Valid','Prepare Response',1);
  g.chain('Read Receipt','Receipt State','Receipt Usable');g.link('Receipt Usable','Receipt Exists');g.link('Receipt Usable','Prepare Response',1);
  g.link('Receipt Exists','Receipt Context');g.link('Receipt Exists','Generate Token',1);
  g.chain('Generate Token','Hash Token','Build Login Response','Encrypt Receipt','Store Receipt','Receipt Context','Read Issued Session','Issued Session State','Issued Session Usable');
  g.link('Issued Session Usable','Session Exists');g.link('Issued Session Usable','Prepare Response',1);g.link('Session Exists','Decrypt Receipt');g.link('Session Exists','Insert Session',1);
  g.chain('Insert Session','Decrypt Receipt','Reset Limit','Login Success','Prepare Response');
  return g;
}

function session(logout=false) {
  const g=new Graph('MOL // APP V2 // AUTH '+(logout?'LOGOUT':'SESSION'));g.webhook(logout?'POST':'GET','mol-app-v2-auth-'+(logout?'logout':'session'));g.respond();
  g.code('Validate Input',`const i=$input.first().json;const authorization=i.headers?.authorization||'';const m=/^Bearer ([0-9a-f]{64})$/.exec(authorization);const request_id=i.body?.request_id||'';if(${logout}&&(typeof request_id!=='string'||!${uuid}.test(request_id)))return [{json:result(400,'VALIDATION_ERROR','Nieprawidłowy request_id.')}];return [{json:m?{valid:true,session_token:m[1],request_id}:result(401,'UNAUTHENTICATED','Zaloguj się ponownie.',request_id)}];`);
  g.test('Input Valid','$json.valid === true');g.chain('Webhook','Validate Input','Input Valid');g.link('Input Valid','Respond',1);
  if(logout){g.lock();g.link('Input Valid','Acquire Auth Lock');g.link('Own Lock','Hash Token');}else g.link('Input Valid','Hash Token');
  g.hash('Hash Token',ref('Validate Input')+'.session_token');
  g.table('Read Session','sessions','get',[['token_hash',ex('$json.token_hash')]]);
  g.code('Check Session',`const rows=$input.all().map(i=>i.json).filter(r=>r.session_id);const s=rows[0];if(rows.length!==1||(!${logout}&&(s.revoked_at||!(Date.parse(s.expires_at)>Date.now()))))return [{json:result(401,'UNAUTHENTICATED','Sesja wygasła lub została zakończona.',${ref('Validate Input')}.request_id)}];return [{json:{valid:true,session:s}}];`);
  g.test('Session Valid','$json.valid === true');g.chain('Hash Token','Read Session','Check Session','Session Valid');g.link('Session Valid',logout?'Check Revoked':'Read Employee');g.link('Session Valid',logout?'Prepare Response':'Respond',1);
  if(logout){
    g.test('Check Revoked','!!$json.session.revoked_at');g.link('Check Revoked','Logout Success');g.link('Check Revoked','Revoke Session',1);
    g.table('Revoke Session','sessions','update',[['session_id',ex(ref('Check Session')+'.session.session_id')],['token_hash',ex(ref('Hash Token')+'.token_hash')]],{revoked_at:ex('$now.toISO()')});
    g.code('Logout Success',`const s=$input.first().json.session||$input.first().json;return [{json:{http_status:200,body:{ok:true,request_id:${ref('Validate Input')}.request_id,data:{logged_out:true},meta:{api_version:'2.0',server_time:s.revoked_at}}}}];`);
    g.code('Prepare Response','return $input.all();');g.chain('Revoke Session','Logout Success','Prepare Response');
  }else{
    g.table('Read Employee','employees','get',[['employee_id',ex(ref('Check Session')+'.session.employee_id')]]);
    g.code('Session Response',`const rows=$input.all().map(i=>i.json).filter(r=>r.employee_id);const e=rows[0];if(rows.length!==1||e.active!==true||!['WORKER','LEADER','ADMIN'].includes(e.role))return [{json:result(401,'UNAUTHENTICATED','Konto jest nieaktywne.')}];return [{json:{http_status:200,body:{ok:true,request_id:'',data:{expires_at:${ref('Check Session')}.session.expires_at,user:{employee_id:e.employee_id,display_name:e.display_name,role:e.role}},meta:{api_version:'2.0',server_time:new Date().toISOString()}}}}];`);
    g.chain('Read Employee','Session Response','Respond');
  }
  return g;
}

console.log(JSON.stringify({login:login(),session:session(),logout:session(true)}));
