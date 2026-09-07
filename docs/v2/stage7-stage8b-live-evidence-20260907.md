# MOL V2 — dowód z żywych danych ES, 2026-09-07

Status: **STAGE 7 REAL POSITIVE ES TECHNICAL PASS; STAGE 8B REAL CONTEXT PASS; USER ACCEPTANCE PENDING**.

Ten dokument zapisuje wynik kontrolowanego testu na rzeczywistych danych z 07.09.2026. Test techniczny domyka wcześniejszy brak dodatniej produkcji ES w aktywnym procesie V2. Nie oznacza automatycznie odbioru użytkownika etapu 7 i nie włącza automatycznych alertów Stage 8B.

## 1. Realny odczyt ES i baseline

Około 08:31 Europe/Warsaw wykonano czysto odczytowy odczyt `MOL // APP V2 // ES REPORT READ` (`LQnqf4nQmNKsRsMT`). Wynik:
- `ok=true`,
- `work_date=2026-09-07`,
- `operator_count=9`,
- brak błędu źródła.

Snapshot raportu obejmował m.in. `dtatarska` z PAK 66 / PICK 218. `atybus` i `asorokopud` nie występowali w raporcie ES, zgodnie z oczekiwaniem użytkownika, że te loginy nie będą generować PAK/PICK.

Scheduler Stage 7 pracował już wcześniej na danych z 07.09. Dla `MOL004 / dtatarska` poprawny baseline został ustawiony około 06:33 Europe/Warsaw:
- `initial_pak=0`,
- `initial_pick=4`,
- `reset_count=0`,
- `coverage_gaps=0`,
- `rebaseline_required=false`,
- świeże `last_good_at`,
- pusty `error_code`.

Pierwszy prawidłowy odczyt nie doliczył historycznej produkcji sprzed baseline.

## 2. Realne przyrosty przed uruchomieniem procesu V2

Po baseline system zapisywał rzeczywiste przyrosty do `MOL_V2_PRODUCTION_DELTAS`. Ponieważ `MOL004` nie miał jeszcze obecności i procesu V2, przyrosty zostały poprawnie zamrożone jako `NO_APP`.

Przykład:
- batch `ES-679996`,
- status `COMMITTED`,
- delta `ES-679996:MOL004:PAK`,
- `pak_count=2`, `pick_count=0`,
- `classification=NO_APP`,
- `ES_DERIVED` zakończony `DONE`.

To potwierdziło działanie ścieżki `ES report -> checkpoint -> immutable production delta -> ES_DERIVED -> summary` jeszcze przed właściwym testem normy.

## 3. Rozszerzenie zgody Moniti i synchronizacja realnego START

Użytkownik jawnie zezwolił 07.09 na testy Moniti:
- `atybus / MOL015 / 99191` — w dniu 07.09,
- `asorokopud / MOL014 / 99185` — w dniu 07.09,
- `dtatarska / MOL004 / 99186` — wyłącznie do 13:00 Europe/Warsaw.

Bezpiecznik został zapisany równolegle w Attendance Service i Moniti Adapter. Dla `dtatarska` warunek godzinowy to `hour < 13`; po 13:00 realny zapis Moniti jest blokowany.

Read-only Moniti dla `dtatarska` wykazał istniejący prawdziwy otwarty dzień:
- START `2026-09-07T04:28:00.000Z` = 06:28 Europe/Warsaw,
- STOP brak,
- dzień otwarty.

Nie wykonano nowego START w Moniti. Zamiast tego jednorazowo zsynchronizowano stan V2 z istniejącym realnym wpisem Moniti: `MOL004:2026-09-07` otrzymał stan OPEN od 06:28 i `moniti_sync=SYNCED`. Było to lustrzane odwzorowanie realnego źródła, bez zmiany danych Moniti.

## 4. Realny proces PAKOWANIE i dodatni MATCH_PROCESS

O 08:41 Europe/Warsaw uruchomiono dla `MOL004` proces V2 `PAKOWANIE`. Proces został zapisany jako:
- `process_session_id=1e7e6d7a-7a20-4ed1-8b46-0f7a5213d6e1:process`,
- `process_code=PAKOWANIE`,
- `start_at=2026-09-07T06:41:00.000Z`.

Po kilku normalnych cyklach ES licznik PAK zwiększył się z 80 do 82. Scheduler utworzył realny batch:
- `batch_id=ES-681193`,
- `captured_at=2026-09-07T06:51:05.193Z`,
- status `COMMITTED`,
- `delta_records=1`.

Kluczowy rekord produkcji:
- `delta_id=ES-681193:MOL004:PAK`,
- `pak_count=2`,
- `pick_count=0`,
- `classification=MATCH_PROCESS`,
- właściwy `process_session_id` procesu PAKOWANIE,
- właściwy `attendance_id=MOL004:2026-09-07`.

Powiązany outbox:
- `outbox_id=ES-681193:MOL004:2026-09-07:derived`,
- row id `10788`,
- status `DONE`,
- attempts `1`,
- brak błędu.

To jest pierwszy realny dodatni dowód produkcyjny Stage 7 w zgodnym aktywnym procesie V2.

## 5. Norma dzienna — Data Tables, API i Google Sheet

Po pierwszych +2 PAK norma dzienna została policzona zgodnie z regułą 70 PAK/h. Przy 608 s procesu wynik wyniósł około 16,9%.

Praca trwała dalej. Około 08:53 Europe/Warsaw publiczny endpoint `GET /mol-app-v2-worker-status`, wywołany przez krótkotrwałą techniczną sesję testową usuniętą po odczycie, zwrócił HTTP 200 i:
- `attendance.state=OPEN`,
- `moniti_sync=SYNCED`,
- aktywny proces `PAKOWANIE`,
- `eligible_pak=5`,
- `eligible_pick=0`,
- `pak_seconds=728`,
- `pak_percent=35.321821036106755`,
- `combined_percent=35.321821036106755`,
- `freshness=FRESH`,
- `coverage=PARTIAL`,
- `source_error=null`,
- `has_value=true`.

Ten sam snapshot został zapisany w Google Sheet `Normy dzienne V2`:
- `MOL004:2026-09-07`,
- PAK w normie `5`,
- PAK czas `728 s`,
- Wykonanie PAK `35,3%`,
- Wykonanie łączne `35,3%`,
- `FRESH`,
- wersja publikacji `159`,
- wynik dostępny `TRUE`.

`NORM_DRIVE` dla wersji 159 zakończył się `DONE`. Publiczne API i mirror Google są zgodne.

`coverage=PARTIAL` jest oczekiwane: wcześniejsza realna produkcja z tego dnia miała miejsce przed zsynchronizowaniem obecności/procesu V2 i pozostaje prawidłowo sklasyfikowana jako `NO_APP`. Nie wolno jej przepisywać do normy wstecz.

Norma miesięczna pozostaje `INCOMPLETE_MONTH_DATA`, ponieważ wcześniejsze dni 05–06.09 nie miały pełnego źródła ES. Nie jest to błąd dzisiejszego dodatniego testu.

## 6. Spójność i recovery po teście

Po dodatnim batchu:
- `command-writer` ma pustego ownera,
- `MOL_V2_COMMANDS` ma 0 `RECOVERY_REQUIRED`,
- `MOL_V2_ES_BATCHES` ma 0 `PREPARED`,
- testowe webhook-harnessy zostały usunięte,
- techniczna sesja API została usunięta.

Nie tworzono fikcyjnych PAK/PICK i nie dopisywano produkcji ręcznie.

## 7. Stage 8B Context na realnym NO_APP i MATCH_PROCESS

Read-only `COMM ES ALERT CONTEXT` (`qs36Tri1hIQhU5FH`) został sprawdzony na dwóch prawdziwych źródłach.

### NO_APP
Dla wcześniejszego batchu `ES-679996` Context prawidłowo rozpoznał `WORK_OUTSIDE_APP`, ponieważ nie było obecności/procesu V2.

### MATCH_PROCESS
Dla `ES-681193:MOL004:2026-09-07:derived` Context zwrócił HTTP 200 i zobaczył:
- realną obecność OPEN,
- aktywny proces `PAKOWANIE`,
- +2 PAK z `classification=MATCH_PROCESS`,
- `WRONG_PROCESS` bez delta,
- `WORK_OUTSIDE_APP` bez delta,
- źródło `NO_ACTIVITY` jako `FRESH`, `verified=true`, metric `PAK`, z aktualnym activity anchor.

`coverage_ready=false` dla NO_ACTIVITY jest prawidłowe, ponieważ cały dzień ma `coverage=PARTIAL`. Silnik pozostaje fail-closed zamiast generować fałszywy brak aktywności.

W obu testach Context nie zapisał komunikatu i nie skonsumował źródła.

## 8. Alerty pozostają świadomie wyłączone

Po pełnym dodatnim teście ES konfiguracja produkcyjna komunikacji nadal pozostaje bezpieczna:
- `COMMUNICATIONS_CONFIG.es_verified=false`,
- `auto_alert_consumer_enabled=false`,
- wszystkie automatyczne reguły COMM `enabled=false`,
- `history_policy=HOLD`,
- `alert_cutover_outbox_id=7689`.

Techniczne źródło ES jest zweryfikowane, ale live gate `es_verified` nie został przełączony bez osobnej decyzji użytkownika. Brak zatwierdzonych odbiorców/treści/ACK/progu NO_ACTIVITY nadal blokuje uruchomienie automatycznych komunikatów.

Historyczny `ALERT_DERIVED` do id 7689 pozostaje polityką HOLD i nie może być użyty przez nową ścieżkę.

## 9. Aktywne wersje zmienione podczas testu

Po rozszerzeniu zakresu Moniti:
- Attendance Service `qPVmcfp6pUg3GbzH` — `aedab6e1-8d9c-4717-b4e7-3f8ffe76a521`,
- Moniti Adapter `3e67SsUOByUi17YV` — `9037e45d-1e0d-46d4-99d2-e01bc887934a`.

Health V2 zweryfikowany ponownie 07.09:
- workflow `sfoWeuiJBN2qvCRF`,
- active version `5d289c40-7e09-452e-a079-9422c63011c2`,
- HTTP 200,
- version `0.8.0`, stage `8`, `READY`, database `ONLINE`.

## 10. Wniosek i status odbioru

**Techniczny brak Stage 7 dotyczący pozytywnej realnej produkcji ES jest zamknięty.** Potwierdzono realny baseline, rzeczywisty przyrost PAK, `MATCH_PROCESS`, normę dzienną, publiczne API, mirror Google oraz czyste recovery/locki.

Stage 8B również poprawnie interpretuje prawdziwe źródło zarówno dla `NO_APP`, jak i `MATCH_PROCESS`, pozostając fail-closed.

Etap 7 pozostaje formalnie `DO ODBIORU`, ponieważ jawny odbiór użytkownika nie został jeszcze zapisany. Automatyczne alerty Stage 8B pozostają OFF do osobnej decyzji biznesowej.
