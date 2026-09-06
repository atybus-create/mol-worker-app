import {readFileSync,writeFileSync} from 'node:fs';
const manifestUrl=new URL('../manifest.json',import.meta.url);
const indexUrl=new URL('../../../v2/index.html',import.meta.url);
const contractUrl=new URL('../communication/stage8b-live-contract.json',import.meta.url);
const manifest=JSON.parse(readFileSync(manifestUrl,'utf8'));
const contract=JSON.parse(readFileSync(contractUrl,'utf8'));
if(manifest.workflows?.health!=='sfoWeuiJBN2qvCRF')throw Error('STAGE8_HEALTH_ID_CHANGED');
manifest.active_versions.health='5d289c40-b4cf-4695-9fe5-944bb2cec5c2';
// Snapshot of the currently published Stage 5/8 attendance path. Keep this here so
// deterministic Stage 8 regeneration cannot restore pre-fix active-version metadata.
if(manifest.workflows?.attendance_service!=='qPVmcfp6pUg3GbzH'||manifest.workflows?.attendance_moniti!=='3e67SsUOByUi17YV')throw Error('STAGE8_ATTENDANCE_IDS_CHANGED');
manifest.active_versions.attendance_service='1275f1a8-a361-4184-8420-9804fd5568cb';
manifest.active_versions.attendance_moniti='7c2bb56d-9f5c-4fe7-b74e-9f480e814840';
manifest.attendance={...(manifest.attendance||{}),moniti_test_date:'2026-09-06',moniti_test_worker_ids:[99191,99186,99185]};
// Stage 7/8 hotfixes published during the Stage 8 acceptance cycle.
if(manifest.workflows?.es_report_read!=='LQnqf4nQmNKsRsMT'||manifest.workflows?.metrics_task_ack!=='r0pQp59VKwIt4i0h')throw Error('STAGE8_METRICS_IDS_CHANGED');
manifest.active_versions.es_report_read='c90f9be9-c265-4ec0-90dc-13327124f607';
manifest.active_versions.metrics_task_ack='e688b2fd-af46-4a89-92c2-6e7aef5d22d0';

// Stage 8B is wired but remains fail-closed. Pin exact published component IDs and
// active versions from the reviewed live contract so release synchronization cannot
// restore the earlier six-node source gate or the unpublished single-rule topology.
const map={
 source_gate:'comm_alert_source_gate',
 context:'comm_es_alert_context',
 rule_router:'comm_es_alert_rule_router',
 orchestrator:'comm_es_alert_orchestrator',
 source_claim:'comm_alert_source_claim',
 source_ack:'comm_alert_source_ack',
 record_reader:'comm_es_alert_record_reader',
 bundle_persistence:'comm_es_alert_bundle_persistence',
 coordinator:'comm_es_alert_coordinator'
};
if(contract.status!=='WIRED_FAIL_CLOSED_READY_FOR_REAL_DATA_TEST')throw Error('STAGE8B_CONTRACT_STATUS_INVALID');
for(const [name,key] of Object.entries(map)){
 const c=contract.components?.[name];
 if(!c?.workflow_id||!c?.active_version||c.active!==true)throw Error('STAGE8B_CONTRACT_INVALID:'+name);
 manifest.workflows[key]=c.workflow_id;
 manifest.active_versions[key]=c.active_version;
}
// Keep the prior single-rule adapter only as a rollback candidate; it is not the live Stage 8B path.
manifest.workflows.comm_es_alert_persistence='DWnFXZVIptjMSoax';
manifest.active_versions.comm_es_alert_persistence=null;
manifest.release={...(manifest.release||{}),version:'0.8.0',stage:8,environment:'test',health_workflow_id:'sfoWeuiJBN2qvCRF',health_active_version:'5d289c40-b4cf-4695-9fe5-944bb2cec5c2',health_verified_at:'2026-09-06',frontend_status:'READY_FOR_MAIN'};
manifest.communication={...(manifest.communication||{}),ui_implemented:true,ui_published:true,auto_alert_source_gate:true,auto_alert_consumer_enabled:false,alert_cutover_outbox_id:7689,es_verified:false,history_policy:'HOLD',es_alert_persistence_ready:true,es_alert_persistence_active:false,stage8b_wired:true,stage8b_fail_closed:true,stage8b_contract:'communication/stage8b-live-contract.json',stage8b_ready_for_real_data_test:true,recipient_policy_approved:false,real_positive_es_test_complete:false};
writeFileSync(manifestUrl,JSON.stringify(manifest,null,2)+'\n');
let html=readFileSync(indexUrl,'utf8');
for(const [from,to] of [
 ['<strong>V2 0.8.0 RC</strong>','<strong>V2 0.8.0</strong>'],
 ['<small>gałąź etapu 8</small>','<small>wydanie testowe etapu 8</small>'],
 ['<footer>V2 0.8.0 RC · Etap 8','<footer>V2 0.8.0 · Etap 8'],
 ['Zakres realnych testów Moniti nie został rozszerzony poza 5 września 2026.','Realne testy Moniti są ograniczone do wcześniej uzgodnionych kont i aktualnie zatwierdzonego okna testowego.']
]){
 if(!html.includes(from)&&!html.includes(to))throw Error('STAGE8_FRONTEND_RELEASE_ANCHOR_CHANGED: '+from);
 html=html.replace(from,to);
}
writeFileSync(indexUrl,html);
console.log('Stage 8/8B release metadata synchronized to 0.8.0 / stage 8, automatic ES alerts fail-closed.');
