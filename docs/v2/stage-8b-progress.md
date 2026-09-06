# Stage 8B — ES alert orchestration

Checkpoint: 2026-09-06. Branch: `codex/stage8b-es-orchestrator`.

Status: **IN PROGRESS / WIRED / FAIL-CLOSED**. Infrastruktura automatycznych alertów ES jest połączona live, ale nie może konsumować danych ani wysyłać alertów przy aktualnej konfiguracji.

## Stan live n8n

| Element | Workflow ID | Stan |
|---|---|---|
| COMM ALERT SOURCE GATE | `0bpqCpUMsIRQW8OY` | ACTIVE; scheduler 1 min; active version `935f8165-d20e-4b1a-b17a-69e44dd8c361`; config gate zamknięty |
| COMM ES ALERT CONTEXT | `qs36Tri1hIQhU5FH` | ACTIVE internal |
| COMM ES ALERT RULE ROUTER | `fSwg0ADFK3aQhoqY` | ACTIVE internal |
| COMM ES ALERT ORCHESTRATOR | `7ugYR0OFPvtX2ySr` | ACTIVE internal |
| COMM ALERT SOURCE CLAIM | `WgG4GvDQAPydveXr` | ACTIVE internal |
| COMM ALERT SOURCE ACK | `7G4qKHql2OQjHROe` | ACTIVE internal |
| COMM ES ALERT RECORD READER | `sofdr5km1LvSPrWB` | ACTIVE internal |
| COMM ES ALERT BUNDLE PERSISTENCE | `pcU9LO1WZfG3Fj0Y` | ACTIVE internal |
| COMM ES ALERT COORDINATOR | `XJJLQwqjG5nhdfRT` | ACTIVE internal |
| COMM ES ALERT PERSISTENCE (single-rule rollback/reference) | `DWnFXZVIptjMSoax` | INACTIVE |

Tylko Source Gate ma autonomiczny trigger. Pozostałe elementy są publikowane wyłącznie jako sub-workflowy.

## Bezpieczna konfiguracja — potwierdzona po wdrożeniu

`COMMUNICATIONS_CONFIG` nadal ma:
- `mode=LIVE`,
- `history_policy=HOLD`,
- `auto_alert_consumer_enabled=false`,
- `es_verified=false`,
- `alert_cutover_outbox_id=7689`,
- wszystkie reguły automatyczne `enabled=false`,
- niezatwierdzone progi, ACK i godziny = `null`.

Source Gate kończy wykonanie w `Gate` przed `Read Pending Alerts`. Po publikacji nowego grafu lista błędnych wykonań Source Gate = 0.

## Zaimplementowany przepływ

`Schedule -> config gate -> post-cutover ALERT_DERIVED -> Loop Sources(batch=1) -> Coordinator`

Coordinator:
1. warunkowy CLAIM konkretnego źródła,
2. Context + trzy reguły ES,
3. fail-closed, jeżeli brakuje zatwierdzonej polityki delivery,
4. dla no-change: ACK source success bez COMM mutation,
5. dla zmian: kanoniczny intent -> SHA-256 -> deterministyczny UUID request_id,
6. warunkowy `command-writer` zgodny z istniejącym COMM API,
7. selektywny odczyt COMM records,
8. jeden atomiczny bundle dla wszystkich reguł i jedna globalna COMM revision,
9. zapis wyłącznie przez istniejący `COMM BATCH SERVICE`,
10. release writer + read-back owner,
11. source ACK success/failure/release.

Źródłowy lease z niepustym ownerem nie jest przejmowany automatycznie tylko z powodu upływu czasu. Taki przypadek nadal wymaga potwierdzenia zakończenia execution właściciela.

## Ważna poprawka wykryta runtime

Pierwszy Record Reader używał filtra Data Table `contains` dla prefiksu delivery. Walidator n8n dawał 0 błędów, ale rzeczywiste wykonanie `648582` zwróciło `Unsupported filter condition: contains`.

Rozwiązanie:
- brak pełnego skanu `COMM_RECORDS`,
- przy tworzeniu epizodu zamrażana jest lista `episode.details.delivery_recipient_ids`,
- reader czyta `STATE`, `EPISODE` i wszystkie znane `DELIVERY` po dokładnym `record_key eq`,
- realny runtime exact-key zwrócił poprawnie `STATE:COMM_GLOBAL`.

Nie wracać do `contains` bez potwierdzenia zmiany runtime n8n.

## Testy wykonane

### GitHub CI
Dedykowany Stage 8B CI: SUCCESS. Obejmuje:
- domenowy orchestrator,
- atomiczny multi-rule bundle,
- parity standalone runtime vs domena,
- istniejące testy alert source i single-rule persistence,
- kontrolę, że bundle persistence nie ma własnego Data Table/HTTP/schedulera i mutuje wyłącznie przez `COMM BATCH SERVICE`.

### Runtime — Orchestrator / CLAIM
Na historycznym `7687`:
- Orchestrator: HTTP 200, `blocked=true`, `CONSUMER_DISABLED`, `persist=false`,
- CLAIM: HTTP 200, `acquired=false`, `CONSUMER_DISABLED`,
- po testach `7687` nadal `PENDING`, attempts=0, lease pusty.

### Runtime — ACK
Izolowany fixture `STAGE8B_ACK_PROBE_20260906`, id 8377:
- success: PENDING -> DONE, attempts 0 -> 1, lease wyczyszczony,
- replay: `ALREADY_DONE`, bez drugiego naliczenia,
- fixture i probe usunięte.

### Runtime — atomic bundle persistence no-write
Request `33333333-3333-4333-8333-333333333333` z trzema decyzjami DISABLED:
- HTTP 200,
- `executed=false`, `NO_CHANGE`, revision 0,
- 0 rekordów w COMM_COMMANDS,
- 0 rekordów COMM_RECORDS z tym request_id.

### Runtime — Loop Over Items
Izolowany test 3 elementów:
- trzy osobne iteracje,
- wynik 1/2/3 zachowany,
- potwierdzono `done=index 0`, `loop=index 1`.

Pierwszy partial patch Source Gate błędnie opublikował oba połączenia na output 0 mimo poprawnej walidacji. Ponieważ config gate był zamknięty, żaden source nie dotarł do pętli. Poprawiono pełnym 8-węzłowym update'em; aktywny read-back potwierdza dwa osobne wyjścia.

### Runtime — cały Coordinator przy zamkniętej bramie
Historyczne źródło 7687:
- HTTP 200,
- `processed=false`, `reason=CONSUMER_DISABLED`,
- źródło nadal PENDING / attempts 0 / lease pusty,
- końcowo `command-writer.owner=''`.

Wszystkie jednorazowe probe workflowy usunięto.

## Kod na gałęzi

Dodano/zmieniono m.in.:
- `backend/v2/communication/es-alert-orchestrator.cjs`,
- `backend/v2/communication/es-alert-bundle.cjs`,
- `backend/v2/communication/build-es-alert-rule-router.mjs`,
- `backend/v2/communication/build-es-alert-orchestrator-workflow.mjs`,
- `backend/v2/communication/build-es-alert-bundle-workflow.mjs`,
- `scripts/test-v2-communication-es-alert-orchestrator.cjs`,
- `scripts/test-v2-communication-es-alert-bundle.cjs`,
- `scripts/test-v2-communication-es-alert-bundle-runtime.cjs`,
- `.github/workflows/stage8b-orchestrator.yml`,
- `backend/v2/communication/deployment.json`.

## Pozostałe bramy przed realnym automatem

1. **Stage 7 ES positive verification:** realny pozytywny PAK/PICK nadal niepotwierdzony. `es_verified` musi pozostać `false`.
2. **Polityka automatycznych alertów:** użytkownik nie zatwierdził odbiorców, treści i ACK dla WRONG_PROCESS / WORK_OUTSIDE_APP / NO_ACTIVITY. System celowo zwraca `COMM_ES_DELIVERY_POLICY_REQUIRED` zamiast zgadywać.
3. Dokończyć repo parity dla live-only Context/CLAIM/ACK/Record Reader/Coordinator: generator lub sanitizowany snapshot + test struktury.
4. Po pkt 1–3 wykonać kontrolowany post-cutover E2E: OPEN, RESOLVE, delivery, ACK, retry, COMMAND_BUSY, source retry/dead-letter, race dwóch schedulerów i read-back COMM/Drive/UI.
5. Dopiero potem zaktualizować acceptance-log, scalić branch do `main` i wystawić Stage 8B do odbioru.

Nie zmieniono V1. Nie wykonywano nowych zapisów Moniti; zgoda na realne Moniti z 2026-09-05 nie została rozszerzona.
