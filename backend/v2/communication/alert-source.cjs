'use strict';
const C=require('./alert-cutover.cjs');

const ES_RULES=['WRONG_PROCESS','WORK_OUTSIDE_APP','NO_ACTIVITY'];
const ident=x=>typeof x==='string'&&/^MOL[0-9]+$/.test(x);
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const batch=x=>typeof x==='string'&&/^ES-[0-9]+$/.test(x);

function sourceGate(config){
  const p=C.validatePolicy(config);
  if(!p.enabled)return {read_source:false,reason:'CONSUMER_DISABLED',cutover:p.cutover};
  if(config.es_verified!==true)return {read_source:false,reason:'ES_VALIDATION_REQUIRED',cutover:p.cutover};
  if(!config.rules||!ES_RULES.some(k=>config.rules[k]?.enabled===true))return {read_source:false,reason:'ES_RULES_DISABLED',cutover:p.cutover};
  return {read_source:true,reason:null,cutover:p.cutover};
}

function decideRow(config,row,now){
  const gate=sourceGate(config);
  if(!gate.read_source)return {consume:false,reason:gate.reason};
  const base=C.alertSourceDecision(config,row);
  if(!base.consume)return base;
  if(typeof now!=='string'||!Number.isFinite(Date.parse(now)))throw Object.assign(new Error('COMM_ALERT_SOURCE_TIME_INVALID'),{code:'COMM_ALERT_SOURCE_TIME_INVALID'});
  if(row.next_attempt_at&&Date.parse(row.next_attempt_at)>Date.parse(now))return {consume:false,reason:'NOT_DUE'};
  if(row.lease_until&&Date.parse(row.lease_until)>Date.parse(now))return {consume:false,reason:'LEASED'};
  let p;try{p=JSON.parse(row.payload_json);}catch{throw Object.assign(new Error('COMM_ALERT_SOURCE_INVALID'),{code:'COMM_ALERT_SOURCE_INVALID'});}
  if(!p||typeof p!=='object'||Array.isArray(p)||!ident(p.employee_id)||!day(p.work_date)||!batch(p.batch_id))throw Object.assign(new Error('COMM_ALERT_SOURCE_INVALID'),{code:'COMM_ALERT_SOURCE_INVALID'});
  if(row.aggregate_id!==p.employee_id+':'+p.work_date||row.request_id!==p.batch_id)throw Object.assign(new Error('COMM_ALERT_SOURCE_SCOPE_INVALID'),{code:'COMM_ALERT_SOURCE_SCOPE_INVALID'});
  return {consume:true,reason:null,employee_id:p.employee_id,work_date:p.work_date,batch_id:p.batch_id,outbox_id:row.outbox_id,id:row.id};
}

module.exports={ES_RULES,sourceGate,decideRow};
