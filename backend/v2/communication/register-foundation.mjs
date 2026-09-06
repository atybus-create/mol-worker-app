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
for(const section of ['tables','workflows','active_versions'])for(const [key,value]of Object.entries(deployment[section])){
 if(Object.hasOwn(manifest[section],key))assert.equal(manifest[section][key],value,'Refuse to overwrite changed deployment reference '+key);
 else manifest[section][key]=value;
}
if(manifest.communication)assert.deepEqual(manifest.communication,deployment.communication,'Refuse to overwrite newer communication deployment');
else manifest.communication=deployment.communication;
write('../schema.json',schema);write('../manifest.json',manifest);
console.log('Stage 8 foundation registration OK: additive schema, existing references preserved.');
