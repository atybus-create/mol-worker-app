"use strict";var MOLCommRules=(()=>{var Y=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports);var z=Y((ze,_e)=>{"use strict";var w=Object.freeze(["MANUAL","NO_PROCESS","NO_ACTIVITY","WRONG_PROCESS","WORK_OUTSIDE_AP\
P","ATTENDANCE_CORRECTION","FORGOTTEN_STOP"]),pe=new Set(["NO_ACTIVITY","WRONG_PROCESS","WORK_OUTSIDE_APP"]),De=new Set(
["OFF","OBSERVE","LIVE"]);function a(e,t){if(!e){let n=new Error(t);throw n.code=t,n}}function S(e){return e!==null&&typeof e==
"object"&&!Array.isArray(e)}function g(e){a(typeof e=="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.
test(e),"COMM_TIME_INVALID");let t=e.slice(0,10),n=Date.parse(t+"T00:00:00Z");return a(Number.isFinite(n)&&new Date(n).toISOString().
slice(0,10)===t&&Number(e.slice(11,13))<24&&Number(e.slice(14,16))<60&&Number(e.slice(17,19))<60&&Number.isFinite(Date.parse(
e)),"COMM_TIME_INVALID"),new Date(e).toISOString()}function m(e){return Array.isArray(e)?"["+e.map(m).join(",")+"]":S(e)?
(a(Object.prototype.toString.call(e)==="[object Object]","COMM_JSON_INVALID"),"{"+Object.keys(e).sort().map(t=>JSON.stringify(
t)+":"+m(e[t])).join(",")+"}"):(a(e===null||["string","boolean"].includes(typeof e)||typeof e=="number"&&Number.isFinite(
e),"COMM_JSON_INVALID"),JSON.stringify(e))}function V(e){return JSON.parse(m(e))}function h(e,t=0){return Number.isSafeInteger(
e)&&e>=t}function k(e){return typeof e=="string"&&/^MOL[0-9]+$/.test(e)}function G(e){return typeof e=="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.
test(e)}function ie(e){a(e?.active===!0&&k(e.employee_id)&&["WORKER","LEADER","ADMIN"].includes(e.role),"COMM_UNAUTHENTI\
CATED")}function se(e){return a(typeof e=="string"&&e.trim().length>0&&e.length<=2e3&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.
test(e),"COMM_CONTENT_INVALID"),e.trim()}function Ae(e){let t=e.filter(s=>s.key==="COMMUNICATIONS_CONFIG");a(t.length===
1,"COMM_CONFIG_MISSING_OR_DUPLICATE");let n;try{n=JSON.parse(t[0].value_json)}catch{a(!1,"COMM_CONFIG_INVALID")}a(S(n)&&
n.schema_version===1&&De.has(n.mode)&&n.timezone==="Europe/Warsaw"&&typeof n.manual_enabled=="boolean"&&typeof n.es_verified==
"boolean"&&n.history_policy==="HOLD"&&S(n.rules),"COMM_CONFIG_INVALID"),a(n.poll_seconds===null||h(n.poll_seconds,5)&&n.
poll_seconds<=300,"COMM_CONFIG_INVALID");for(let s of w.filter(r=>r!=="MANUAL")){let r=n.rules[s];a(S(r)&&typeof r.enabled==
"boolean"&&(r.ack_required===null||typeof r.ack_required=="boolean"),"COMM_CONFIG_INVALID"),["NO_PROCESS","NO_ACTIVITY"].
includes(s)&&a(r.threshold_seconds===null||h(r.threshold_seconds,1)&&r.threshold_seconds<=86400,"COMM_CONFIG_INVALID"),s===
"FORGOTTEN_STOP"&&a((r.at_local===null||typeof r.at_local=="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.at_local))&&(r.escalate_after_seconds===
null||h(r.escalate_after_seconds,1)),"COMM_CONFIG_INVALID")}return n}function Re(e,t){if(a(w.includes(t),"COMM_TYPE_INVA\
LID"),e.mode==="OFF")return{evaluate:!1,deliver:!1,reason:"MODULE_OFF"};if(t==="MANUAL")return{evaluate:e.manual_enabled,
deliver:e.manual_enabled&&e.mode==="LIVE",reason:e.manual_enabled?e.mode==="LIVE"?null:"OBSERVE_ONLY":"RULE_DISABLED"};let n=e.
rules[t];return n.enabled?n.ack_required===null||["NO_PROCESS","NO_ACTIVITY"].includes(t)&&n.threshold_seconds===null||t===
"FORGOTTEN_STOP"&&(n.at_local===null||n.escalate_after_seconds===null)?{evaluate:!1,deliver:!1,reason:"PARAMETERS_NOT_CO\
NFIRMED"}:pe.has(t)&&e.es_verified!==!0?{evaluate:!1,deliver:!1,reason:"ES_VALIDATION_REQUIRED"}:{evaluate:!0,deliver:e.
mode==="LIVE",reason:e.mode==="LIVE"?null:"OBSERVE_ONLY"}:{evaluate:!1,deliver:!1,reason:"RULE_DISABLED"}}function fe({actor:e,
body:t,employees:n,attendance:s,now:r}){ie(e),a(["LEADER","ADMIN"].includes(e.role),"COMM_FORBIDDEN");let i=["request_id",
"recipient_ids","all_open","content","ack_required","valid_until"];a(S(t)&&!Object.keys(t).some(_=>!i.includes(_))&&G(t.
request_id),"COMM_REQUEST_INVALID"),a(t.ack_required===void 0||typeof t.ack_required=="boolean","COMM_REQUEST_INVALID"),
a(t.all_open===void 0||typeof t.all_open=="boolean","COMM_REQUEST_INVALID"),a(t.all_open===!0&&!Object.hasOwn(t,"recipie\
nt_ids")||t.all_open!==!0&&Array.isArray(t.recipient_ids)&&t.recipient_ids.length>0&&t.recipient_ids.length<=100&&t.recipient_ids.
every(k),"COMM_RECIPIENTS_INVALID");let o=g(r),c=se(t.content),d=t.valid_until===null||t.valid_until===void 0?null:g(t.valid_until);
a(d===null||Date.parse(d)>Date.parse(o),"COMM_EXPIRED_AT_SEND"),a(new Set(n.map(_=>_.employee_id)).size===n.length,"COMM\
_EMPLOYEE_DUPLICATE"),a(n.every(_=>k(_.employee_id)),"COMM_EMPLOYEE_INVALID");let C=new Set(n.filter(_=>_.active===!0).map(
_=>_.employee_id)),M=s.filter(_=>_.state==="OPEN");a(M.every(_=>k(_.employee_id)&&!_.stop_at&&Date.parse(g(_.start_at))<=
Date.parse(o)),"COMM_ATTENDANCE_INCONSISTENT"),a(new Set(M.map(_=>_.employee_id)).size===M.length,"COMM_ATTENDANCE_INCON\
SISTENT");let p=new Set(M.filter(_=>C.has(_.employee_id)).map(_=>_.employee_id)),L=t.all_open===!0?[...p].sort():[...new Set(
t.recipient_ids)].sort();a(L.length>0&&L.length<=100,"COMM_NO_RECIPIENTS"),a(L.every(_=>p.has(_)),"COMM_RECIPIENT_NOT_OP\
EN");let R={recipient_ids:t.all_open===!0?null:L,all_open:t.all_open===!0,content:c,ack_required:t.ack_required===!0,valid_until:d};
return{request_id:t.request_id.toLowerCase(),actor_id:e.employee_id,operation:"SEND",canonical:m({actor_id:e.employee_id,
operation:"SEND",body:R}),created_at:o,recipient_ids:L,content:c,ack_required:R.ack_required,valid_until:d}}function re({
employee_id:e,type:t,anchor:n}){return a(k(e)&&w.includes(t)&&typeof n=="string"&&/^[A-Za-z0-9:._-]{1,180}$/.test(n),"CO\
MM_EPISODE_INVALID"),e+"|"+t+"|"+n}function ge(e,t,n){let s=re(t),r=g(n);if(e)return a(e.episode_id===s,"COMM_EPISODE_ID\
_CONFLICT"),a(["OPEN","RESOLVED"].includes(e.status),"COMM_EPISODE_STATE_INVALID"),a(Date.parse(r)>=Date.parse(g(e.opened_at)),
"COMM_TIME_ORDER"),{changed:!1,episode:V(e),reason:e.status==="RESOLVED"?"EPISODE_ALREADY_RESOLVED":"EPISODE_ALREADY_OPE\
N"};let i=S(t.details)?V(t.details):{};return m(i),{changed:!0,episode:{episode_id:s,employee_id:t.employee_id,type:t.type,
anchor:t.anchor,status:"OPEN",opened_at:r,resolved_at:null,resolution_reason:null,version:1,details:i}}}function Se(e,t,n){
if(a(e&&e.episode_id&&["OPEN","RESOLVED"].includes(e.status),"COMM_EPISODE_STATE_INVALID"),e.status==="RESOLVED")return{
changed:!1,episode:V(e)};let s=g(t);return a(Date.parse(s)>=Date.parse(g(e.opened_at))&&typeof n=="string"&&/^[A-Z0-9_]{1,80}$/.
test(n),"COMM_RESOLUTION_INVALID"),{changed:!0,episode:{...V(e),status:"RESOLVED",resolved_at:s,resolution_reason:n,version:e.
version+1}}}function Le({message_id:e,episode:t=null,recipient_id:n,sender_id:s,type:r,content:i,ack_required:o,valid_until:c=null,
now:d}){a(typeof e=="string"&&e.length>0&&e.length<=400&&k(n)&&typeof s=="string"&&s.length>0&&w.includes(r)&&typeof o==
"boolean","COMM_DELIVERY_INVALID");let C=g(d),M=c===null?null:g(c);return a(M===null||Date.parse(M)>Date.parse(C),"COMM_\
EXPIRED_AT_SEND"),t&&a(t.episode_id&&t.type===r&&["OPEN","RESOLVED"].includes(t.status),"COMM_EPISODE_STATE_INVALID"),{message_id:e,
episode_id:t?.episode_id||null,recipient_id:n,sender_id:s,type:r,content:se(i),ack_required:o,sent_at:C,shown_at:null,ack_at:null,
valid_until:M,delivery_status:"PENDING",cause_status:t?.status||"NOT_APPLICABLE",resolved_at:t?.resolved_at||null,version:1}}
function Te(e,t,n,s){if(ie(t),a(e&&e.recipient_id===t.employee_id,"COMM_FORBIDDEN"),a(["SHOWN","ACK"].includes(n),"COMM_\
ACTION_INVALID"),e[n==="ACK"?"ack_at":"shown_at"])return{changed:!1,delivery:V(e)};let i=g(s);return a(Date.parse(i)>=Date.
parse(g(e.sent_at)),"COMM_TIME_ORDER"),{changed:!0,delivery:{...V(e),shown_at:e.shown_at||i,ack_at:n==="ACK"?i:e.ack_at,
delivery_status:n==="ACK"||e.ack_at?"ACKNOWLEDGED":"DISPLAYED",version:e.version+1}}}function me(e,t){return a(e.episode_id===
t.episode_id,"COMM_EPISODE_ID_CONFLICT"),t.status!=="RESOLVED"||e.cause_status==="RESOLVED"?{changed:!1,delivery:V(e)}:{
changed:!0,delivery:{...V(e),cause_status:"RESOLVED",resolved_at:t.resolved_at,version:e.version+1}}}var B=Object.freeze(
["record_key","kind","scope_id","version","revision","payload_json","last_request_id"]);function W(e){a(S(e)&&Object.keys(
e).length===B.length&&Object.keys(e).every(n=>B.includes(n)),"COMM_RECORD_INVALID"),a(typeof e.record_key=="string"&&e.record_key.
length>0&&e.record_key.length<=500&&["EPISODE","DELIVERY","STATE","EVENT"].includes(e.kind)&&typeof e.scope_id=="string"&&
e.scope_id.length>0&&e.scope_id.length<=100&&h(e.version,1)&&h(e.revision,1)&&G(e.last_request_id)&&typeof e.payload_json==
"string"&&e.payload_json.length<=25e4,"COMM_RECORD_INVALID");let t;try{t=JSON.parse(e.payload_json)}catch{a(!1,"COMM_REC\
ORD_INVALID")}return a(S(t),"COMM_RECORD_INVALID"),m(t),e}function oe(e,t){return B.every(n=>e[n]===t[n])}function ye(e,t,n){
return W(t),a(h(n),"COMM_EXPECTED_VERSION_REQUIRED"),a(t.version===n+1,"COMM_VERSION_STEP_INVALID"),e&&oe(e,t)?{write:!1,
replayed:!0}:(e&&(a(e.record_key===t.record_key&&e.kind===t.kind&&e.scope_id===t.scope_id,"COMM_RECORD_ID_CONFLICT"),a(t.
kind!=="EVENT","COMM_EVENT_IMMUTABLE")),a((e?.version||0)===n,"COMM_VERSION_CONFLICT"),e&&a(t.revision>e.revision,"COMM_\
REVISION_CONFLICT"),{write:!0,replayed:!1})}function H(e){a(S(e)&&typeof e.lock_owner=="string"&&/^[0-9]+$/.test(e.lock_owner)&&
G(e.request_id)&&/^[0-9a-f]{64}$/.test(e.payload_hash||"")&&typeof e.actor_id=="string"&&e.actor_id.length>0&&e.actor_id.
length<=100&&["SEND","SHOWN","ACK","OBSERVE","RESOLVE","PROBE"].includes(e.operation),"COMM_BATCH_INVALID"),a(Array.isArray(
e.records)&&e.records.length>0&&e.records.length<=202&&S(e.response),"COMM_BATCH_INVALID"),a(new Set(e.records.map(n=>n.
row?.record_key)).size===e.records.length,"COMM_BATCH_DUPLICATE_KEY");for(let n of e.records)W(n.row),a(n.row.last_request_id===
e.request_id&&h(n.expected_version)&&n.row.version===n.expected_version+1,"COMM_BATCH_INVALID");let t={records:e.records,
response:e.response};return a(m(t).length<=1e6,"COMM_BATCH_TOO_LARGE"),t}function ve(e,t,n,s){let r=H(e),i=g(s);if(a(Array.
isArray(n)&&n.length<=1,"COMM_JOURNAL_INVALID"),a(n.every(o=>o.request_id===e.request_id),"COMM_RECOVERY_REQUIRED"),a(n.
length===0||t?.status==="PREPARED","COMM_JOURNAL_INVALID"),t){a(t.request_id===e.request_id,"COMM_JOURNAL_INVALID"),a(t.
payload_hash===e.payload_hash&&t.actor_id===e.actor_id&&t.operation===e.operation,"COMM_REQUEST_ID_CONFLICT"),a(["PREPAR\
ED","COMMITTED"].includes(t.status),"COMM_JOURNAL_INVALID");let o,c;try{o=JSON.parse(t.plan_json),c=JSON.parse(t.response_json)}catch{
a(!1,"COMM_JOURNAL_INVALID")}a(S(o)&&Object.keys(o).sort().join(",")==="records,response"&&S(c)&&m(o.response)===m(c),"C\
OMM_JOURNAL_INVALID"),H({...e,records:o.records,response:o.response});let d=g(t.prepared_at);return a(Date.parse(d)<=Date.
parse(i),"COMM_TIME_ORDER"),t.status==="COMMITTED"?{write:!1,replayed:!0,response:c}:{write:!0,recovery:!0,plan:o,prepared_at:d}}
return{write:!0,recovery:!1,plan:r,prepared_at:i}}_e.exports={requireValue:a,object:S,iso:g,integer:h,requestId:G,TYPES:w,
canonical:m,configFromRows:Ae,ruleGate:Re,manualIntent:fe,episodeIdentity:re,observeEpisode:ge,resolveEpisode:Se,newDelivery:Le,
receipt:Te,reflectResolution:me,RECORD_FIELDS:B,validateRecord:W,sameRecord:oe,decideRecord:ye,validateBatch:H,chooseBatch:ve}});var Oe=Y((Qe,Ee)=>{"use strict";var I=z(),l=I.requireValue,Q=I.object,K="STATE:COMM_GLOBAL",he=["WORKER","LEADER","ADMIN"],
Ve=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,U=e=>typeof e=="string"&&/^MOL[0-9]+$/.test(
e),Pe=e=>JSON.parse(I.canonical(e));function b(e){l(e&&e.active===!0&&U(e.employee_id)&&he.includes(e.role),"COMM_UNAUTH\
ENTICATED")}function Ue({token_hash:e,sessions:t,employees:n,now:s}){l(typeof e=="string"&&/^[0-9a-f]{64}$/.test(e),"COM\
M_UNAUTHENTICATED");let r=t.filter(d=>d.token_hash===e);l(r.length===1,"COMM_UNAUTHENTICATED");let i=r[0];l(i.session_id&&
!i.revoked_at&&Date.parse(i.expires_at)>Date.parse(I.iso(s)),"COMM_UNAUTHENTICATED");let o=n.filter(d=>d.employee_id===i.
employee_id);l(o.length===1,"COMM_UNAUTHENTICATED");let c=o[0];return b(c),{employee_id:c.employee_id,display_name:c.display_name||
c.employee_id,role:c.role,active:!0}}function ae(e,t){l(Q(e)&&Object.keys(e).every(n=>t.includes(n)),"COMM_REQUEST_INVAL\
ID")}function le(e,t,n){b(e),l(["SEND","SHOWN","ACK"].includes(t),"COMM_ACTION_INVALID"),t==="SEND"&&l(["LEADER","ADMIN"].
includes(e.role),"COMM_FORBIDDEN"),ae(n,t==="SEND"?["request_id","recipient_ids","all_open","content","ack_required","va\
lid_until"]:["request_id","message_id"]),l(typeof n.request_id=="string"&&Ve.test(n.request_id),"COMM_REQUEST_INVALID");
let s;if(t==="SEND"){l(n.all_open===void 0||typeof n.all_open=="boolean","COMM_REQUEST_INVALID"),l(n.ack_required===void 0||
typeof n.ack_required=="boolean","COMM_REQUEST_INVALID");let r=n.all_open===!0;l(r?!Object.hasOwn(n,"recipient_ids"):Array.
isArray(n.recipient_ids)&&n.recipient_ids.length>0&&n.recipient_ids.length<=100&&n.recipient_ids.every(U),"COMM_RECIPIEN\
TS_INVALID"),l(typeof n.content=="string"&&n.content.length<=2e3&&n.content.trim().length>0&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.
test(n.content),"COMM_CONTENT_INVALID"),s={recipient_ids:r?null:[...new Set(n.recipient_ids)].sort(),all_open:r,content:n.
content.trim(),ack_required:n.ack_required===!0,valid_until:n.valid_until==null?null:I.iso(n.valid_until)}}else l(typeof n.
message_id=="string"&&/^[A-Za-z0-9:|._-]{1,400}$/.test(n.message_id),"COMM_MESSAGE_ID_INVALID"),s={message_id:n.message_id};
return{request_id:n.request_id.toLowerCase(),actor_id:e.employee_id,operation:t,normalized:s,canonical:I.canonical({actor_id:e.
employee_id,operation:t,body:s})}}function ke(e){return Object.fromEntries(I.RECORD_FIELDS.map(t=>[t,e[t]]))}function J(e){
try{return I.validateRecord(ke(e)),JSON.parse(e.payload_json)}catch{l(!1,"COMM_RECORD_CORRUPT")}}function we(e){l(Array.
isArray(e)&&new Set(e.map(t=>t.record_key)).size===e.length,"COMM_DUPLICATE_RECORD")}function $(e){we(e);let t=e.find(s=>s.
record_key===K);if(!t)return l(!e.some(s=>s.kind==="DELIVERY"),"COMM_GLOBAL_STATE_MISSING"),{row:null,revision:0};let n=J(
t);return l(t.kind==="STATE"&&t.scope_id==="GLOBAL"&&n.revision===t.revision,"COMM_GLOBAL_STATE_INVALID"),{row:t,revision:t.
revision}}function j({key:e,kind:t,scope:n,data:s,revision:r,request_id:i,prior:o=null}){let c={record_key:e,kind:t,scope_id:n,
version:(o?.version||0)+1,revision:r,payload_json:I.canonical(s),last_request_id:i};return I.validateRecord(c),{row:c,expected_version:o?.
version||0}}function Z(e){let t=J(e);return l(e.kind==="DELIVERY"&&U(t.recipient_id)&&e.scope_id===t.recipient_id&&e.record_key===
"DELIVERY:"+t.message_id&&t.version===e.version&&I.integer(t.created_revision,1)&&t.created_revision<=e.revision,"COMM_D\
ELIVERY_CORRUPT"),l(typeof t.ack_required=="boolean"&&["PENDING","DISPLAYED","ACKNOWLEDGED"].includes(t.delivery_status)&&
["OPEN","RESOLVED","NOT_APPLICABLE"].includes(t.cause_status),"COMM_DELIVERY_CORRUPT"),I.iso(t.sent_at),t.shown_at&&I.iso(
t.shown_at),t.ack_at&&I.iso(t.ack_at),t.valid_until&&I.iso(t.valid_until),{...t,revision:e.revision}}function be(e,t){let n=e.
pending||[],s=e.prior;if(l(n.length<=1,"COMM_JOURNAL_INVALID"),!s)return l(n.length===0,"COMM_RECOVERY_REQUIRED"),null;l(
s.actor_id===t.actor_id&&s.operation===t.operation&&s.payload_hash===e.payload_hash&&s.request_id===t.request_id,"COMM_R\
EQUEST_ID_CONFLICT");let r;try{r=JSON.parse(s.plan_json)}catch{l(!1,"COMM_JOURNAL_INVALID")}l(Q(r),"COMM_JOURNAL_INVALID");
let i={lock_owner:e.lock_owner,request_id:t.request_id,payload_hash:e.payload_hash,actor_id:t.actor_id,operation:t.operation,
records:r.records,response:r.response},o=I.chooseBatch(i,s,n,e.now);return o.write?(l(e.writes_enabled===!0,"COMM_WRITES\
_DISABLED"),{execute:!0,recovery:!0,batch:{...i,records:o.plan.records,response:o.plan.response}}):{execute:!1,replayed:!0,
response:o.response}}function Be(e){let t=le(e.actor,e.operation,e.body),n=I.iso(e.now);l(e.canonical===t.canonical&&/^[0-9a-f]{64}$/.
test(e.payload_hash||""),"COMM_HASH_CONTEXT_INVALID"),l(typeof e.lock_owner=="string"&&/^\d+$/.test(e.lock_owner),"COMM_\
LOCK_LOST");let s=be(e,t);if(s)return s;l(e.writes_enabled===!0,"COMM_WRITES_DISABLED");let r=e.records||[],i=$(r),o=i.revision+
1;l(I.integer(o,1),"COMM_REVISION_EXHAUSTED");let c=[],d=[],C=t.request_id;function M(_,u=null,D){let f=j({key:"DELIVERY\
:"+_.message_id,kind:"DELIVERY",scope:_.recipient_id,data:_,revision:o,request_id:C,prior:u});d.push(f),d.push(j({key:"E\
VENT:"+C+":"+_.recipient_id,kind:"EVENT",scope:_.recipient_id,data:{stream:"delivery_change",event:D,actor_id:t.actor_id,
occurred_at:n,revision:o,delivery:{..._,revision:o}},revision:o,request_id:C})),c.push({..._,revision:o})}let p;if(t.operation===
"SEND"){let _=I.configFromRows(e.config_rows||[]);l(I.ruleGate(_,"MANUAL").deliver===!0,"COMM_SEND_DISABLED");let u=I.manualIntent(
{actor:e.actor,body:e.body,employees:e.employees||[],attendance:e.attendance||[],now:n});l(u.canonical===t.canonical,"CO\
MM_HASH_CONTEXT_INVALID");for(let D of u.recipient_ids){let f="MSG:"+C+":"+D;l(!r.some(v=>v.record_key==="DELIVERY:"+f),
"COMM_ORPHAN_DELIVERY"),M({...I.newDelivery({message_id:f,recipient_id:D,sender_id:t.actor_id,type:"MANUAL",content:u.content,
ack_required:u.ack_required,valid_until:u.valid_until,now:n}),created_revision:o},null,"SENT")}p={recipient_ids:u.recipient_ids,
message_ids:c.map(D=>D.message_id),recipient_count:u.recipient_ids.length,revision:o}}else{let _=r.find(f=>f.record_key===
"DELIVERY:"+t.normalized.message_id);l(_,"COMM_MESSAGE_NOT_FOUND");let u=Z(_),D=I.receipt(u,e.actor,t.operation,n);if(D.
changed){let f={...D.delivery};delete f.revision,M(f,_,t.operation==="ACK"?"ACKNOWLEDGED":"DISPLAYED")}p={message_id:u.message_id,
changed:D.changed,shown_at:D.delivery.shown_at,ack_at:D.delivery.ack_at,cause_status:D.delivery.cause_status,revision:o}}
d.push(j({key:"EVENT:"+C+":AUDIT",kind:"EVENT",scope:t.actor_id,data:{stream:"command_audit",operation:t.operation,actor_id:t.
actor_id,occurred_at:n,result:p},revision:o,request_id:C})),d.push(j({key:K,kind:"STATE",scope:"GLOBAL",data:{revision:o},
revision:o,request_id:C,prior:i.row}));let L={http_status:t.operation==="SEND"?201:200,body:{ok:!0,request_id:C,data:p,meta:{
api_version:"2.0",server_time:n}}},R={lock_owner:e.lock_owner,request_id:C,payload_hash:e.payload_hash,actor_id:t.actor_id,
operation:t.operation,records:d,response:L};return I.validateBatch(R),{execute:!0,recovery:!1,batch:R}}function Ge(e,t){
b(e),l(U(t),"COMM_REQUEST_INVALID"),l(t===e.employee_id||["LEADER","ADMIN"].includes(e.role),"COMM_FORBIDDEN")}function ce(e){
return Buffer.from(I.canonical(e),"utf8").toString("base64url")}function de(e){l(typeof e=="string"&&e.length>0&&e.length<=
2048&&/^[A-Za-z0-9_-]+$/.test(e),"COMM_CURSOR_INVALID");let t;try{t=JSON.parse(Buffer.from(e,"base64url").toString("utf8"))}catch{
l(!1,"COMM_CURSOR_INVALID")}return l(Q(t)&&t.v===1&&["history","changes"].includes(t.stream)&&U(t.target)&&U(t.viewer)&&
I.integer(t.ceiling)&&I.integer(t.edge_revision)&&typeof t.edge_key=="string"&&t.edge_key.length<=500,"COMM_CURSOR_INVAL\
ID"),t}function je({actor:e,query:t={},records:n=[],pending:s=[],now:r}){b(e),ae(t,["employee_id","limit","cursor","sinc\
e_revision"]);let i=t.employee_id||e.employee_id;Ge(e,i);let o=(E,P)=>{if(E===void 0)return P;l(typeof E=="string"&&/^\d{1,16}$/.
test(E),"COMM_REQUEST_INVALID");let N=Number(E);return l(I.integer(N),"COMM_REQUEST_INVALID"),N},c=o(t.limit,25);l(c>=1&&
c<=100,"COMM_LIMIT_INVALID"),l(s.length===0,"COMM_RECOVERY_REQUIRED");let d=$(n),C=I.iso(r),M=null,p=Object.hasOwn(t,"si\
nce_revision")?"changes":"history",L=o(t.since_revision,0);t.cursor&&(M=de(t.cursor),l(!Object.hasOwn(t,"since_revision"),
"COMM_REQUEST_INVALID"),p=M.stream,l(M.viewer===e.employee_id&&M.target===i,"COMM_CURSOR_SCOPE"));let R=M?.ceiling??d.revision;
l(R<=d.revision&&(p!=="changes"||(M?.edge_revision??L)<=R),"COMM_CURSOR_AHEAD");let _=n.filter(E=>E.kind==="DELIVERY"&&E.
scope_id===i).map(Z),u=E=>!E.valid_until||Date.parse(E.valid_until)>Date.parse(C),D={unread_count:_.filter(E=>u(E)&&!E.shown_at).
length,unacknowledged_count:_.filter(E=>u(E)&&E.ack_required&&!E.ack_at).length},f=E=>({...Pe(E),expired:!u(E)}),v;if(p===
"history")v=_.filter(E=>E.created_revision<=R&&(!M||E.created_revision<M.edge_revision||E.created_revision===M.edge_revision&&
E.message_id<M.edge_key)).sort((E,P)=>P.created_revision-E.created_revision||(E.message_id<P.message_id?1:E.message_id>P.
message_id?-1:0)).map(E=>({edge_revision:E.created_revision,edge_key:E.message_id,item:f(E)}));else{let E=M?.edge_revision??
L,P=M?.edge_key??"\uFFFF";v=n.filter(N=>N.kind==="EVENT"&&N.scope_id===i&&N.revision<=R&&(N.revision>E||N.revision===E&&
N.record_key>P)).map(N=>({r:N,p:J(N)})).filter(N=>N.p.stream==="delivery_change").map(({r:N,p:T})=>(l(T.revision===N.revision&&
T.delivery?.recipient_id===i&&T.delivery?.revision===N.revision,"COMM_CHANGE_CORRUPT"),{edge_revision:N.revision,edge_key:N.
record_key,item:{event:T.event,occurred_at:T.occurred_at,delivery:f(T.delivery)}})).sort((N,T)=>N.edge_revision-T.edge_revision||
(N.edge_key<T.edge_key?-1:N.edge_key>T.edge_key?1:0))}let ee=v.slice(0,c),te=v.length>c,ne=ee.at(-1),Ne=te?ce({v:1,stream:p,
target:i,viewer:e.employee_id,ceiling:R,edge_revision:ne.edge_revision,edge_key:ne.edge_key}):null;return{employee_id:i,
stream:p,revision:d.revision,snapshot_revision:R,...D,items:ee.map(E=>E.item),next_cursor:Ne,sync_revision:p==="changes"&&
!te?R:null,server_time:C}}function qe({actor:e,employees:t,attendance:n,now:s}){b(e),l(["LEADER","ADMIN"].includes(e.role),
"COMM_FORBIDDEN"),l(new Set(t.map(o=>o.employee_id)).size===t.length,"COMM_EMPLOYEE_DUPLICATE");let r=I.iso(s),i=n.filter(
o=>o.state==="OPEN");return l(i.every(o=>U(o.employee_id)&&!o.stop_at&&Date.parse(I.iso(o.start_at))<=Date.parse(r))&&new Set(
i.map(o=>o.employee_id)).size===i.length,"COMM_ATTENDANCE_INCONSISTENT"),t.filter(o=>o.active===!0&&i.some(c=>c.employee_id===
o.employee_id)).map(o=>({employee_id:o.employee_id,display_name:o.display_name||o.employee_id})).sort((o,c)=>o.employee_id.
localeCompare(c.employee_id))}function Fe(e,t="",n=new Date().toISOString()){let s=typeof e?.code=="string"&&/^COMM_[A-Z0-9_]+$/.
test(e.code)?e.code:"COMM_INTERNAL_ERROR",r=s==="COMM_UNAUTHENTICATED",i=["COMM_FORBIDDEN","COMM_CURSOR_SCOPE"].includes(
s),o=["COMM_REQUEST_ID_CONFLICT","COMM_VERSION_CONFLICT","COMM_CURSOR_AHEAD","COMM_BUSY"].includes(s),c=/(REQUEST_INVALID|CONTENT_INVALID|RECIPIENTS_INVALID|MESSAGE_ID_INVALID|TIME_INVALID|LIMIT_INVALID|CURSOR_INVALID|ACTION_INVALID)$/.
test(s),d=["COMM_NO_RECIPIENTS","COMM_RECIPIENT_NOT_OPEN","COMM_EXPIRED_AT_SEND","COMM_BATCH_TOO_LARGE"].includes(s),C=r?
401:i?403:s==="COMM_MESSAGE_NOT_FOUND"?404:o?409:c?400:d?422:503,M=r?"Sesja wygas\u0142a. Zaloguj si\u0119 ponownie.":i?
"Brak uprawnie\u0144.":s==="COMM_SEND_DISABLED"?"Wysy\u0142ka nowych wiadomo\u015Bci jest wy\u0142\u0105czona.":s==="COM\
M_RECOVERY_REQUIRED"?"Poprzedni zapis komunikacji wymaga doko\u0144czenia.":s==="COMM_NO_RECIPIENTS"?"Brak pracownik\xF3w z\
 otwartym dniem pracy.":s==="COMM_RECIPIENT_NOT_OPEN"?"Wybrany odbiorca nie ma ju\u017C otwartego dnia pracy.":C>=500?"N\
ie potwierdzono komunikacji. Pon\xF3w to samo \u017C\u0105danie.":"Nieprawid\u0142owe \u017C\u0105danie lub konflikt danych. Od\u015Bwie\u017C st\
an i spr\xF3buj ponownie.";return{http_status:C,body:{ok:!1,request_id:t,error:{code:s,message:M,retryable:C>=500||s==="\
COMM_BUSY"},meta:{api_version:"2.0",server_time:I.iso(n)}}}}Ee.exports={GLOBAL_KEY:K,authorizeSession:Ue,normalizeWrite:le,
globalState:$,deliveryOf:Z,planWrite:Be,readMessages:je,listRecipients:qe,errorResponse:Fe,cursorEncode:ce,cursorDecode:de}});var He=Y((Ke,Ce)=>{var A=z(),y=Oe(),O=A.requireValue,q=e=>typeof e=="string"&&/^MOL[0-9]+$/.test(e),ue=e=>{let t;try{t=JSON.
parse(e)}catch{O(!1,"COMM_RECORD_CORRUPT")}return t};function F(e){let t=e.filter(i=>i.key==="WRITES_ENABLED");O(t.length===
1,"COMM_CONFIG_MISSING_OR_DUPLICATE");let n=ue(t[0].value_json);O(typeof n=="boolean","COMM_CONFIG_INVALID");let s=null,
r=null;try{s=A.configFromRows(e)}catch(i){r=i.code||"COMM_CONFIG_INVALID"}return{writes_enabled:n,config:s,config_error:r}}
function X(e){let t=F(e);return{manual_send_enabled:t.writes_enabled&&!!t.config&&A.ruleGate(t.config,"MANUAL").deliver,
poll_seconds:t.config?.poll_seconds??null,configuration_error:t.config_error,mode:t.config?.mode||"OFF",counts_complete:!1}}
function x(e,t={}){O(e?.active===!0&&q(e.employee_id)&&["WORKER","LEADER","ADMIN"].includes(e.role),"COMM_UNAUTHENTICATE\
D"),O(A.object(t)&&Object.keys(t).every(d=>["employee_id","limit","cursor","since_revision"].includes(d)),"COMM_REQUEST_\
INVALID");let n=t.employee_id??e.employee_id;O(q(n),"COMM_REQUEST_INVALID"),O(n===e.employee_id||["LEADER","ADMIN"].includes(
e.role),"COMM_FORBIDDEN");let s=(d,C)=>d===void 0?C:(O(typeof d=="string"&&/^\d{1,16}$/.test(d)&&A.integer(Number(d)),"C\
OMM_REQUEST_INVALID"),Number(d)),r=s(t.limit,25);O(r>=1&&r<=100,"COMM_LIMIT_INVALID");let i=null,o=Object.hasOwn(t,"sinc\
e_revision")?"changes":"history",c=s(t.since_revision,0);if(Object.hasOwn(t,"cursor")){O(!Object.hasOwn(t,"since_revisio\
n")&&typeof t.cursor=="string"&&t.cursor.length>0&&t.cursor.length<=2048&&/^[A-Za-z0-9_-]+$/.test(t.cursor),"COMM_CURSOR\
_INVALID");try{i=JSON.parse(Buffer.from(t.cursor,"base64url").toString("utf8"))}catch{O(!1,"COMM_CURSOR_INVALID")}O(A.object(
i)&&i.v===2&&["history","changes"].includes(i.stream)&&q(i.viewer)&&q(i.target)&&A.integer(i.ceiling)&&A.integer(i.edge_id)&&
A.integer(i.ceiling_id)&&A.integer(i.since),"COMM_CURSOR_INVALID"),O(i.viewer===e.employee_id&&i.target===n,"COMM_CURSOR\
_SCOPE"),O(i.since<=i.ceiling,"COMM_CURSOR_INVALID"),i.stream==="history"&&O(i.edge_id<=i.ceiling_id,"COMM_CURSOR_INVALI\
D"),o=i.stream}return{target:n,viewer:e.employee_id,limit:r,stream:o,since:i?.since??c,cursor:i}}function Ie({actor:e,query:t,
global_rows:n=[],pending:s=[]}){let r=x(e,t);O(s.length===0,"COMM_RECOVERY_REQUIRED");let i=y.globalState(n),o=r.cursor?.
ceiling??i.revision;O(o<=i.revision&&r.since<=o,"COMM_CURSOR_AHEAD");let c=(C,M,p)=>({keyName:C,condition:M,keyValue:p}),
d=[c("kind","eq",r.stream==="history"?"DELIVERY":"EVENT"),c("scope_id","eq",r.target)];return r.stream==="history"?r.cursor&&
d.push(c("id","lt",r.cursor.edge_id),c("id","lte",r.cursor.ceiling_id)):d.push(c("revision","gt",r.since),c("revision","\
lte",o),c("id","gt",r.cursor?.edge_id??0)),{...r,revision:i.revision,ceiling:o,ceiling_id:r.cursor?.ceiling_id??0,parameters:{
resource:"row",operation:"get",matchType:"allConditions",filters:{conditions:d},returnAll:!1,limit:r.limit+1,orderBy:!0,
orderByColumn:"id",orderByDirection:r.stream==="history"?"DESC":"ASC",options:{}}}}function Me({plan:e,rows:t=[],now:n,config_rows:s=[]}){
let r=A.iso(n),i=e;O(Array.isArray(t)&&t.length<=i.limit+1,"COMM_PAGE_OVERFLOW"),O(new Set(t.map(_=>_.id)).size===t.length&&
new Set(t.map(_=>_.record_key)).size===t.length,"COMM_DUPLICATE_RECORD");let o=[...t].sort((_,u)=>i.stream==="history"?u.
id-_.id:_.id-u.id),c=i.stream==="history"&&(i.ceiling_id||o[0]?.id)||0,d=o.slice(0,i.limit),C=o.length>i.limit,M=_=>({..._,
expired:!!_.valid_until&&Date.parse(_.valid_until)<=Date.parse(r)}),p=[];for(let _ of o)O(A.integer(_.id,1)&&_.scope_id===
i.target&&_.kind===(i.stream==="history"?"DELIVERY":"EVENT"),"COMM_PAGE_SCOPE_INVALID"),i.stream==="history"?O((!i.cursor||
_.id<i.cursor.edge_id)&&_.id<=c,"COMM_PAGE_SCOPE_INVALID"):O(_.revision>i.since&&_.revision<=i.ceiling&&_.id>(i.cursor?.
edge_id??0),"COMM_PAGE_SCOPE_INVALID");for(let _ of d)if(i.stream==="history"){let u=y.deliveryOf(_);O(u.created_revision<=
i.ceiling,"COMM_PAGE_SCOPE_INVALID"),p.push(M(u))}else{A.validateRecord(Object.fromEntries(A.RECORD_FIELDS.map(v=>[v,_[v]])));
let u=ue(_.payload_json);if(O(["command_audit","delivery_change"].includes(u.stream),"COMM_CHANGE_CORRUPT"),u.stream==="\
command_audit")continue;O(u.revision===_.revision&&u.delivery?.recipient_id===i.target&&u.delivery?.revision===_.revision,
"COMM_CHANGE_CORRUPT");let D=u.delivery;A.iso(u.occurred_at);let f=y.deliveryOf({record_key:"DELIVERY:"+D.message_id,kind:"\
DELIVERY",scope_id:i.target,version:D.version,revision:D.revision,payload_json:A.canonical(D),last_request_id:_.last_request_id});
p.push({event:u.event,occurred_at:u.occurred_at,delivery:M(f)})}let L=d.at(-1),R=C?Buffer.from(A.canonical({v:2,stream:i.
stream,target:i.target,viewer:i.viewer,ceiling:i.ceiling,ceiling_id:c,edge_id:L.id,since:i.since}),"utf8").toString("bas\
e64url"):null;return{employee_id:i.target,stream:i.stream,revision:i.revision,snapshot_revision:i.ceiling,items:p,next_cursor:R,
sync_revision:i.stream==="changes"&&!C?i.ceiling:null,server_time:r,...X(s),unread_count:null,unacknowledged_count:null,
scanned_rows:d.length}}function Ye(e){let t=e.now||new Date().toISOString();try{let n={...e.context||{}};if(e.step==="AU\
THORIZE"){let s=y.authorizeSession({...e,now:t}),r=e.operation;O(["SEND","SHOWN","ACK","LIST","RECIPIENTS"].includes(r),
"COMM_ACTION_INVALID");let i=null;return["SEND","SHOWN","ACK"].includes(r)&&(i=y.normalizeWrite(s,r,e.body)),r==="LIST"&&
x(s,e.query||{}),r==="RECIPIENTS"&&(O(A.object(e.query)&&!Object.keys(e.query).length,"COMM_REQUEST_INVALID"),y.listRecipients(
{actor:s,employees:[],attendance:[],now:t})),{route:"AUTHORIZED",actor:s,intent:i,operation:r,body:e.body||{},query:e.query||
{},canonical:i?.canonical||A.canonical({actor_id:s.employee_id,operation:r,query:e.query||{}})}}if(e.step==="PREPARE"){let s=F(
n.config_rows);if(n.writes_enabled=s.writes_enabled,["SEND","SHOWN","ACK"].includes(n.operation)&&(n.prior||(n.pending||
[]).length)){let r=y.planWrite({...n,now:t});return r.execute?{route:"BATCH",batch:r.batch}:{route:"RETURN",response:r.response}}
return O((n.pending||[]).length===0,"COMM_RECOVERY_REQUIRED"),["SEND","SHOWN","ACK"].includes(n.operation)&&O(s.writes_enabled,
"COMM_WRITES_DISABLED"),n.operation==="SEND"&&(O(!!s.config,"COMM_CONFIG_INVALID"),O(A.ruleGate(s.config,"MANUAL").deliver,
"COMM_SEND_DISABLED")),n.operation==="LIST"?{route:"PAGE",plan:Ie({actor:n.actor,query:n.query,global_rows:n.records,pending:n.
pending})}:{route:["SEND","RECIPIENTS"].includes(n.operation)?"PEOPLE":"RECEIPT"}}if(e.step==="PLAN_WRITE"){O((n.employees||
[]).length<=1e3&&(n.attendance||[]).length<=100,"COMM_RECIPIENT_CAPACITY_EXCEEDED");let s=y.planWrite({...n,writes_enabled:F(
n.config_rows).writes_enabled,now:t});return s.execute?{route:"BATCH",batch:s.batch}:{route:"RETURN",response:s.response}}
if(e.step==="RECIPIENTS")return O(e.employees.length<=1e3&&e.attendance.length<=100,"COMM_RECIPIENT_CAPACITY_EXCEEDED"),
{route:"RETURN",response:{http_status:200,body:{ok:!0,request_id:"",data:{items:y.listRecipients({...e,now:t}),...X(e.config_rows)},
meta:{api_version:"2.0",server_time:t}}}};if(e.step==="PAGE")return{route:"RETURN",response:{http_status:200,body:{ok:!0,
request_id:"",data:Me({...e,now:t}),meta:{api_version:"2.0",server_time:t}}}};O(!1,"COMM_ACTION_INVALID")}catch(n){return{
route:"RETURN",response:y.errorResponse(n,e.context?.body?.request_id||e.body?.request_id||"",t)}}}Ce.exports={controls:F,
publicControls:X,readQuery:x,readPlan:Ie,finishPage:Me,dispatch:Ye}});return He();})();

return [{json:MOLCommRules.dispatch($input.first().json)}];
