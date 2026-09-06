# MOL V2 — Stage 8B ES alert persistence evidence

Date: 2026-09-06

## Scope

This checkpoint covers the generic persistence adapter shared by the ES-dependent communication rules `WRONG_PROCESS`, `WORK_OUTSIDE_APP`, and `NO_ACTIVITY`. It does not enable those rules, choose alert thresholds, invent ACK policy, choose final message wording, or define final worker/leader recipient policy.

The adapter materializes only an already prepared rule decision and explicit `delivery_intents`. Its only mutation path delegates to the reviewed `COMM BATCH SERVICE`; it has no Data Table node, HTTP node, schedule, webhook, form, or chat trigger.

## Live workflow

- Name: `MOL // APP V2 // COMM ES ALERT PERSISTENCE`
- ID: `DWnFXZVIptjMSoax`
- Final state at this checkpoint: **INACTIVE / unpublished**
- Internal trigger only: `Execute Workflow Trigger`
- Nodes: 6
- Mutation delegate: `COMM BATCH SERVICE` / `J3qIFff05cYGDW7C`
- Shared error workflow: `rnELTCKClbzY8lxZ`
- Successful execution retention: disabled

The service was published temporarily only to allow one controlled internal call, then immediately returned to INACTIVE. Because it has no autonomous or public trigger, publishing it for that test did not create an automatic execution source.

## Runtime proof — no-write path

Temporary probe workflow `9mxaxHNiuwogUNyy` supplied a hard-coded decision:

- type: `WRONG_PROCESS`
- status: `CLEAR`
- reason: `TEST_NO_CHANGE`
- `open=null`
- `resolve=[]`
- `deliver=false`
- `records=[]`
- request id: `55555555-5555-4555-8555-555555555555`

Production webhook execution `642355` completed successfully and returned:

```json
{"ok":true,"executed":false,"reason":"TEST_NO_CHANGE","revision":0}
```

Post-run database checks:

- `MOL_V2_COMM_COMMANDS` (`7JVuBY9l6ISR2YBz`) filtered by the test request id: **0 rows**
- `MOL_V2_COMM_RECORDS` (`42jIxvSmSVGdlxB8`) filtered by `last_request_id`: **0 rows**

Therefore the tested no-change decision did not enter the batch write path and produced no journal or communication record. The temporary probe was deactivated and then deleted after evidence collection.

## Domain and generated-workflow regression

Repository coverage includes:

- `scripts/test-v2-communication-es-alert-persistence.cjs`
- `scripts/test-v2-communication-es-alert-persistence-runtime.cjs`
- `scripts/test-v2-communication-es-alert-persistence-workflow.cjs`

The compact n8n runtime is parity-tested against the fuller domain implementation for new episodes, multiple recipients, replay/no-duplicate behavior, resolution, ACK preservation, resolve+open transition, reopen rejection, and delivery conflicts.

The generated workflow test requires an internal-only graph, no direct database/HTTP node, a per-item planner output, explicit write gating, and `J3qIFff05cYGDW7C` as the sole persistence delegate.

## Static validator note

`n8n_validate_workflow` currently reports one static error on the large `Plan Persistence` Code node: `Array items must be objects with json property`. The same workflow executes successfully in the real n8n runtime on the controlled no-write path. A minimal per-item Code node with the same n8n output contract validates cleanly, and the post-run table checks confirm that the real child returned through the expected no-write branch.

This validator discrepancy is recorded as an open tooling/static-analysis limitation. It is **not** reported as a clean validator result. The workflow remains INACTIVE while higher-level ES orchestrators are not connected.

## Safety state unchanged

- `auto_alert_consumer_enabled=false`
- legacy cutover remains `alert_cutover_outbox_id=7689`
- `history_policy=HOLD`
- ES-dependent rules remain disabled
- Stage 7 ES verification remains a separate open dependency
- no legacy `ALERT_DERIVED` record was processed or modified by this checkpoint

## Next integration boundary

The next implementation step is an orchestrator that converts a verified ES/source observation into a rule decision plus explicit delivery intents, then calls this persistence service. That integration must remain fail-closed until Stage 7 ES input is verified and the unresolved rule parameters/recipient policy are explicitly confirmed.
