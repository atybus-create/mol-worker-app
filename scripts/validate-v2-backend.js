const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..', 'backend', 'v2');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const schema = read('schema.json');
const manifest = read('manifest.json');
const allowedTables = new Set(Object.values(manifest.tables));
const workflows = fs.readdirSync(path.join(root, 'workflows')).map(file => read(`workflows/${file}`));
assert.equal(schema.tables.length, 17);
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
    if (node.type === 'n8n-nodes-base.dataTable') {
      assert.ok(allowedTables.has(node.parameters.dataTableId.value), `Non-V2 table: ${node.name}`);
    }
    assert.ok(!node.credentials || Object.keys(node.credentials).length === 0, 'Unexpected external credential');
    if (node.type === 'n8n-nodes-base.webhook') {
      assert.ok(['mol-app-v2-health', 'mol-app-v2-stage3-test'].includes(node.parameters.path));
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
