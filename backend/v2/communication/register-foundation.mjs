// Idempotent local/repository registration only. Does not call n8n or change live data.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const write=(p,v)=>writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');
const deployment=read('./deployment.json'),addition=read('./schema.additive.json');
const manifest=read('../manifest.json'),schema=read('../schema.json');
assert.equal(schema.schema_version,1);assert.equal(manifest.schema_version,1);
assert.equal(manifest.project_id,'2QU4nSVpDVPvyHyw');
for(const t of addition.tables){
 assert.ok(/^MOL_V2_COMM_(RECORDS|COMMANDS)$/.test(t.name));
 const old=schema.tables.filter(x=>x.name===t.name);assert.ok(old.length<=1);
 if(old.length)assert.deepEqual(old[0],t,'Existing schema differs: '+t.name);else schema.tables.push(t);
}
// IDs of tables/workflows are immutable deployment identities. A mismatch means
// somebody changed the contract and must be reviewed instead of silently replaced.
for(const [key,value]of Object.entries(deployment.tables||{})){
 if(Object.hasOwn(manifest.tables,key))assert.equal(manifest.tables[key],value,'Refuse to overwrite changed table reference '+key);
 else manifest.tables[key]=value;
}
for(const [key,value]of Object.entries(deployment.workflows||{})){
 if(Object.hasOwn(manifest.workflows,key))assert.equal(manifest.workflows[key],value,'Refuse to overwrite changed workflow reference '+key);
 else manifest.workflows[key]=value;
}
// deployment.json is the reviewed read-back of LIVE for communication-owned
// workflows. Version pointers legitimately move after an n8n publish, so update
// only keys whose workflow identity is present and matches this deployment.
for(const [key,value]of Object.entries(deployment.active_versions||{})){
 assert.ok(Object.hasOwn(deployment.workflows,key),'Active version without deployment workflow: '+key);
 assert.equal(manifest.workflows[key],deployment.workflows[key],'Workflow identity mismatch for active version '+key);
 manifest.active_versions[key]=value;
}
// Likewise the communication block is a versioned deployment snapshot, not a
// once-only bootstrap object. Re-running this script must be deterministic.
manifest.communication=deployment.communication;
write('../schema.json',schema);write('../manifest.json',manifest);
console.log('Stage 8 registration OK: additive schema preserved and reviewed deployment snapshot synchronized.');
