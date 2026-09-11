import {graph,ex,manifest} from './graph.mjs';
export function metricsApi(kind){
 const ids={worker_status:'c1bbd8c0-d097-4523-8a95-fdbdff01d380',norms_daily:'eefa7c76-d95e-4c3f-9601-66fe5571c09f',norms_monthly:'e1397ab6-3961-4c03-a32f-d8a6856752a9'};
 if(!ids[kind])throw Error('API_KIND_INVALID');const g=graph('API '+kind.replaceAll('_',' ').toUpperCase(),60);
 g.node('Webhook','webhook',{httpMethod:'GET',path:'mol-app-v2-'+kind.replaceAll('_','-'),responseMode:'responseNode',options:{allowedOrigins:'https://atybus-create.github.io'}},{webhookId:ids[kind]});
 const prefix="const q=$input.first().json.query||{},i=$input.first().json;";
 const request={
 worker_status:"const fields=['work_date','month','employee_id'];const body=Object.keys(q).some(k=>!fields.includes(k))||Object.values(q).some(v=>typeof v!=='string')?{invalid_query:true}:{...q};",
 norms_daily:"const fields=['date','employee_id'];const body=Object.keys(q).some(k=>!fields.includes(k))||Object.values(q).some(v=>typeof v!=='string')?{invalid_query:true}:{work_date:q.date||'invalid',...(q.employee_id?{employee_id:q.employee_id}:{})};",
 norms_monthly:String.raw`const fields=['month','employee_id'];let body={invalid_query:true};if(!Object.keys(q).some(k=>!fields.includes(k))&&!Object.values(q).some(v=>typeof v!=='string')){const valid=/^\d{4}-(0[1-9]|1[0-2])$/.test(q.month||''),today=DateTime.now().setZone('Europe/Warsaw').toISODate();body={month:q.month||'invalid',work_date:valid?(q.month===today.slice(0,7)?today:DateTime.fromISO(q.month+'-01').endOf('month').toISODate()):'invalid',...(q.employee_id?{employee_id:q.employee_id}:{})};}`
 };
 g.code('Request',prefix+request[kind]+"return [{json:{operation:'WORKER_STATUS',authorization:i.headers?.authorization||'',body}}];");g.execute('Service',manifest.workflows.attendance_service);delete g.nodes.at(-1).parameters.mode;
 g.code('Select',kind==='worker_status'?'return $input.all();':`let result=$input.first().json;if(result.body?.ok===true)result={...result,body:{...result.body,data:result.body.data.${kind==='norms_daily'?'norm':'monthly_norm'}}};return [{json:result}];`);
 g.node('Respond','respondToWebhook',{respondWith:'json',responseBody:ex('$json.body'),options:{responseCode:ex('$json.http_status'),responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'}]}}});g.chain('Webhook','Request','Service','Select','Respond');return g;
}
