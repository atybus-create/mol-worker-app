# Stage 8B — ES alert orchestration

Checkpoint: 2026-09-06. Branch: `codex/stage8b-es-orchestrator`.

Status: **READY FOR REAL DATA TEST / WIRED / FAIL-CLOSED**. Infrastruktura automatycznych alertów ES jest połączona live i przetestowana technicznie do granicy rzeczywistego dodatniego PAK/PICK. Przy aktualnej konfiguracji nie może konsumować źródeł ani wysyłać automatycznych alertów.

## Stan live n8n

| Element | Workflow ID | Active version / stan |
|---|---|---|
| COMM ALERT SOURCE GATE | `0bpqCpUMsIRQW8OY` | `935f8165-d20e-4b1a-b17a-69e44dd8c361`; ACTIVE; scheduler 1 min; config gate zamknięty |
| COMM ES ALERT CONTEXT | `qs36Tri1hIQhU5FH` | `998cab14-5eb1-4a1d-9706-0c3baa2e75e4`; ACTIVE internal |
| COMM ES ALERT RULE ROUTER | `fSwg0ADFK3aQhoqY` | `28326530-c6a3-4028-9007-90fe64104225`; ACTIVE internal |
| COMM ES ALERT ORCHESTRATOR | `7ugYR0OFPvtX2ySr` | `0afc126b-9090-4ad0-8bb6-f125b31bc99c`; ACTIVE internal |
| COMM ALERT SOURCE CLAIM | `WgG4GvDQAPydveXr` | `4882af08-e567-4414-947d-41ec3ca4d935`; ACTIVE internal |
| COMM ALERT SOURCE ACK | `7G4qKHql2OQjHROe` | `c384de0b-1f79-40f9-b328-c2f94227c061`; ACTIVE internal |
| COMM ES ALERT RECORD READER | `sofdr5km1LvSPrWB` | `b7da1214-9b8b-42bf-82e1-63ccec90299d`; ACTIVE internal |
| COMM ES ALERT BUNDLE PERSISTENCE | `pcU9LO1WZfG3Fj0Y` | `845432d1-30fc-4f24-ab26-cf0ea755e687`; ACTIVE internal |
| COMM ES ALERT COORDINATOR | `XJJLQwqjG5nhdfRT` | `b831e7ed-e799-413f-98ad-80a8653145e9`; ACTIVE internal |
| COMM ES ALERT PERSISTENCE single-rule rollback | `DWnFXZVIptjMSoax` | INACTIVE |

Tylko Source Gate ma autonomiczny trigger. Pozostałe elementy są opublikowane wyłącznie jako sub-workflowy.

Dokładny kontrakt komponentów jest przypięty w `backend/v2/communication/stage8b-live-contract.json` i testowany w CI.

## Bezpieczna konfiguracja

`COMMUNICATIONS_CONFIG` nadal ma:
- `mode=LIVE`,
- `history_policy=HOLD`,
- `auto_alert_consumer_enabled=false`,
- `es_verified=false`,
- `alert_cutover_outbox_id=7689`,
- wszystkie reguły automatyczne `enabled=false`,
- niezatwierdzone progi, ACK i godziny = `null`.

Nie zmieniono tych flag podczas przygotowania do testu.

## Zaimplementowany przepływ

`Schedule -> config gate -> post-cutover ALERT_DERIVED -> Loop Sources(batch=1) -> Coordinator`

Coordinator wykonuje:
1. warunkowy CLAIM konkretnego źródła,
2. Context + trzy reguły ES,
3. fail-closed przy braku zatwierdzonej polityki delivery,
4. no-change -> source ACK success bez COMM mutation,
5. dla zmian: kanoniczny intent -> SHA-256 -> deterministyczny UUID request_id,
6. warunkowy `command-writer` zgodny z COMM API,
7. exact-key odczyt COMM records,
8. jeden atomiczny bundle dla wszystkich reguł i jedna globalna COMM revision,
9. zapis wyłącznie przez istniejący `COMM BATCH SERVICE`,
10. release writer + read-back owner,
11. source ACK success/failure/release.

Źródłowy lease z niepustym ownerem nie jest przejmowany automatycznie tylko z powodu upływu czasu.

## Ważna poprawka runtime n8n

Data Table `contains` przechodziło statyczny walidator, ale realny runtime zwracał `Unsupported filter condition: contains`. Record Reader został przebudowany na dokładne `record_key eq`; nie używać ponownie `contains` bez nowego potwierdzenia runtime.

## Testy do tej granicy

- cały Stage 8B CI: SUCCESS,
- pełny `Validate frontend`: SUCCESS,
- live walidacja COMM API, Drive Mirror, Worker Status i wszystkich komponentów Stage 8B: 0 błędów,
- manual COMM SEND/SHOWN/ACK/LIST/RECIPIENTS: 0 błędów walidacji,
- Stage 7 ES INGEST / SUMMARY RECALCULATOR / NORM DRIVE: 0 błędów walidacji,
- Orchestrator przy zamkniętej bramie: `CONSUMER_DISABLED`, bez zapisu,
- CLAIM przy zamkniętej bramie: bez lease i bez zmiany źródła,
- ACK synthetic fixture: success + idempotent replay; fixture usunięty,
- atomic bundle no-write: 0 COMM_COMMANDS / 0 COMM_RECORDS,
- Source Gate loop: 3 wejścia -> 3 sekwencyjne iteracje,
- full Coordinator smoke: `processed=false / CONSUMER_DISABLED`,
- wszystkie jednorazowe probe workflowy z bieżących testów usunięto,
- wyszukiwanie `STAGE8B` w OUTBOX / COMM_RECORDS / COMM_COMMANDS: 0 pozostałości.

Historyczny legacy source `id=7687` pozostaje `PENDING`, attempts=0, lease pusty i jest poniżej cutover 7689 — nie może być konsumowany nową ścieżką.

## Preflight Stage 7 przed testem 07.09

Stan na końcu 06.09:
- `PRODUCTION_DELTAS`: 0 rekordów,
- niedokończone `ES_DERIVED`: 0,
- niedokończone `ATTENDANCE_DERIVED`: 0,
- niedokończone `NORM_DRIVE`: 0,
- `ES_BATCHES PREPARED`: 0,
- `COMMANDS RECOVERY_REQUIRED`: 0,
- `command-writer`: wolny,
- scheduler metryk: 1 minuta; ostatnie obserwowane wykonania zakończone success,
- `ES_ENABLED=true`, `METRICS_ENABLED=true`, `NORM_DRIVE_ENABLED=true`, `WRITES_ENABLED=true`, `MONITI_ENABLED=true`.

Dzisiejsze checkpointy ES mają `ES_REPORT_EMPTY` i brak `last_good_at`, co jest zgodne z brakiem niedzielnego raportu. To nie jest dowód 0 produkcji.

Dokładny snapshot Stage 7: `backend/v2/metrics/stage7-live-contract.json`.

## Istotna granica ALERT_DERIVED

`METRICS TASK ACK` tworzy `ALERT_DERIVED` tylko wtedy, gdy co najmniej jedna reguła komunikacji ma `enabled=true`. Przy aktualnej konfiguracji poprawny realny test Stage 7 nie powinien sam utworzyć nowego `ALERT_DERIVED`.

Dlatego pierwszy Stage 8B test na realnych danych ma być read-only: prawdziwy zakończony `ES_DERIVED` -> kontrolowane wejście do `COMM ES ALERT CONTEXT`. Nie włączać consumer/rules tylko w celu uzyskania source alertu.

## Blokada Moniti na 07.09

Attendance Service i Moniti Adapter nadal ograniczają realny zapis Moniti do 06.09 oraz wcześniej uzgodnionych kont. `MONITI_ENABLED=true`.

Nie rozszerzono dziś tego zakresu. Jeżeli 07.09 wybrany pracownik nie będzie miał prawidłowo otwartej obecności wymaganej do testu, przed START/korektą potrzebne jest jawne zatwierdzenie nowego okna testowego Moniti.

## Następny krok

Uruchomić runbook `docs/v2/stage7-stage8b-live-test-20260907.md`:
1. pierwszy dobry odczyt ES = baseline bez historycznej produkcji,
2. późniejszy rzeczywisty wzrost PAK/PICK = pozytywny dowód Stage 7,
3. read-only Context Stage 8B na tym samym prawdziwym batchu,
4. dopiero po PASS można rozważyć `es_verified=true`; consumer i rules nadal pozostają false,
5. osobno użytkownik zatwierdza odbiorców, treść, ACK i próg NO_ACTIVITY przed pełnym alert E2E.

Stage 7 i Stage 8B **nie są jeszcze odebrane**. Granica następnej pracy to dokładnie test na żywych danych.

Nie zmieniono V1. Nie wykonywano nowych zapisów Moniti ani nie rozszerzono ich zakresu.
