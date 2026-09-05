# MOL App V2 — model domenowy

## 1. Stan obecności

Stan biznesowy ma dokładnie trzy wartości:

| Stan | Znaczenie | Dozwolone przejście |
|---|---|---|
| `NOT_STARTED` | Brak rozpoczętej pracy w danym dniu | `START` → `OPEN` |
| `OPEN` | Dzień pracy trwa | `FINISH` → `CLOSED` |
| `CLOSED` | Dzień zakończony | `REOPEN` → `OPEN` |

`SYNC_PENDING`, `SOURCE_ERROR` i `CORRECTION_REQUIRED` nie są stanami obecności. Są osobnymi flagami technicznymi. To eliminuje sprzeczność, w której ta sama osoba była jednocześnie „w pracy” i „w błędzie”.

### Reguły obecności

- Jeden pracownik może mieć maksymalnie jeden otwarty dzień pracy.
- `START` pobiera czas serwera; klient nie przesyła własnego czasu.
- `FINISH` zamyka wcześniej aktywny proces i dopiero potem dzień pracy.
- `REOPEN` działa tylko dla `CLOSED`, tworzy audyt `WORK_REOPENED`, nie uruchamia procesu i powiadamia lidera/admina.
- Korekta może zmienić START i/lub STOP. Nie usuwa START; usunięcie STOP jest operacją `REOPEN`.
- Czas STOP nie może być wcześniejszy niż START, a daty przyszłe są odrzucane.
- Zatwierdzony limit własnych korekt WORKER wynosi 31 dni wstecz. Starsze korekty wykonuje LEADER/ADMIN w swoim zakresie uprawnień.
- Korekta z arkusza jest komendą `ATTENDANCE_CORRECTION` ze źródłem `DRIVE_SHEET`, potwierdzonym autorem i oczekiwaną wersją obecności; obowiązują te same reguły domenowe co w aplikacji.

## 2. Stan procesu

| Stan | Znaczenie | Operacje |
|---|---|---|
| `NONE` | Brak aktywnego procesu | `PROCESS_START` |
| `ACTIVE` | Jeden aktywny proces | `PROCESS_CHANGE`, `PROCESS_LOGOUT`, `FINISH` |

- Proces można uruchomić tylko przy obecności `OPEN`.
- `PROCESS_CHANGE` atomowo zamyka poprzednią sesję i otwiera nową z tym samym znacznikiem czasu.
- `PROCESS_LOGOUT` kończy tylko proces, nie kończy dnia pracy.
- `PRZERWA` jest zwykłą kategorią procesu. Czas pomiędzy procesami jest liczony oddzielnie jako obecność minus suma zamkniętych/aktywnych sesji procesowych.

## 3. Stany techniczne

### Synchronizacja

`NOT_REQUIRED` → `PENDING` → `SYNCED` lub `FAILED`. Ponowienie: `FAILED` → `PENDING`.

### Komenda

`RECEIVED` → `EXTERNAL_CONFIRMED` → `COMMITTING` → `COMMITTED`.

Ścieżki błędów: `REJECTED`, `FAILED_RETRYABLE`, `RECOVERY_REQUIRED`. Powtórzenie identycznego `request_id` zwraca zapisany wynik; inny payload daje konflikt.

### Świeżość norm

`FRESH`, `STALE`, `UNAVAILABLE`. Ostatnia poprawna wartość nie jest kasowana tylko dlatego, że kolejne odświeżenie się nie udało.

## 4. Model danych V2

Wszystkie tabele mają osobny prefiks V2; V1 nie jest współdzielonym magazynem zapisu.

| Tabela | Klucz / ważne pola | Cel |
|---|---|---|
| `MOL_V2_EMPLOYEES` | `employee_id`, login, password_hash, role, leader_id, active | Tożsamość i zespół |
| `MOL_V2_SESSIONS` | `session_id`, employee_id, token_hash, expires_at, revoked_at | Sesje aplikacji |
| `MOL_V2_ATTENDANCE` | employee_id+work_date, state, start_at, stop_at, version | Bieżący stan dnia |
| `MOL_V2_PROCESS_SESSIONS` | process_session_id, employee_id, process_code, start_at, stop_at | Historia procesów |
| `MOL_V2_COMMANDS` | request_id, actor_id, operation, payload_hash, status, response | Idempotencja i recovery |
| `MOL_V2_SHEET_CORRECTIONS` | correction_id, request_id, spreadsheet_id, sheet_id, row_id, expected_version, approved_by, approved_at, payload_hash, status, error_code | Zamrożona treść zatwierdzonej korekty i wynik importu |
| `MOL_V2_WORK_EVENTS` | event_id, aggregate_id, type, before_json, after_json, request_id | Niezmienny audyt |
| `MOL_V2_PRODUCTION_DELTAS` | delta_id, employee_id, source_time, counts, classification | Zamrożone przyrosty ES |
| `MOL_V2_MESSAGES` | message_id, recipients, content, ack_required, dates | Komunikacja |
| `MOL_V2_ALERTS` | alert_id, type, dedup_key, opened_at, closed_at, status | Epizody alertów |
| `MOL_V2_DAILY_SUMMARY` | employee_id+work_date, times, counts, norms, freshness, version | Szybki status dzienny |
| `MOL_V2_MONTHLY_SUMMARY` | employee_id+month, sums, weighted_norm, version | Wynik miesięczny |
| `MOL_V2_OUTBOX` | outbox_id, type, payload, attempts, next_attempt_at, status | Mirror/retry |
| `MOL_V2_CONFIG` | key, value, scope, version | Konfiguracja bez redeployu |
| `MOL_V2_PROCESSES` | process_code, display_name, active, norm_units_per_hour, version | Słownik procesów |
| `MOL_V2_LOCKS` | lock_key, owner, version, lease_until | Kontrola równoczesnych zapisów |
| `MOL_V2_ERRORS` | error_id, request_id, workflow_id, execution_id, code, message | Rejestr błędów bez sekretów |

Dokładne wdrożone nazwy kolumn i typy są zapisane w `backend/v2/schema.json`, a identyfikatory tabel w `backend/v2/manifest.json`. Złożone wartości są serializowane do kolumn `*_json`; identyfikator wiersza `id` oraz daty `createdAt`/`updatedAt` nadaje n8n.

## 5. Normy

- `PAK% = eligible_PAK / (hours_PAK × 70) × 100`
- `PICK% = eligible_PICK / (hours_PICK × 210) × 100`
- `Daily% = (eligible_PAK + eligible_PICK / 3) / ((hours_PAK + hours_PICK) × 70) × 100`
- Miesiąc używa sum liczników i godzin, nigdy średniej z procentów dziennych.
- Gdy mianownik wynosi zero, wynik jest `null` z powodem `NO_ELIGIBLE_PROCESS_TIME`, nie `0%`.
- Przyrost ES jest przypisany do procesu i stanu obecności w chwili pobrania. Późniejsza korekta nie przepisuje historycznej klasyfikacji automatycznie.

## 6. Alerty

Typy: `WRONG_PROCESS`, `NO_ACTIVITY`, `WORK_OUTSIDE_APP`, `NO_PROCESS`, `ATTENDANCE_CORRECTION`, `MANUAL`.

Każdy aktywny epizod ma stabilny `dedup_key = employee_id + type + episode_anchor`. Kolejne wykrycia aktualizują epizod, zamiast tworzyć duplikaty. Zamknięty epizod nie jest ponownie otwierany; nowe naruszenie tworzy nowy identyfikator.

## 7. Role

- `WORKER`: własny status, procesy, wiadomości, normy, własne korekty.
- `LEADER`: funkcje pracownika plus podgląd przypisanego zespołu, komunikaty i historia zespołu.
- `ADMIN`: pełny zakres, konfiguracja, raporty i recovery.

Backend filtruje dane według roli i relacji `leader_id`; sam parametr `employee_id` nigdy nie daje dostępu.
