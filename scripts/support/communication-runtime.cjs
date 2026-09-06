'use strict';
// Explicit n8n graph model for local testing only. No network or real credentials.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const clone=x=>JSON.parse(JSON.stringify(x));
const manifest=JSON.parse(fs.readFileSync('backend/v2/manifest.json','utf8'));
const T=name=>manifest.tables['MOL_V2_'+name];
const stamp='2026-09-05T21:30:00.000Z';
const token=id=>crypto.createHash('sha256').update('LOCAL-ONLY-FIXTURE-'+id).digest('hex');
class Runtime{
 constructor(){
  this.now=stamp;this.sequence=1000;this.ids=100;this.calls=[];this.fault=null;this.workflows=new Map();
  for(const name of ['comm-api-rules','comm-api-service','leader-message','message-shown','message-ack','messages','leader-message-recipients'])this.workflows.set(name,JSON.parse(fs.readFileSync('backend/v2/communication/candidate-workflows/'+name+'.json','utf8')));
  this.workflows.set('CANDIDATE_COMM_API_RULES',this.workflows.get('comm-api-rules'));
  this.workflows.set('CANDIDATE_COMM_API_SERVICE',this.workflows.get('comm-api-service'));
  for(const [id,file]of [[manifest.workflows.comm_batch_service,'comm-batch-service'],[manifest.workflows.comm_record_writer,'comm-record-writer']])this.workflows.set(id,JSON.parse(fs.readFileSync('backend/v2/workflows/'+file+'.json','utf8')));
  this.tables=new Map();for(const id of Object.values(manifest.tables))this.tables.set(id,[]);
  this.rows('LOCKS').push({id:1,lock_key:'command-writer',owner:'',lease_until:'1970-01-01T00:00:00.000Z'});
  const config=JSON.parse(fs.readFileSync('backend/v2/communication/config.initial.json','utf8'));config.mode='LIVE';config.manual_enabled=true;
  this.rows('CONFIG').push({id:1,key:'WRITES_ENABLED',value_json:'true'},{id:2,key:'COMMUNICATIONS_CONFIG',value_json:JSON.stringify(config)});
  this.addPerson('MOL004','WORKER');this.addPerson('MOL014','LEADER');this.addPerson('MOL015','ADMIN');
 }
 rows(name){const rows=this.tables.get(T(name)||name);assert.ok(rows,'unknown table '+name);return rows;}
 addPerson(id,role){this.rows('EMPLOYEES').push({id:this.ids++,employee_id:id,display_name:'Fixture '+id,role,active:true,password_hash:'NOT_A_REAL_HASH',es_worker_id:'private-fixture',moniti_worker_id:'private-fixture'});this.rows('SESSIONS').push({id:this.ids++,session_id:'local:'+id,employee_id:id,token_hash:crypto.createHash('sha256').update(token(id)).digest('hex'),expires_at:'2026-09-06T21:30:00.000Z',revoked_at:null});this.rows('ATTENDANCE').push({id:this.ids++,attendance_id:id+':2026-09-05',employee_id:id,state:'OPEN',start_at:'2026-09-05T07:00:00.000Z',stop_at:null});}
 async run(key,input,executionId=String(this.sequence++)){
  const w=this.workflows.get(key);assert.ok(w,'unknown workflow '+key);const by=new Map(w.nodes.map(n=>[n.name,n])),outputs=new Map();let name=by.has('Input')?'Input':'Webhook',items=clone(input),visits=0;
  while(name){
   assert.ok(++visits<120,'unexpected graph loop');const n=by.get(name);assert.ok(n,'missing node '+name);await new Promise(r=>setImmediate(r));
   const lookup=label=>{assert.ok(outputs.has(label),'read before execution '+label);const a=outputs.get(label);return{first:()=>({json:a[0]||{}}),all:()=>a.map(json=>({json}))};};
   const current=this.now;class Clock extends Date{constructor(...a){super(...(a.length?a:[current]));}static now(){return Date.parse(current);}}
   const nowObj={toISO:()=>current,plus:o=>({toISO:()=>new Date(Date.parse(current)+(o.seconds||0)*1000).toISOString()})};
   const evaluate=v=>typeof v==='string'&&v.startsWith('={{ ')?new Function('$','$json','$execution','$now','return ('+v.slice(4,-3)+')')(lookup,items[0]||{},{id:executionId},nowObj):v;
   let out,port=0;
   try{
    switch(n.type){
     case 'n8n-nodes-base.webhook':case 'n8n-nodes-base.executeWorkflowTrigger':out=items;break;
     case 'n8n-nodes-base.code':out=await new Function('$','$input','$execution','$now','Date','Buffer',n.parameters.jsCode)(lookup,{first:()=>({json:items[0]||{}}),all:()=>items.map(json=>({json}))},{id:executionId},nowObj,Clock,Buffer);out=out.map(x=>x.json);break;
     case 'n8n-nodes-base.if':port=evaluate(n.parameters.conditions.conditions[0].leftValue)===true?0:1;out=items;break;
     case 'n8n-nodes-base.crypto':out=[{...items[0],[n.parameters.dataPropertyName]:crypto.createHash('sha256').update(evaluate(n.parameters.value)).digest('hex')}];break;
     case 'n8n-nodes-base.dataTable':{
      const p=n.parameters,table=this.rows(p.dataTableId.value),f=evaluate(p.filters)?.conditions||[],l=evaluate(p.limit)||50;
      const test=(row,c)=>{const a=row[c.keyName],b=evaluate(c.keyValue)??'';switch(c.condition||'eq'){case 'eq':return a===b;case 'gt':return a>b;case 'gte':return a>=b;case 'lt':return a<b;case 'lte':return a<=b;default:throw Error('unsupported condition '+c.condition);}};
      let selected=table.filter(row=>p.matchType==='anyCondition'?f.some(c=>test(row,c)):f.every(c=>test(row,c)));
      if(p.operation==='get'){
       assert.notEqual(p.returnAll,true,'unbounded read in candidate');
       if(p.orderBy){const col=p.orderByColumn,dir=evaluate(p.orderByDirection)==='DESC'?-1:1;selected.sort((a,b)=>(a[col]<b[col]?-1:a[col]>b[col]?1:0)*dir);}
       out=clone(selected.slice(0,l));this.calls.push({workflow:w.name,node:name,operation:'get',table:p.dataTableId.value,limit:l,returned:out.length,filters:clone(f.map(c=>({...c,keyValue:evaluate(c.keyValue)})))});
      }else{
       assert.ok(['update','upsert'].includes(p.operation));const values=Object.fromEntries(Object.entries(p.columns.value).map(([k,v])=>[k,evaluate(v)]));
       if(selected.length){for(const row of selected)Object.assign(row,clone(values));out=clone(selected);}
       else if(p.operation==='upsert'){const row={id:this.ids++,createdAt:current,updatedAt:current,...clone(values)};table.push(row);out=[clone(row)];}else out=[];
       this.calls.push({workflow:w.name,node:name,operation:p.operation,table:p.dataTableId.value,returned:out.length,owner:executionId});
      }
      if(!out.length&&n.alwaysOutputData)out=[{}];break;
     }
     case 'n8n-nodes-base.executeWorkflow':{
      const id=evaluate(n.parameters.workflowId.value);out=[];
      if(n.parameters.mode==='each')for(const item of items)out.push(...await this.run(id,[item]));else out=await this.run(id,items);break;
     }
     case 'n8n-nodes-base.respondToWebhook':out=[{status:evaluate(n.parameters.options.responseCode),body:evaluate(n.parameters.responseBody)}];break;
     default:throw Error('unsupported node '+n.type);
    }
    if(this.fault&&this.fault.workflow===w.name&&this.fault.node===name){if(--this.fault.remaining<=0){this.fault=null;throw Error('LOCAL_CRASH_AFTER_'+name);}}
   }catch(e){if(n.onError==='continueRegularOutput')out=[{error:{message:e.message}}];else throw e;}
   outputs.set(name,clone(out));const links=w.connections[name]?.main?.[port]||[];assert.ok(links.length<=1,'unexpected fan-out');name=links[0]?.node;items=out;
  }
  return items;
 }
 async request(route,{actor='MOL014',body={},query={},authorization}={}){return (await this.run(route,[{headers:{authorization:authorization??'Bearer '+token(actor)},body,query}]))[0];}
}
let serial=1;
const requestId=()=> '88330000-0000-4000-8000-'+String(serial++).padStart(12,'0');
const send=(recipient_ids=['MOL004'],content='Local fixture')=>({request_id:requestId(),recipient_ids,content,ack_required:true});
module.exports={Runtime,requestId,send,token,T,manifest,clone};
