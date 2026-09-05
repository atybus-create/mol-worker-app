const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..', 'backend', 'v2');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const schema = read('schema.json');
const manifest = read('manifest.json');
const allowedTables = new Set(Object.values(manifest.tables));
const workflows = fs.readdirSync(path.join(root, 'workflows')).map(file => read(`workflows/${file}`));
assert.equal(schema.tables.length, 24);
for (const table of schema.tables) {
  assert.ok(table.name.startsWith('MOL_V2_'));
  assert.ok(manifest.tables[table.name]);
  assert.equal(new Set(table.columns.map(c => c.name)).size, table.columns.length);
  assert.ok(!table.columns.some(c => ['id', 'createdAt', 'updatedAt'].includes(c.name)));
}
for (const workflow of workflows) {
  const names = new Set(workflow.nodes.map(node => node.name));
  assert.equal(names.size, workflow.nodes.length);
  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.code') {
      const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
      assert.doesNotThrow(() => new AsyncFunction(node.parameters.jsCode), `Invalid Code node: ${workflow.name}/${node.name}`);
    }
    if (node.type === 'n8n-nodes-base.dataTable') {
      const id=node.parameters.dataTableId.value;
      const sharedRead=workflow.name==='MOL // APP V2 // ES REPORT READ'&&node.name==='Read Shared ES Cookie'&&node.parameters.operation==='get'&&node.parameters.dataTableId.mode==='name'&&id==='ES_auth_cookie_store';
      const dynamic={
        'MOL // APP V2 // METRICS RECORD WRITER':['Read Existing','Write Row','Read Back'],
        'MOL // APP V2 // METRICS TASK ACK':['Read Source']
      };
      const auditedDynamic=(dynamic[workflow.name]||[]).includes(node.name)&&typeof id==='string'&&id.startsWith('={{ ');
      assert.ok(allowedTables.has(id)||sharedRead||auditedDynamic, `Non-V2 table: ${workflow.name}/${node.name}`);
      if(sharedRead)assert.equal(node.parameters.operation,'get');
    }
    if (node.credentials && Object.keys(node.credentials).length) {
      const allowed = {crypto: manifest.auth.receipt_credential_id, httpHeaderAuth:'jDX7MFgk2vvXqZ5f', googleSheetsOAuth2Api:'PffTtJhrPLmJ2ZrI'};
      for (const [type, credential] of Object.entries(node.credentials)) {
        assert.ok(Object.hasOwn(allowed, type));
        assert.equal(credential.id, allowed[type], `Unexpected credential: ${node.name}`);
        assert.ok(['n8n-nodes-base.crypto','n8n-nodes-base.httpRequest'].includes(node.type));
      }
    }
    if (node.type === 'n8n-nodes-base.webhook') {
      assert.ok(['mol-app-v2-health', 'mol-app-v2-stage3-test', 'mol-app-v2-auth-login', 'mol-app-v2-auth-session', 'mol-app-v2-auth-logout', ...['status','start','finish','reopen','correct'].map(op=>'mol-app-v2-attendance-'+op), ...['start','change','logout'].map(op=>'mol-app-v2-process-'+op), 'mol-app-v2-worker-status', 'mol-app-v2-norms-daily', 'mol-app-v2-norms-monthly'].includes(node.parameters.path));
    }
  }
  for (const [source, outputs] of Object.entries(workflow.connections)) {
    assert.ok(names.has(source));
    for (const branches of Object.values(outputs)) {
      for (const connections of branches) for (const connection of connections) {
        assert.ok(names.has(connection.node), `Missing target ${connection.node}`);
      }
    }
  }
}

const core = read('workflows/core-command.json');
const validate = core.nodes.find(node => node.name === 'Validate Command').parameters.jsCode;
const run = input => new Function('$input', '$execution', validate)(
  {first: () => ({json: input})}, {id: '123456'},
)[0].json;
const input = {request_id: 'e169f5ce-8c12-4b48-b6f1-313cf8133001', operation: 'CORE_PROBE', actor_id: 'SYSTEM_TEST', employee_id: 'V2_TEST', source: 'SYSTEM_TEST', payload: {value: 'stage3'}};
assert.equal(run(input).valid, true);
assert.equal(run({...input, request_id: 'bad'}).http_status, 400);
assert.equal(run({...input, actor_id: 'WORKER'}).http_status, 403);
assert.equal(run({...input, operation: 'ATTENDANCE_START'}).http_status, 422);
assert.equal(run({...input, payload: {value: 'x'.repeat(101)}}).http_status, 400);
assert.equal(run({...input, fault_after_event: true}).canonical, run(input).canonical);
assert.notEqual(run({...input, payload: {value: 'changed'}}).canonical, run(input).canonical);
const lock = core.nodes.find(node => node.name === 'Acquire Writer');
assert.equal(lock.parameters.operation, 'update');
assert.equal(lock.parameters.matchType, 'allConditions');
assert.ok(lock.parameters.filters.conditions.some(c => c.keyName === 'owner' && c.keyValue === ''));
const evidence = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'docs', 'v2', 'stage-3-evidence.json'), 'utf8'));
assert.equal(evidence.schema.every(t => t.match), true);
assert.equal(evidence.validation.every(v => v.errorCount === 0), true);
assert.equal(evidence.race.filter(r => r.status === 200).length, 1);
assert.equal(evidence.race.filter(r => r.body.error?.code === 'COMMAND_BUSY').length, 3);
assert.equal(evidence.harness_active, false);
console.log(`V2 backend OK: ${schema.tables.length} schemas, ${workflows.length} workflows; isolation, validation, lock and live evidence checked.`);
