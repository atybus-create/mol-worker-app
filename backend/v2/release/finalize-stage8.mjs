import {readFileSync,writeFileSync} from 'node:fs';

const manifestUrl=new URL('../manifest.json',import.meta.url);
const indexUrl=new URL('../../../v2/index.html',import.meta.url);
const stage7Url=new URL('../metrics/stage7-live-contract.json',import.meta.url);
const stage8bUrl=new URL('../communication/stage8b-live-contract.json',import.meta.url);
const manifest=JSON.parse(readFileSync(manifestUrl,'utf8'));
const stage7=JSON.parse(readFileSync(stage7Url,'utf8'));
const stage8b=JSON.parse(readFileSync(stage8bUrl,'utf8'));

if(stage7.status!=='REAL_POSITIVE_ES_STAGE7_TECHNICAL_PASS')throw Error('STAGE7_LIVE_CONTRACT_STATUS_INVALID');
if(stage7.acceptance?.real_positive_es_test_complete!==true)throw Error('STAGE7_REAL_ES_PASS_NOT_RECORDED');
if(stage8b.status!=='REAL_ES_CONTEXT_VERIFIED_FAIL_CLOSED')throw Error('STAGE8B_CONTRACT_STATUS_INVALID');

if(manifest.workflows?.health!=='sfoWeuiJBN2qvCRF')throw Error('STAGE8_HEALTH_ID_CHANGED');
manifest.active_versions.health='5d289c40-7e09-452e-a079-9422c63011c2';

for(const [manifestKey,componentKey] of Object.entries({
  es_report_read:'es_report_read',
  es_ingest:'es_ingest',
  metrics_scheduler:'metrics_scheduler',
  summary_recalculator:'summary_recalculator',
  norm_drive:'norm_drive',
  metrics_task_ack:'metrics_task_ack',
  attendance_service:'attendance_service',
  attendance_moniti:'moniti_adapter',
  worker_status:'worker_status'
})){
  const c=stage7.components?.[componentKey];
  if(!c?.workflow_id||!c?.active_version||c.active!==true)throw Error('STAGE7_COMPONENT_INVALID:'+componentKey);
  if(manifest.workflows?.[manifestKey]!==c.workflow_id)throw Error('STAGE7_WORKFLOW_ID_CHANGED:'+manifestKey);
  manifest.active_versions[manifestKey]=c.active_version;
}

for(const [componentKey,manifestKey] of Object.entries({
  source_gate:'comm_alert_source_gate',
  context:'comm_es_alert_context',
  rule_router:'comm_es_alert_rule_router',
  orchestrator:'comm_es_alert_orchestrator',
  source_claim:'comm_alert_source_claim',
  source_ack:'comm_alert_source_ack',
  record_reader:'comm_es_alert_record_reader',
  bundle_persistence:'comm_es_alert_bundle_persistence',
  coordinator:'comm_es_alert_coordinator'
})){
  const c=stage8b.components?.[componentKey];
  if(!c?.workflow_id||!c?.active_version||c.active!==true)throw Error('STAGE8B_COMPONENT_INVALID:'+componentKey);
  manifest.workflows[manifestKey]=c.workflow_id;
  manifest.active_versions[manifestKey]=c.active_version;
}

manifest.workflows.comm_es_alert_persistence='DWnFXZVIptjMSoax';
manifest.active_versions.comm_es_alert_persistence=null;
manifest.attendance={
  ...(manifest.attendance||{}),
  moniti_test_date:stage7.safety.moniti_live_write_scope_date,
  moniti_test_all_day_worker_ids:stage7.safety.moniti_all_day_worker_ids,
  moniti_test_limited_worker_id:stage7.safety.moniti_limited_worker_id,
  moniti_test_limited_until_local:stage7.safety.moniti_limited_until_local,
  moniti_test_timezone:stage7.safety.moniti_timezone,
  moniti_test_scope_approved:true,
  next_live_test_scope_requires_explicit_approval:true
};
manifest.release={
  ...(manifest.release||{}),
  version:'0.8.0',stage:8,environment:'test',
  health_workflow_id:'sfoWeuiJBN2qvCRF',
  health_active_version:'5d289c40-7e09-452e-a079-9422c63011c2',
  health_verified_at:'2026-09-07',
  frontend_status:'READY_FOR_MAIN'
};
manifest.metrics={
  ...(manifest.metrics||{}),
  real_positive_es_test_complete:true,
  real_positive_es_source_ingest_complete:true,
  real_positive_es_eligible_norm_complete:true,
  live_test_date:'2026-09-07',
  verified_real_employee_id:stage7.real_es_evidence.employee_id,
  verified_sample_batch_id:stage7.real_es_evidence.positive_batch_id,
  verified_sample_classification:stage7.real_es_evidence.positive_delta_classification,
  public_worker_status_verified:true,
  drive_daily_row_verified:true,
  user_acceptance_recorded:false,
  evidence_document:stage7.evidence_document
};
manifest.communication={
  ...(manifest.communication||{}),
  auto_alert_consumer_enabled:false,
  alert_cutover_outbox_id:7689,
  es_verified:false,
  technical_es_source_verified:true,
  history_policy:'HOLD',
  stage8b_wired:true,
  stage8b_fail_closed:true,
  stage8b_real_context_verified:true,
  recipient_policy_approved:false,
  real_positive_es_test_complete:true,
  real_source_context_verified:true,
  real_source_context_outbox_id:stage7.communication_handoff.verified_match_process_source_outbox_id
};
writeFileSync(manifestUrl,JSON.stringify(manifest,null,2)+'\n');

let html=readFileSync(indexUrl,'utf8');
for(const [from,to] of [
  ['<strong>V2 0.8.0 RC</strong>','<strong>V2 0.8.0</strong>'],
  ['<small>gałąź etapu 8</small>','<small>wydanie testowe etapu 8</small>'],
  ['<footer>V2 0.8.0 RC · Etap 8','<footer>V2 0.8.0 · Etap 8'],
  ['Zakres realnych testów Moniti nie został rozszerzony poza 5 września 2026.','Realne testy Moniti są ograniczone do wcześniej uzgodnionych kont i aktualnie zatwierdzonego okna testowego.']
]){
  if(!html.includes(from)&&!html.includes(to))throw Error('STAGE8_FRONTEND_RELEASE_ANCHOR_CHANGED:'+from);
  html=html.replace(from,to);
}
writeFileSync(indexUrl,html);
console.log('Stage 7 real ES technical PASS and Stage 8B real context evidence synchronized; automatic alert gates remain closed.');
