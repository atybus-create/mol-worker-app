'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const c=JSON.parse(fs.readFileSync('backend/v2/metrics/stage7-live-contract.json','utf8'));
assert.equal(c.status,'READY_FOR_POSITIVE_REAL_ES_TEST');
assert.equal(c.test_date,'2026-09-07');
for(const [name,x] of Object.entries(c.components)){
  assert.equal(x.active,true,name+' must be active');
  assert.match(x.workflow_id,/^[A-Za-z0-9_-]+$/);
  assert.match(x.active_version,/^[0-9a-f-]{36}$/);
}
assert.equal(c.components.metrics_scheduler.schedule_minutes,1);
assert.equal(c.source_mapping.PAK,'ilość skontrolowanych zamówień');
assert.equal(c.source_mapping.PICK,'Ilość zadań PICK');
for(const k of ['ES_ENABLED','METRICS_ENABLED','NORM_DRIVE_ENABLED','WRITES_ENABLED','MONITI_ENABLED'])assert.equal(c.safety[k],true,k);
for(const k of ['production_deltas_before_test','unfinished_es_derived_before_test','unfinished_attendance_derived_before_test','unfinished_norm_drive_before_test','prepared_es_batches_before_test','recovery_required_before_test'])assert.equal(c.safety[k],0,k);
assert.equal(c.safety.command_writer_free_before_test,true);
assert.equal(c.safety.moniti_scope_for_2026_09_07_approved,false);
assert.equal(c.acceptance.first_good_read_is_baseline_only,true);
assert.equal(c.acceptance.positive_test_requires_later_counter_increase,true);
assert.equal(c.acceptance.real_positive_es_test_complete,false);
assert.equal(c.communication_handoff.alert_derived_created_only_when_any_comm_rule_enabled,true);
assert.equal(c.communication_handoff.all_comm_rules_currently_disabled,true);
assert.equal(c.communication_handoff.auto_alert_consumer_enabled,false);
assert.equal(c.communication_handoff.es_verified,false);
console.log('PASS Stage 7 live-data contract');
