# Stage 8B — ES alert orchestration

Checkpoint: 2026-09-06. Branch: `codex/stage8b-es-orchestrator`.

Status: **IN PROGRESS / FAIL-CLOSED**. Nie włączono automatycznych alertów i nie zmieniono konfiguracji produkcyjnej komunikacji.

## Stan live n8n

| Element | Workflow ID | Stan |
|---|---|---|
| COMM ALERT SOURCE GATE | `0bpqCpUMsIRQW8OY` | ACTIVE; scheduler 1 min; config gate zamknięty |
| COMM ES ALERT CONTEXT | `qs36Tri1hIQhU5FH` | INACTIVE |
| COMM ES ALERT PERSISTENCE (single-rule) | `DWnFXZVIptjMSoax` | INACTIVE |
| COMM ES ALERT RULE ROUTER | `fSwg0ADFK3aQhoqY` | INACTIVE; validator 0 errors / 0 warnings |
| COMM ES ALERT ORCHESTRATOR | `7ugYR0OFPvtX2ySr` | INACTIVE; validator 0 errors / 1 świadomy `executeOnce` warning |
| COMM ALERT SOURCE CLAIM | `WgG4GvDQAPydveXr` | INACTIVE; validator 0 errors / 2 świadome `executeOnce` warnings |
| COMM ALERT SOURCE ACK | `7G4qKHql2OQjHROe` | INACTIVE; validator 0 errors / 2 świadome `executeOnce` warnings |

## Bezpieczna konfiguracja

`COMMUNICATIONS_CONFIG` pozostaje bez zmian:
- `mode=LIVE`,
- `history_policy=HOLD`,
- `auto_alert_consumer_enabled=false`,
- `es_verified=false`,
- `alert_cutover_outbox_id=7689`,
- `WRONG_PROCESS`, `WORK_OUTSIDE_APP`, `NO_ACTIVITY` i pozostałe reguły automatyczne są `enabled=false`,
- niezatwierdzone progi/ACK/godziny pozostają `null`.

Source Gate przy takim stanie nie czyta ani nie claimuje `ALERT_DERIVED` po cutoverze. Legacy `id <= 7689` pozostaje nietknięte.

## Zrobione w tym kroku

1. Dodano Router trzech reguł ES. Każda obserwacja trafia wyłącznie do właściwego, istniejącego silnika reguły.
2. Dodano Orchestrator oceny:
   - Context -> konfiguracja -> Router -> wspólny wynik,
   - `CONSUMER_DISABLED` i `ES_VALIDATION_REQUIRED` zwracają jawny wynik `blocked=true`, bez wyjątku i bez zapisu,
   - jeżeli silnik zażąda `deliver=true`, a nie ma jawnej zatwierdzonej polityki odbiorców/treści, wynik jest fail-closed `COMM_ES_DELIVERY_POLICY_REQUIRED`, bez persistence.
3. Dodano domenowy `es-alert-orchestrator.cjs` i testy.
4. Dodano domenowy `es-alert-bundle.cjs`: wszystkie zmiany wynikające z jednej obserwacji ES mają tworzyć **jeden atomiczny COMM batch i jedną globalną rewizję**, zamiast trzech konkurujących zapisów.
5. Dodano CLAIM dla źródłowego `ALERT_DERIVED`:
   - warunkowy lease,
   - brak automatycznego przejęcia starego niepustego ownera tylko z powodu wygaśnięcia lease,
   - claim jest niemożliwy przy obecnym zamkniętym config gate.
6. Dodano ACK źródła:
   - `success` -> `DONE`,
   - `failure` -> ponowienie z backoffem, maks. 8 prób, potem `DEAD_LETTER`,
   - `release` -> zwolnienie lease bez naliczenia próby,
   - replay `success` po `DONE` jest idempotentny.

## Dowody testowe

### GitHub CI
Dedykowany run `Stage 8B orchestrator` nr 1, run ID `34051038290`: **SUCCESS**.
PASS:
- syntax,
- nowe testy domenowe orchestratora,
- atomiczny bundle,
- istniejące testy ES alert persistence,
- regresja Stage 8 alert source/persistence runtime/workflow.

### Runtime n8n — bez zapisu
Kontrolowany test Orchestratora na historycznym źródle `7687`:
- HTTP 200,
- `blocked=true`,
- `reason=CONSUMER_DISABLED`,
- `persist=false`.
Po teście `7687` nadal: `PENDING`, `attempts=0`, pusty lease. Probe usunięty.

Kontrolowany test CLAIM na tym samym źródle:
- HTTP 200,
- `acquired=false`,
- `reason=CONSUMER_DISABLED`.
Po teście źródło nadal bez zmian. Probe usunięty.

### Runtime n8n — izolowany ACK fixture
Utworzono wyłącznie testowy rekord `STAGE8B_ACK_PROBE_20260906` (`id=8377`), niezależny od danych pracowniczych i ES. Wynik:
- pierwszy ACK `success`: `PENDING -> DONE`, attempts `0 -> 1`, lease wyczyszczony,
- replay tej samej operacji: `ALREADY_DONE`, `updated=false`, bez zwiększenia attempts.
Po teście probe i rekord `8377` usunięto.

## Kod na gałęzi

Dodano:
- `backend/v2/communication/es-alert-orchestrator.cjs`,
- `backend/v2/communication/es-alert-bundle.cjs`,
- `backend/v2/communication/build-es-alert-rule-router.mjs`,
- `backend/v2/communication/build-es-alert-orchestrator-workflow.mjs`,
- `scripts/test-v2-communication-es-alert-orchestrator.cjs`,
- `scripts/test-v2-communication-es-alert-bundle.cjs`,
- `.github/workflows/stage8b-orchestrator.yml`.

## Otwarte punkty przed uruchomieniem automatu

1. Zbudować parity-tested n8n runtime/workflow dla **atomicznego bundle persistence** i podłączyć go do istniejącego `COMM BATCH SERVICE` z prawidłowym writer lockiem, stabilnym `request_id` i `payload_hash`.
2. Połączyć Source Gate -> CLAIM -> Context/Orchestrator -> bundle persistence -> ACK. Każdy błąd przed pełnym commitem ma kończyć się `failure` albo `release`, nigdy fałszywym `DONE`.
3. Zsynchronizować brakujący generator/snapshot `COMM ES ALERT CONTEXT` oraz CLAIM/ACK do repo.
4. Nadal otwarty jest pozytywny realny test Stage 7 ES PAK/PICK. `es_verified` pozostaje `false` do jego faktycznego potwierdzenia.
5. Użytkownik nie zatwierdził jeszcze finalnej polityki automatycznych alertów: odbiorcy, treść komunikatu i wymaganie ACK dla reguł. System ma pozostać fail-closed zamiast zgadywać.
6. Dopiero po powyższym: kontrolowany post-cutover fixture/E2E, test retry/lease/race, cleanup, aktualizacja deployment/manifest, merge do `main`, read-back live i odbiór użytkownika.

Nie zmieniono V1, Moniti ani realnych danych czasu pracy.
