import {readFileSync,writeFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {metricsAttendance} from './build-attendance.mjs';import {recordWriter} from './build-writer.mjs';import {taskAck} from './build-ack.mjs';import {summaryRecalculator} from './build-summary.mjs';import {esIngest} from './build-ingest.mjs';import {esReport} from './build-es-report.mjs';import {metricsRules} from './build-rules.mjs';import {metricsScheduler} from './build-scheduler.mjs';import {metricsApi} from './build-api.mjs';
const dir=new URL('../workflows/',import.meta.url);const outputs={
 'attendance-service':metricsAttendance(),'metrics-record-writer':recordWriter(),'metrics-task-ack':taskAck(),
 'summary-recalculator':summaryRecalculator(),'es-ingest':esIngest(),'es-report-read':esReport(),
 'metrics-rules':metricsRules(),'metrics-scheduler':metricsScheduler(),
 'worker-status':metricsApi('worker_status'),'norms-daily':metricsApi('norms_daily'),'norms-monthly':metricsApi('norms_monthly')};
for(const [name,args]of [['norm-mirror-rules',['rules']],['norm-drive',[]]])outputs[name]=JSON.parse(execFileSync(process.execPath,[new URL('./build-mirror.mjs',import.meta.url).pathname,...args],{encoding:'utf8'}));
// The shared V2 handler keeps its existing recovery logic and adds only this lock.
const error=JSON.parse(readFileSync(new URL('error-handler.json',dir)));
if(!error.nodes.some(n=>n.name==='Release Failed Norm Writer')){
 const node=structuredClone(error.nodes.find(n=>n.name==='Release Failed Auth Writer'));
 node.id='release-failed-norm-writer';node.name='Release Failed Norm Writer';node.position=[1344,0];node.parameters.filters.conditions.find(c=>c.keyName==='lock_key').keyValue='norm-drive-writer';error.nodes.push(node);
 error.connections['Requeue Failed Job']={main:[[{node:node.name,type:'main',index:0}]]};
}outputs['error-handler']=error;
for(const [name,w]of Object.entries(outputs)){writeFileSync(new URL(name+'.json',dir),JSON.stringify(w,null,2)+'\n');console.log(name+': '+w.nodes.length+' nodes');}
