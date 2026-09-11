import {readFileSync} from 'node:fs';
import {Graph} from '../attendance/build-workflows.mjs';
export const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url)));
export const ex=s=>`={{ ${s} }}`;
export const ref=n=>`$('${n}').first().json`;
export function graph(name,timeout=120){const g=new Graph(name);g.settings.executionTimeout=timeout;g.code=(n,jsCode)=>g.node(n,'code',{jsCode});
 const original=g.execute.bind(g);g.execute=(n,id,mode='once',ignore=false)=>{original(n,id);const x=g.nodes.at(-1);x.parameters.workflowInputs.convertFieldsToString=false;x.parameters.mode=mode;if(ignore)x.onError='continueRegularOutput';};
 g.input=()=>g.node('Input','executeWorkflowTrigger',{inputSource:'passthrough'});
 g.schedule=()=>g.node('Schedule','scheduleTrigger',{rule:{interval:[{field:'minutes',minutesInterval:1}]}},{typeVersion:1.2});
 g.config=()=>g.table('Read Config','CONFIG','get',[],{},true);
 g.dynamic=(n,table,key,value,operation='get')=>{g.table(n,'OUTBOX',operation,[[key,value]]);const x=g.nodes.at(-1);x.parameters.dataTableId.value=table;if(operation==='upsert')x.parameters.columns.mappingMode='autoMapInputData';};
 g.writer=(n,mode='once')=>g.execute(n,manifest.workflows.metrics_record_writer,mode);
 return g;
}
