const fs = require('fs');
const path = require('path');

const contractPath = path.join(__dirname, '..', 'docs', 'v2', 'openapi.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const failures = [];

function resolveRef(ref) {
  return ref
    .split('/')
    .slice(1)
    .reduce((value, key) => value[key], contract);
}

function dereference(value) {
  return value && value.$ref ? resolveRef(value.$ref) : value;
}

function checkReferences(value, location = '#') {
  if (!value || typeof value !== 'object') return;
  if (value.$ref) {
    try {
      if (!resolveRef(value.$ref)) failures.push(`Unresolved reference at ${location}: ${value.$ref}`);
    } catch {
      failures.push(`Unresolved reference at ${location}: ${value.$ref}`);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    checkReferences(child, `${location}/${key}`);
  }
}

if (contract.openapi !== '3.1.0') failures.push('OpenAPI version must be 3.1.0');
checkReferences(contract);

const operationIds = [];
let endpointCount = 0;

for (const [endpointPath, rawPathItem] of Object.entries(contract.paths)) {
  if (!endpointPath.startsWith('/mol-app-v2-')) {
    failures.push(`Path outside V2 namespace: ${endpointPath}`);
  }

  const pathItem = dereference(rawPathItem);
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const operation = pathItem[method];
    if (!operation) continue;
    endpointCount += 1;
    operationIds.push(operation.operationId);

    if (method === 'get') continue;
    const requestBody = dereference(operation.requestBody);
    const schema = dereference(requestBody?.content?.['application/json']?.schema);
    if (!schema?.required?.includes('request_id')) {
      failures.push(`${method.toUpperCase()} ${endpointPath} does not require request_id`);
    }
  }
}

const duplicateOperationIds = operationIds.filter(
  (operationId, index) => operationIds.indexOf(operationId) !== index,
);
if (duplicateOperationIds.length) {
  failures.push(`Duplicate operationId: ${[...new Set(duplicateOperationIds)].join(', ')}`);
}

const attendanceStates = contract.components.schemas.Attendance.properties.state.enum;
if (JSON.stringify(attendanceStates) !== JSON.stringify(['NOT_STARTED', 'OPEN', 'CLOSED'])) {
  failures.push('Attendance state must contain only NOT_STARTED, OPEN and CLOSED');
}

const syncStates = contract.components.schemas.SyncState.enum;
if (attendanceStates.some((state) => syncStates.includes(state))) {
  failures.push('Business and synchronization states overlap');
}

for (const field of ['snapshot_version', 'calculated_at', 'norm', 'attendance', 'process']) {
  if (!contract.components.schemas.WorkerStatus.required.includes(field)) {
    failures.push(`WorkerStatus does not require ${field}`);
  }
}

if (failures.length) {
  console.error('V2 contract validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`V2 contract OK: ${endpointCount} endpoints, ${operationIds.length} unique operations.`);
console.log('All mutating operations require request_id.');
console.log('Attendance, synchronization and snapshot invariants are preserved.');
