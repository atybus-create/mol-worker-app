import {readFileSync,writeFileSync} from 'node:fs';

const path=new URL('./candidate-workflows/comm-api-service.json',import.meta.url);
const w=JSON.parse(readFileSync(path,'utf8'));
const read=w.nodes.find(n=>n.name==='Read Page');
if(!read)throw Error('COMM_READ_PAGE_MISSING');
if(w.nodes.some(n=>n.name==='History Page'||n.name==='Read Changes Page'))throw Error('COMM_PAGE_FINALIZER_ALREADY_APPLIED');
const table=read.parameters.dataTableId;
const ex=s=>`={{ ${s} }}`;
read.position=[520,820];
read.parameters={
 resource:'row',operation:'get',dataTableId:table,matchType:'allConditions',
 filters:{conditions:[
  {keyName:'kind',condition:'eq',keyValue:'DELIVERY'},
  {keyName:'scope_id',condition:'eq',keyValue:ex("$('Prepare').first().json.plan.target")},
  {keyName:'id',condition:'lt',keyValue:ex("$('Prepare').first().json.plan.cursor?.edge_id ?? 2147483647")}
 ]},options:{},returnAll:false,limit:ex("$('Prepare').first().json.plan.limit + 1"),
 orderBy:true,orderByColumn:'id',orderByDirection:'DESC'
};
read.alwaysOutputData=true;read.executeOnce=true;
const history={
 id:'history-page',name:'History Page',type:'n8n-nodes-base.if',typeVersion:2.2,position:[260,880],
 parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'History Page',leftValue:ex("$json.plan.stream === 'history'"),rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}}
};
const changes={
 id:'read-changes-page',name:'Read Changes Page',type:'n8n-nodes-base.dataTable',typeVersion:1.1,position:[520,940],alwaysOutputData:true,executeOnce:true,
 parameters:{resource:'row',operation:'get',dataTableId:table,matchType:'allConditions',filters:{conditions:[
  {keyName:'kind',condition:'eq',keyValue:'EVENT'},
  {keyName:'scope_id',condition:'eq',keyValue:ex("$('Prepare').first().json.plan.target")},
  {keyName:'revision',condition:'gt',keyValue:ex("$('Prepare').first().json.plan.since")},
  {keyName:'revision',condition:'lte',keyValue:ex("$('Prepare').first().json.plan.ceiling")},
  {keyName:'id',condition:'gt',keyValue:ex("$('Prepare').first().json.plan.cursor?.edge_id ?? 0")}
 ]},options:{},returnAll:false,limit:ex("$('Prepare').first().json.plan.limit + 1"),orderBy:true,orderByColumn:'id',orderByDirection:'ASC'}
};
w.nodes.push(history,changes);
const link=node=>({node,type:'main',index:0});
if(!w.connections['Needs Page']?.main?.[0]?.some(x=>x.node==='Read Page'))throw Error('COMM_NEEDS_PAGE_ROUTE_INVALID');
w.connections['Needs Page'].main[0]=[link('History Page')];
w.connections['History Page']={main:[[link('Read Page')],[link('Read Changes Page')]]};
w.connections['Read Changes Page']={main:[[link('Page Input')]]};
writeFileSync(path,JSON.stringify(w,null,2)+'\n');
console.log('COMM API pagination finalization OK: explicit history/change filters.');
