import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Graph} from '../attendance/build-workflows.mjs';
const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url)));
const ex=s=>`={{ ${s} }}`;
const ref=n=>`$('${n}').first().json`;
// Preserve the accepted stage-6 generator unchanged; extend its complete process service.
export function metricsAttendance() {
 const base=JSON.parse(execFileSync(process.execPath,[new URL('../processes/build-workflows.mjs',import.meta.url).pathname],{encoding:'utf8'}));
 const g=Object.assign(new Graph('ATTENDANCE SERVICE'),base),node=n=>g.nodes.find(x=>x.name===n);
 const patch=(name,find,replace)=>{const p=node(name).parameters;if(!p.jsCode.includes(find))throw Error('Missing stage-7 source anchor: '+name);p.jsCode=p.jsCode.replace(find,replace);};
 const code=(name,jsCode)=>g.node(name,'code',{jsCode});
 patch('Validate Input',"op=i.operation;", "include_metrics=i.operation==='WORKER_STATUS',op=include_metrics?'STATUS':i.operation;");
 patch('Validate Input',"?['work_date','employee_id']:","?['work_date','employee_id',...(include_metrics?['month']:[])]:");
 patch('Validate Input',"const payload=",String.raw`const month=include_metrics?(b.month||work_date.slice(0,7)):null;if(include_metrics&&(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month>DateTime.now().setZone('Europe/Warsaw').toISODate().slice(0,7)))return [{json:fail(400,'INVALID_MONTH','Nieprawidlowy miesiac.')}];const payload=`);
 patch('Validate Input',"json:{valid:true,source:","json:{valid:true,include_metrics,month,source:");
 patch('Decide',"if(config.WRITES_ENABLED!==true)","const es_pending=$('Read Pending ES').all().map(x=>x.json).filter(x=>x.batch_id);if(es_pending.length&&(!old||es_pending.some(x=>x.batch_id!=='ESB-'+i.request_id)))return [{json:fail(503,'ES_RECOVERY_REQUIRED','Trwa odzyskiwanie poprzedniego odczytu ES.',i.request_id)}];if(config.WRITES_ENABLED!==true)");
 patch('Decide',"execute:true,plan,response,moniti_enabled,", "execute:true,plan,response,es_boundary_required:i.operation!=='CORRECT',moniti_enabled,");
 const intent=node('Save Intent').parameters.columns.value;
 intent.response_json=intent.response_json.replace("response:$('Decide').first().json.response,", "response:$('Decide').first().json.response,es_boundary_required:$('Decide').first().json.es_boundary_required===true,");
 g.table('Read Pending ES','ES_BATCHES','get',[['status','PREPARED']]);
 g.test('Include Metrics',"$('Validate Input').first().json.include_metrics === true");
 g.table('Read Norm Bundles','NORM_SNAPSHOTS','get',[
  ['summary_id',ex("$('Authorize').first().json.target+':'+$('Validate Input').first().json.payload.work_date.slice(0,7)")],
  ['summary_id',ex("$('Authorize').first().json.target+':'+$('Validate Input').first().json.month")]]);
 Object.assign(node('Read Norm Bundles').parameters,{matchType:'anyCondition',limit:4});
 g.table('Read Prior View','STATUS_SNAPSHOTS','get',[['view_id',ex("[$('Authorize').first().json.actor.employee_id,$('Authorize').first().json.target,$('Validate Input').first().json.payload.work_date,$('Validate Input').first().json.month].join(':')")]]);
 g.connections['Read Config']={main:[[{node:'Read Pending ES',type:'main',index:0}]]};
 g.chain('Read Pending ES','Include Metrics');g.link('Include Metrics','Read Norm Bundles');g.link('Include Metrics','Decide',1);g.chain('Read Norm Bundles','Read Prior View','Decide');
 g.test('ES Boundary Required',"$('Decide').first().json.es_boundary_required === true");
 code('ES Boundary Input',"return [{json:{origin:'BOUNDARY',lock_owner:String($execution.id),boundary_request_id:$('Validate Input').first().json.request_id}}];");
 g.execute('ES Boundary Capture',manifest.workflows.es_ingest);node('ES Boundary Capture').parameters.workflowInputs.convertFieldsToString=false;node('ES Boundary Capture').onError='continueRegularOutput';
 g.test('ES Boundary Confirmed',"$json.ok === true && $json.skipped !== true");
 g.table('Record ES Failure','COMMANDS','update',[['request_id',ex("$('Validate Input').first().json.request_id")]],{error_code:'ES_BOUNDARY_NOT_CONFIRMED',lease_owner:'',lease_until:'1970-01-01T00:00:00.000Z'});
 g.code('ES Failure Response',"return [{json:fail(503,'ES_BOUNDARY_NOT_CONFIRMED','Zapis granicy procesu wymaga dokonczenia. Ponow to samo zadanie.',$('Validate Input').first().json.request_id)}];");
 g.connections['Save Intent']={main:[[{node:'ES Boundary Required',type:'main',index:0}]]};
 g.link('ES Boundary Required','ES Boundary Input');g.link('ES Boundary Required','Moniti Required',1);g.chain('ES Boundary Input','ES Boundary Capture','ES Boundary Confirmed');g.link('ES Boundary Confirmed','Moniti Required');g.link('ES Boundary Confirmed','Record ES Failure',1);g.chain('Record ES Failure','ES Failure Response','Prepare Return');
 g.test('Publish Worker View',"$('Validate Input').first().json.include_metrics === true && $json.http_status === 200 && $json.body?.ok === true");
 const viewSource=readFileSync(new URL('./worker-view.cjs',import.meta.url),'utf8');
 code('Build Worker View',viewSource+"\ntry {const prior=$('Read Prior View').all().map(x=>x.json).filter(x=>x.view_id);if(prior.length>1)throw Error('VIEW_DUPLICATE');const actor=$('Authorize').first().json.actor,raw=$('Read Actor').first().json,cfg=$('Read Config').all().map(x=>x.json).find(x=>x.key==='ES_STALE_SECONDS');const result=assembleWorkerView({base:$('Decide').first().json.body.data,actor:{...actor,display_name:raw.display_name},month:$('Validate Input').first().json.month,bundles:$('Read Norm Bundles').all().map(x=>x.json).filter(x=>x.summary_id),previous:prior[0]||null,now:new Date().toISOString(),stale_seconds:cfg?Number(JSON.parse(cfg.value_json)):180});return [{json:{ok:true,...result}}];}catch{return [{json:{ok:false,error_code:'WORKER_VIEW_UNAVAILABLE'}}];}");
 code('View Write',"const v=$('Build Worker View').first().json;return [{json:v.ok!==true||!v.row?{noop:true,lock_owner:String($execution.id)}:{lock_owner:String($execution.id),table:'STATUS_SNAPSHOTS',mode:'replace',expected_version:v.row.version-1,row:v.row}}];");
 g.execute('Save View',manifest.workflows.metrics_record_writer);node('Save View').parameters.workflowInputs.convertFieldsToString=false;
 g.code('Worker View Response',"const v=$('Build Worker View').first().json;return [{json:v.ok===true?{http_status:200,body:{ok:true,request_id:'',data:v.data,meta:{api_version:'2.0',server_time:new Date().toISOString()}}}:fail(503,'WORKER_VIEW_UNAVAILABLE','Nie udalo sie odczytac spojnego stanu. Poprzednie dane pozostaja widoczne.')}];");
 g.connections.Execute.main[1]=[{node:'Publish Worker View',type:'main',index:0}];
 g.link('Publish Worker View','Build Worker View');g.link('Publish Worker View','Prepare Return',1);g.chain('Build Worker View','View Write','Save View','Worker View Response','Prepare Return');
 return g;
}
if(process.argv[1]?.endsWith('/metrics/build-attendance.mjs'))console.log(JSON.stringify(metricsAttendance(),null,2));
