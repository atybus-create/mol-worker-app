'use strict';
// The report is an asynchronous mirror of one atomic published month bundle.
// It never edits attendance, the production ledger, or V1 sheets.
function need(ok, code) {if (!ok) {const e=new Error(code);e.code=code;throw e;}}
const TABS={daily:'Normy dzienne V2',monthly:'Normy miesi\u0119czne V2'};
const SOURCE='https://github.com/atybus-create/mol-worker-app/blob/main/backend/v2/metrics/domain.cjs';
function makeReportRow(n, version, row, monthly=false) {
  const date=monthly?n.month:n.work_date, available=monthly?n.freshness!=='UNAVAILABLE':n.has_value===true;
  for(const key of ['eligible_pak','eligible_pick','outside_pak','outside_pick','pak_seconds','pick_seconds'])need(Number.isFinite(n[key])&&n[key]>=0,'NORM_REPORT_NUMBER_INVALID');
  const result=[n.summary_id,n.employee_id,date,monthly?'MONTH':n.state,n.eligible_pak,n.eligible_pick,n.outside_pak,n.outside_pick,n.pak_seconds,n.pick_seconds,
    `=I${row}/Y${row}`,`=J${row}/Y${row}`,70,210,
    `=IF(OR(U${row}=FALSE;I${row}=0);"";E${row}/(I${row}/Y${row}*M${row}))`,
    `=IF(OR(U${row}=FALSE;J${row}=0);"";F${row}/(J${row}/Y${row}*N${row}))`,
    `=IF(OR(U${row}=FALSE;SUM(I${row}:J${row})=0);"";(E${row}+F${row}/(N${row}/M${row}))/(SUM(I${row}:J${row})/Y${row}*M${row}))`,
    n.freshness,n.coverage||'',version,available,n.calculated_at,n.source_error||n.reason||'',SOURCE,3600];
  const expected=[...result];result[2]="'"+date;result[21]="'"+n.calculated_at;expected[10]=n.pak_seconds/3600;expected[11]=n.pick_seconds/3600;
  for(const [idx,key] of [[14,'pak_percent'],[15,'pick_percent'],[16,'combined_percent']])expected[idx]=n[key]===null?'':n[key]/100;
  return {values:result,expected};
}
function planMirror(publication,indexRows,spreadsheetId) {
  need(/^MOL\d+:\d{4}-(0[1-9]|1[0-2])$/.test(publication?.summary_id||'')&&Number.isSafeInteger(publication.version)&&publication.version>0,'NORM_PUBLICATION_INVALID');
  const p=JSON.parse(publication.payload_json);need(p.schema_version===1&&publication.summary_id===p.employee_id+':'+p.month&&Array.isArray(p.days)&&p.days.length<=31,'NORM_BUNDLE_INVALID');
  need(p.monthly?.summary_id===publication.summary_id&&p.monthly.employee_id===p.employee_id,'NORM_MONTH_INVALID');
  const slots=indexRows.filter(x=>x.kind==='NORM_MONTH'),key='NORM:'+publication.summary_id,existing=slots.filter(x=>x.report_key===key);
  need(existing.length<=1&&new Set(slots.map(x=>x.row_number)).size===slots.length&&new Set(slots.map(x=>x.report_key)).size===slots.length,'REPORT_INDEX_DUPLICATE');
  need(slots.every(x=>Number.isSafeInteger(x.row_number)&&x.row_number>0),'REPORT_INDEX_INVALID');
  const slot=existing[0]?.row_number||Math.max(0,...slots.map(x=>x.row_number))+1;
  need(slot*31+1<=20000&&slot+1<=1000,'REPORT_CAPACITY');
  need(new Set(p.days.map(x=>x.work_date)).size===p.days.length,'REPORT_DAY_DUPLICATE');
  const rows=p.days.map(n=>{need(n.employee_id===p.employee_id&&n.work_date.startsWith(p.month+'-')&&n.summary_id===n.employee_id+':'+n.work_date,'REPORT_DAY_SCOPE');const day=Number(n.work_date.slice(-2));need(day>=1&&day<=31,'REPORT_DAY_INVALID');const row=(slot-1)*31+day+1;return {range:`'${TABS.daily}'!A${row}:Y${row}`,...makeReportRow(n,publication.version,row)};});
  rows.push({range:`'${TABS.monthly}'!A${slot+1}:Y${slot+1}`,...makeReportRow(p.monthly,publication.version,slot+1,true)});
  const index={report_key:key,kind:'NORM_MONTH',summary_id:publication.summary_id,row_number:slot};
  const ranges=[`'${TABS.daily}'!A1:Y1`,`'${TABS.monthly}'!A1:Y1`,...rows.map(x=>x.range)];
  const readUrl='https://sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+'/values:batchGet?'+ranges.map(x=>'ranges='+encodeURIComponent(x)).join('&')+'&valueRenderOption=UNFORMATTED_VALUE';
  return {summary_id:publication.summary_id,version:publication.version,slot,index,rows,read_url:readUrl,write_body:{valueInputOption:'USER_ENTERED',data:rows.map(x=>({range:x.range,values:[x.values]}))}};
}
function guardMirror(plan,response) {
  const rs=response?.valueRanges;need(Array.isArray(rs)&&rs.length===plan.rows.length+2,'NORM_DRIVE_READ_FAILED');
  for(const h of rs.slice(0,2))need(h.values?.[0]?.[0]==='summary_id'&&h.values[0][19]==='Wersja publikacji','NORM_REPORT_HEADER_INVALID');
  for(let i=0;i<plan.rows.length;i++){const old=rs[i+2].values?.[0]||[],target=plan.rows[i];if(!old.length||old.every(x=>x===''||x===null))continue;need(old[0]===target.values[0],'NORM_REPORT_ROW_MOVED');need(Number.isSafeInteger(old[19])&&old[19]<=plan.version,'NORM_REPORT_NEWER_VERSION');}
  return true;
}
function verifyMirror(plan,response) {
  guardMirror(plan,response);
  for(let i=0;i<plan.rows.length;i++){
    const actual=response.valueRanges[i+2].values?.[0]||[],expected=plan.rows[i].expected;
    for(let k=0;k<expected.length;k++){const e=expected[k],a=actual[k]??'';need(typeof e==='number'?typeof a==='number'&&Math.abs(a-e)<1e-8:a===e,'NORM_DRIVE_READBACK_MISMATCH');}
  }
  return true;
}
function retryMirror(job,error,now) {const attempts=(job.attempts||0)+1;return {attempts,status:attempts>=8?'DEAD_LETTER':'RETRY_PENDING',last_error:String(error||'NORM_DRIVE_FAILED').slice(0,100),next_attempt_at:new Date(Date.parse(now)+Math.min(1800000,30000*2**Math.min(attempts,6))).toISOString(),lease_owner:'',lease_until:'1970-01-01T00:00:00.000Z'};}
if(typeof module!=='undefined')module.exports={TABS,makeReportRow,planMirror,guardMirror,verifyMirror,retryMirror};
