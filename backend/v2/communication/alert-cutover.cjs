'use strict';

function integer(value, min = 0) {
  return Number.isSafeInteger(value) && value >= min;
}

function validatePolicy(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw Object.assign(new Error('COMM_ALERT_CUTOVER_INVALID'), {code:'COMM_ALERT_CUTOVER_INVALID'});
  if (config.history_policy !== 'HOLD') throw Object.assign(new Error('COMM_ALERT_CUTOVER_INVALID'), {code:'COMM_ALERT_CUTOVER_INVALID'});
  if (typeof config.auto_alert_consumer_enabled !== 'boolean') throw Object.assign(new Error('COMM_ALERT_CUTOVER_INVALID'), {code:'COMM_ALERT_CUTOVER_INVALID'});
  const cutover = config.alert_cutover_outbox_id;
  if (!(cutover === null || integer(cutover, 0))) throw Object.assign(new Error('COMM_ALERT_CUTOVER_INVALID'), {code:'COMM_ALERT_CUTOVER_INVALID'});
  if (config.auto_alert_consumer_enabled && cutover === null) throw Object.assign(new Error('COMM_ALERT_CUTOVER_REQUIRED'), {code:'COMM_ALERT_CUTOVER_REQUIRED'});
  return {enabled: config.auto_alert_consumer_enabled, cutover};
}

function alertSourceDecision(config, row) {
  const policy = validatePolicy(config);
  if (!policy.enabled) return {consume:false, reason:'CONSUMER_DISABLED'};
  if (!row || row.type !== 'ALERT_DERIVED') return {consume:false, reason:'NOT_ALERT_DERIVED'};
  if (!integer(row.id, 1)) throw Object.assign(new Error('COMM_ALERT_SOURCE_INVALID'), {code:'COMM_ALERT_SOURCE_INVALID'});
  if (row.id <= policy.cutover) return {consume:false, reason:'LEGACY_HOLD'};
  if (row.status !== 'PENDING') return {consume:false, reason:'NOT_PENDING'};
  return {consume:true, reason:null};
}

module.exports={validatePolicy,alertSourceDecision};
