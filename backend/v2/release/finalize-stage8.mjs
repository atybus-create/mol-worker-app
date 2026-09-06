import {readFileSync,writeFileSync} from 'node:fs';
const manifestUrl=new URL('../manifest.json',import.meta.url);
const indexUrl=new URL('../../../v2/index.html',import.meta.url);
const manifest=JSON.parse(readFileSync(manifestUrl,'utf8'));
if(manifest.workflows?.health!=='sfoWeuiJBN2qvCRF')throw Error('STAGE8_HEALTH_ID_CHANGED');
manifest.active_versions.health='5d289c40-b4cf-4695-9fe5-944bb2cec5c2';
manifest.release={...(manifest.release||{}),version:'0.8.0',stage:8,environment:'test',health_workflow_id:'sfoWeuiJBN2qvCRF',health_active_version:'5d289c40-b4cf-4695-9fe5-944bb2cec5c2',health_verified_at:'2026-09-06',frontend_status:'READY_FOR_MAIN'};
if(manifest.communication){manifest.communication.ui_implemented=true;manifest.communication.ui_published=false;}
writeFileSync(manifestUrl,JSON.stringify(manifest,null,2)+'\n');
let html=readFileSync(indexUrl,'utf8');
for(const [from,to] of [
 ['<strong>V2 0.8.0 RC</strong>','<strong>V2 0.8.0</strong>'],
 ['<small>gałąź etapu 8</small>','<small>wydanie testowe etapu 8</small>'],
 ['<footer>V2 0.8.0 RC · Etap 8','<footer>V2 0.8.0 · Etap 8']
]){
 if(!html.includes(from)&&!html.includes(to))throw Error('STAGE8_FRONTEND_RELEASE_ANCHOR_CHANGED: '+from);
 html=html.replace(from,to);
}
writeFileSync(indexUrl,html);
console.log('Stage 8 release metadata synchronized to 0.8.0 / stage 8.');
