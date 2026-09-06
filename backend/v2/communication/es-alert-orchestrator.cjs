'use strict';

const D=require('./domain.cjs');
const need=D.requireValue;
const TYPES=new Set(['WRONG_PROCESS','WORK_OUTSIDE_APP','NO_ACTIVITY']);
const ident=x=>typeof x==='string'&&/^MOL[0-9]+$/.test(x);

function validateInvocation(x){
  need(x&&typeof x==='object'&&!Array.isArray(x)&&TYPES.has(x.type),'COMM_ES_ORCHESTRATOR_INVOCATION_INVALID');
  need(x.source&&typeof x.source==='object'&&!Array.isArray(x.source),'COMM_ES_ORCHESTRATOR_INVOCATION_INVALID');
  need(Array.isArray(x.episodes)&&Array.isArray(x.config_rows),'COMM_ES_ORCHESTRATOR_INVOCATION_INVALID');
  return x;
}

function validateRuleResult(type,result){
  need(TYPES.has(type)&&result&&typeof result==='object'&&!Array.isArray(result),'COMM_ES_RULE_RESULT_INVALID');
  if(result.ok!==true){
    need(typeof result.error_code==='string'&&/^COMM_[A-Z0-9_]+$/.test(result.error_code),'COMM_ES_RULE_RESULT_INVALID');
    return {ok:false,error_code:result.error_code};
  }
  need(typeof result.status==='string'&&Array.isArray(result.resolve)&&typeof result.deliver==='boolean','COMM_ES_RULE_RESULT_INVALID');
  need(result.open===null||D.object(result.open),'COMM_ES_RULE_RESULT_INVALID');
  return result;
}

function normalizeDeliveryIntents(type,decision,intents){
  need(Array.isArray(intents),'COMM_ES_DELIVERY_POLICY_INVALID');
  if(decision.deliver!==true){
    need(intents.length===0,'COMM_ES_DELIVERY_POLICY_INVALID');
    return [];
  }
  // Recipient selection and wording are deliberately external until the user
  // approves the final automatic-alert policy. Never invent them here.
  need(intents.length>0,'COMM_ES_DELIVERY_POLICY_REQUIRED');
  need(intents.length<=100&&new Set(intents.map(x=>x.recipient_id)).size===intents.length,'COMM_ES_DELIVERY_POLICY_INVALID');
  const ack=decision.open?.details?.ack_required;
  need(typeof ack==='boolean','COMM_ES_DELIVERY_POLICY_INVALID');
  return intents.map(x=>{
    need(x&&ident(x.recipient_id)&&typeof x.content==='string'&&x.content.trim().length>0&&x.content.length<=2000,'COMM_ES_DELIVERY_POLICY_INVALID');
    need(x.ack_required===ack&&(x.type===undefined||x.type===type),'COMM_ES_DELIVERY_POLICY_INVALID');
    return {recipient_id:x.recipient_id,content:x.content.trim(),ack_required:x.ack_required,type};
  });
}

function prepareDecision({invocation,rule_result,delivery_intents=[]}){
  validateInvocation(invocation);
  const decision=validateRuleResult(invocation.type,rule_result);
  if(decision.ok===false)return {ok:false,type:invocation.type,error_code:decision.error_code,persist:false,delivery_intents:[]};
  const intents=normalizeDeliveryIntents(invocation.type,decision,delivery_intents);
  const persist=decision.open!==null||decision.resolve.length>0;
  return {ok:true,type:invocation.type,decision,delivery_intents:intents,persist};
}

function prepareBundle({context,results,intents_by_type={}}){
  need(context&&typeof context==='object'&&!Array.isArray(context)&&Array.isArray(context.invocations),'COMM_ES_ORCHESTRATOR_CONTEXT_INVALID');
  need(Array.isArray(results)&&results.length===context.invocations.length,'COMM_ES_ORCHESTRATOR_RESULT_COUNT');
  need(intents_by_type&&typeof intents_by_type==='object'&&!Array.isArray(intents_by_type),'COMM_ES_DELIVERY_POLICY_INVALID');
  const prepared=context.invocations.map((invocation,index)=>prepareDecision({invocation,rule_result:results[index],delivery_intents:intents_by_type[invocation.type]||[]}));
  const failed=prepared.find(x=>x.ok===false);
  if(failed)return {ok:false,error_code:failed.error_code,prepared,persist:false};
  return {ok:true,prepared,persist:prepared.some(x=>x.persist)};
}

module.exports={TYPES,validateInvocation,validateRuleResult,normalizeDeliveryIntents,prepareDecision,prepareBundle};
