# Stage 8 communication Drive mirror

Live workflow: `NdRo0Umetu6SYpIk` — `MOL // APP V2 // COMM DRIVE MIRROR`.
Published active version verified 2026-09-06: `cfa6644a-78e1-4302-b9c6-5c8acdf1f8e6`.

Purpose: mirror committed communication delivery changes from `MOL_V2_COMM_RECORDS` to the V2 test report sheet `Komunikaty V2` (sheetId 9). Data Tables remain the operational source of truth; Drive is asynchronous reporting only.

Contract:
- schedule: once per minute plus internal execute-workflow trigger;
- bounded event read: `kind=EVENT`, `id > COMM_DRIVE_STATE.last_event_id`, ascending, batch limit from `COMM_DRIVE_CONFIG` (currently 50);
- only payloads with `stream=delivery_change` are mirrored;
- within one batch, latest revision per `message_id` wins;
- Google Sheets operation is append-or-update with `message_id` as matching key, so SHOWN/ACK/RESOLVED update the existing row rather than creating another row;
- `COMM_DRIVE_STATE.last_event_id` advances only after successful write, or after a batch containing no delivery-change rows;
- `comm-drive-writer` serializes the mirror and is released after a handled outcome;
- Drive failure does not alter communication state in Data Tables and does not block attendance/process operations.

Columns: message_id, pracownik, typ, treść, nadawca, wysłano, wyświetlono, potwierdzono, stan dostarczenia, stan przyczyny, rozwiązano, rewizja, zapisano UTC.

Live fixture verification 2026-09-06:
1. synthetic delivery/event wrote one sheet row;
2. SHOWN+ACK update for the same `message_id` updated that same row, without a duplicate;
3. state advanced to event id 207;
4. mirror lock returned free;
5. the synthetic Drive row and only its three technical Data Table records were removed after verification; the state remains at 207 so the fixture is not replayed.

This test did not create or modify attendance, process, Moniti or V1 data.
