import {readFileSync,writeFileSync} from 'node:fs';
const manifestUrl=new URL('../manifest.json',import.meta.url);
const indexUrl=new URL('../../../v2/index.html',import.meta.url);
const contractUrl=new URL('../communication/stage8b-live-contract.json',import.meta.url);
const stage7ContractUrl=new URL('../metrics/stage7-live-contract.json',import.meta.url);
const manifest=JSON.parse(readFileSync(manifestUrl,'utf8'));
const contract=JSON.parse(readFileSync(contractUrl,'utf8'));
const stage7Contract=JSON.parse(readFileSync(stage7ContractUrl,'utf8'));
if(manifest.workflows?.health!=='sfoWeuiJBN2qvCRF')throw Error('STAGE8_HEALTH_ID_CHANGED');
manifest.active_versions.health='5d289c40-b4cf-4695-9fe5-944bb2cec5c2';
// Current published attendance path. These versions were read back from live n8n
// after the explicitly authorized 2026-09-07 Moniti scope was narrowed to atybus/asorokopud.
if(manifest.workflows?.attendance_service!=='qPVmcfp6pUg3GbzH'||manifest.workflows?.attendance_moniti!=='3e67SsUOByUi17YV')throw Error('STAGE8_ATTENDANCE_IDS_CHANGED');
manifest.active_versions.attendance_service='0ea20e43-72f8-4941-96c9-97ac324015f6';
manifest.active_versions.attendance_moniti='ffe808e8-9523-49a3-afb5-e582478f819f';
manifest.attendance={...(manifest.attendance||{}),moniti_test_date:'2026-09-07',moniti_test_worker_ids:[99191,99185],next_live_test_date:'2026-09-07',next_live_test_scope_requires_explicit_approval:false,moniti_test_scope_approved:true};
// Current published Stage 7 metrics path. Pin the exact live versions so deterministic
// Stage 8B metadata synchronization cannot roll back to historical Stage 7 snapshots.
const stage7={
 es_report_read:['LQnqf4nQmNKsRsMT','c90f9be9-c265-4ec0-90dc-13327124f607'],
 es_ingest:['i4MdwSwbjUkEosk4','9aeb3f82-5a8f-4123-9aa7-642b68f6edb6'],
 metrics_scheduler:['vxe3T6UbcSofc4FL','395d5949-d5ea-4c50-a1f4-ba291ec1a955'],
 summary_recalculator:['pBYXQiiTNxhK9IGq','2d4e29bd-d956-43f4-b744-f586608b309d'],
 norm_drive:['25EgiHZmEcqxxTvG','ef240fa2-1dc5-4af0-b045-f2b7c4251e08'],
 metrics_task_ack:['r0pQp59VKwIt4i0h','e688b2fd-af46-4a89-92c2-6e7aef5d22d0']
};
for(const [key,[id,version]] of Object.entries(stage7)){
 if(manifest.workflows?.[key]!==id)throw Error('STAGE7_WORKFLOW_ID_CHANGED:'+key);
 manifest.active_versions[key]=version;
}
if(stage7Contract.status!=='REAL_ES_SOURCE_INGEST_VERIFIED_ELIGIBLE_NORM_OPEN')throw Error('STAGE7_LIVE_CONTRACT_STATUS_INVALID');

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
manifest.communication={...(manifest.communication||{}),ui_implemented:true,ui_published:true,auto_alert_source_gate:true,auto_alert_consumer_enabled:false,alert_cutover_outbox_id:7689,es_verified:false,history_policy:'HOLD',es_alert_persistence_ready:true,es_alert_persistence_active:false,stage8b_wired:true,stage8b_fail_closed:true,stage8b_contract:'communication/stage8b-live-contract.json',stage8b_ready_for_real_data_test:true,recipient_policy_approved:false,real_positive_es_test_complete:false,real_source_context_verified:true,real_source_context_outbox_id:'ES-679996:MOL004:2026-09-07:derived'};
manifest.metrics={...(manifest.metrics||{}),real_positive_es_test_complete:false,real_positive_es_source_ingest_complete:true,real_positive_es_eligible_norm_complete:false,live_test_ready:true,live_test_date:'2026-09-07',production_deltas_before_test:0,real_production_deltas_observed:true,verified_real_employee_id:'MOL004',verified_sample_batch_id:'ES-679996',verified_sample_classification:'NO_APP',baseline_required_before_counting_delta:true,alert_handoff_requires_enabled_comm_rule:true,evidence_document:'docs/v2/stage7-stage8b-live-evidence-20260907.md'};
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
console.log('Stage 7/8/8B release metadata synchronized; real ES source verified, eligible norm and automatic alert gates remain open/closed as designed.');
