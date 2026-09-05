import {readFileSync} from 'node:fs';
import {graph} from './graph.mjs';
export function metricsRules(){const g=graph('METRICS RULES',30);g.input();
 const source=readFileSync(new URL('./domain.cjs',import.meta.url),'utf8').replace(/\nmodule\.exports=[^\n]+;?\s*$/,'\n');
 g.code('Calculate',source+`\nconst i=$input.first().json;
try {
 if(i.kind==='ES_FREEZE')return [{json:{plan:freezeESBatch({...i.input,boundary:boundaryFromCommand(i.boundary_command,i.boundary_attendance||i.input.attendance,i.input.processes)}),recovery:false,attempts:1}}];
 if(i.kind==='SUMMARY'){
  const previous=json(i.previous_month?.payload_json),d=dailySummary({...i.input,previous:previous?.days?.find(x=>x.work_date===i.input.work_date),mapping_error:mappingStatus(i.employees).find(x=>x.employee_id===i.input.employee_id)?.error_code||null});
  const publication=publishMonth(i.previous_month||null,d,i.input.now),p=json(publication.payload_json);
  return [{json:{ok:true,publication,daily:p.days.find(x=>x.work_date===i.input.work_date),monthly:p.monthly}}];
 }
 return [{json:{ok:false,error_code:'METRICS_OPERATION_INVALID'}}];
} catch(e) {return [{json:{ok:false,error_code:e.code||'METRICS_INPUT_INVALID'}}];}\n`);
 g.link('Input','Calculate');return g;}
if(process.argv[1]?.endsWith('/build-rules.mjs'))console.log(JSON.stringify(metricsRules(),null,2));
