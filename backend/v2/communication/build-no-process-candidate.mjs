import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {graph} from '../metrics/graph.mjs';
const root=new URL('./',import.meta.url);
function bundle(file,replace={}){
 let text=readFileSync(new URL(file,root),'utf8');
 for(const [from,to]of Object.entries(replace)){if(!text.includes(from))throw Error('BUNDLE_SOURCE_CHANGED: '+file);text=text.replace(from,to);}
 return `(function(){const module={exports:{}};${text}\nreturn module.exports;})()`;
}
export function build(){
 const g=graph('COMM NO PROCESS RULES CANDIDATE',30);g.input();
 const source=`const D=${bundle('domain.cjs')};\nconst A=${bundle('api-domain.cjs',{"const D = require('./domain.cjs');":''})};\nconst M=${bundle('../metrics/domain.cjs')};\nconst N=${bundle('no-process.cjs',{"const D=require('./domain.cjs'),A=require('./api-domain.cjs');":'',"const {processTimes}=require('../metrics/domain.cjs');":'const {processTimes}=M;'})};\n`;
 // Only an internal trigger, with server-owned time. This returns a plan; it
 // does not acquire a lock or execute writes. Do not wire to a public webhook.
 g.code('Evaluate',source+`const i=$input.first().json,now=new Date().toISOString();try{const cfg=D.configFromRows(i.config_rows||[]),gate=D.ruleGate(cfg,'NO_PROCESS');if(!gate.evaluate)return [{json:{ok:true,candidate:true,status:'DISABLED',reason:gate.reason,plan:{execute:false}}}];const records=i.records||[],o=N.observation({...i.source,now}),decision=N.decide({config_rows:i.config_rows,observation:o,episodes:N.episodesFromRecords(records),now});const plan=N.planBatch({decision,records,request_id:i.request_id,payload_hash:i.payload_hash,lock_owner:i.lock_owner,now});return [{json:{ok:true,candidate:true,decision,plan}}];}catch(e){return [{json:{ok:false,candidate:true,error_code:typeof e.code==='string'?e.code:'COMM_ALERT_INTERNAL_ERROR',plan:{execute:false}}}];}`);
 g.link('Input','Evaluate');return g;
}
if(process.argv[1]?.endsWith('/communication/build-no-process-candidate.mjs')){
 const target=new URL('./rule-candidates/',import.meta.url);mkdirSync(target,{recursive:true});
 writeFileSync(new URL('no-process-rules.json',target),JSON.stringify(build(),null,2)+'\n');
 console.log('NO_PROCESS internal rule graph generated. LOCAL ONLY; no writes or scheduler.');
}
