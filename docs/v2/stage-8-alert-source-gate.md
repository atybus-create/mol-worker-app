# Stage 8 — COMM ALERT SOURCE GATE

Status: aktywny fail-closed, bez konsumpcji i bez zapisu.

- Workflow LIVE: `0bpqCpUMsIRQW8OY`
- Active version: `a05ef75f-ac98-455f-b880-0174cdcdc2fe`
- Scheduler: co 1 minutę.
- `auto_alert_consumer_enabled=false` — źródło zatrzymuje się przed OUTBOX.
- `alert_cutover_outbox_id=7689` — rekordy historyczne `id <= 7689` pozostają `HOLD`.
- Dodatkowe bramy przed odczytem źródła: `es_verified=true` oraz co najmniej jedna aktywna reguła ES (`WRONG_PROCESS`, `WORK_OUTSIDE_APP`, `NO_ACTIVITY`).
- Workflow nie zawiera Data Table write, HTTP Request ani Execute Workflow.
- Pierwszy tick LIVE: execution `640493`, SUCCESS, 51 ms; wykonane wyłącznie `Schedule -> Read Communication Config -> Gate`; `Read Pending Alerts` nie został uruchomiony.
- Po aktywacji źródła najnowszy historyczny `ALERT_DERIVED` nadal ma `id=7689`, `PENDING`, `attempts=0`.
- Test domenowy source gate: 12 przypadków.
- Test wygenerowanego grafu: 12 przypadków.

Ten element nie włącza automatycznych alertów i nie zastępuje pozytywnego E2E Stage 7 z rzeczywistym PAK/PICK w ES.
