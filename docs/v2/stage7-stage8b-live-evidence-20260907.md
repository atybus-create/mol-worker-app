# MOL V2 — dowód z żywych danych ES, 2026-09-07

Status: **REAL ES SOURCE/INGEST VERIFIED; ELIGIBLE NORM TEST STILL OPEN**.

Ten dokument zapisuje wynik kontrolowanego testu na realnych danych z 07.09.2026. Nie oznacza pełnego odbioru Stage 7 i nie włącza automatycznych alertów Stage 8B.

## 1. Realny odczyt ES

Około 08:31 Europe/Warsaw wykonano czysto odczytowy odczyt `MOL // APP V2 // ES REPORT READ` (`LQnqf4nQmNKsRsMT`). Wynik:
- `ok=true`,
- `work_date=2026-09-07`,
- `operator_count=9`,
- brak błędu źródła.

Snapshot raportu:
- `lsamusenko` — PAK 78 / PICK 320,
- `nzwolynski` — PAK 0 / PICK 231,
- `dtatarska` — PAK 66 / PICK 218,
- `mkuzminska` — PAK 34 / PICK 212,
- `krudnicka` — PAK 0 / PICK 214,
- `mleszczynski` — PAK 0 / PICK 126,
- `mkhomutovska` — PAK 40 / PICK 43,
- `aanniuk` — PAK 40 / PICK 39,
- `murat` — PAK 0 / PICK 0.

`atybus` i `asorokopud` nie występowały w raporcie ES. Jest to zgodne z oczekiwaniem użytkownika: na tych loginach nie będzie przybywać PAK/PICK.

Tymczasowy webhook-harness użyty wyłącznie do odczytu został po teście usunięty.

## 2. Baseline i realne przyrosty

Scheduler Stage 7 pracował już na danych z 07.09 przed ręcznym odczytem.

Dla `MOL004` / `dtatarska`:
- poprawny baseline został ustawiony około 06:33 Europe/Warsaw,
- `initial_pak=0`,
- `initial_pick=4`,
- `reset_count=0`,
- `coverage_gaps=0`,
- `rebaseline_required=false`,
- `last_good_at` było świeże,
- `error_code` było puste.

Po baseline system zapisywał realne przyrosty do `MOL_V2_PRODUCTION_DELTAS`. W chwili audytu istniało 98 realnych rekordów dla `MOL004`. Bezpośredni snapshot ES wskazywał co najmniej +66 PAK i +214 PICK względem baseline; kolejny cykl schedulera zwiększył PAK dalej.

Przykład realnego batchu:
- batch `ES-679996`,
- `COMMITTED`,
- realny delta `ES-679996:MOL004:PAK`,
- `pak_count=2`, `pick_count=0`,
- klasyfikacja `NO_APP`,
- jego `ES_DERIVED` zakończył się `DONE`.

To potwierdza realną ścieżkę:
`ES report -> checkpoint -> immutable production delta -> ES_DERIVED -> summary`.

## 3. Dlaczego klasyfikacja jest NO_APP

`MOL004` nie miał 07.09 otwartej obecności ani aktywnego procesu w V2. Dlatego rzeczywista produkcja po baseline została poprawnie zaklasyfikowana jako `NO_APP`, a nie `MATCH_PROCESS`.

Snapshot normy około 08:32 pokazał m.in.:
- `state=NOT_STARTED`,
- `presence_seconds=0`,
- `process_seconds=0`,
- `eligible_pak=0`,
- `eligible_pick=0`,
- `outside_pak=68`,
- `outside_pick=214`,
- `outside_reasons.NO_APP=282`,
- `freshness=FRESH`,
- `coverage=COMPLETE`,
- `has_value=true`,
- procenty normy = `null`,
- powód `NO_ELIGIBLE_PROCESS_TIME`.

To jest prawidłowe zachowanie. Nie wolno przepisywać `NO_APP` na `MATCH_PROCESS` tylko po to, aby zaliczyć test.

## 4. Stage 8B Context na realnym batchu

Na prawdziwym zakończonym źródle:
- `source_outbox_id=ES-679996:MOL004:2026-09-07:derived`,
- `source_row_id=10703`,
- `employee_id=MOL004`,
- `work_date=2026-09-07`,
- `batch_id=ES-679996`,

wykonano wyłącznie read-only `COMM ES ALERT CONTEXT` (`qs36Tri1hIQhU5FH`) przez tymczasowy harness.

Wynik HTTP 200. Context poprawnie zobaczył:
- brak obecności V2,
- brak aktywnego procesu,
- realny +2 PAK z klasyfikacją `NO_APP`,
- `WRONG_PROCESS` bez delta,
- `WORK_OUTSIDE_APP` z realnym delta,
- `NO_ACTIVITY` bez źródła aktywnego procesu.

Nie zapisano komunikatu, nie utworzono epizodu COMM i nie uruchomiono konsumpcji alertów. Harness po teście usunięto.

## 5. Alerty pozostają fail-closed

Po realnym odczycie ES:
- `COMMUNICATIONS_CONFIG.es_verified=false`,
- `auto_alert_consumer_enabled=false`,
- wszystkie automatyczne reguły COMM `enabled=false`,
- `history_policy=HOLD`,
- `alert_cutover_outbox_id=7689`.

Nie powstał nowy `ALERT_DERIVED` z danych 07.09. Najnowszym historycznym rekordem tej klasy pozostaje `id=7689` z 06.09, `PENDING`, attempts=0. Legacy backlog nie został skonsumowany.

## 6. Aktualny zakres Moniti

Na podstawie jawnej zgody użytkownika z 07.09 zakres testów Moniti został ograniczony do:
- `MOL015 / atybus / moniti_worker_id=99191`,
- `MOL014 / asorokopud / moniti_worker_id=99185`,
- data `2026-09-07`.

`MOL004 / dtatarska / 99186` został usunięty z dozwolonego zakresu testowych zapisów Moniti.

Po zmianie:
- Attendance Service waliduje się z 0 błędów,
- Moniti Adapter waliduje się z 0 błędów,
- nie wykonano w tym teście żadnego nowego zapisu Moniti.

Aktywne wersje po zmianie zakresu:
- Attendance Service `qPVmcfp6pUg3GbzH`: `0ea20e43-72f8-4941-96c9-97ac324015f6`,
- Moniti Adapter `3e67SsUOByUi17YV`: `ffe808e8-9523-49a3-afb5-e582478f819f`.

## 7. Co jest zaliczone, a co nadal otwarte

Zaliczone na realnych danych:
- świeży raport ES z operatorami,
- baseline,
- późniejszy rzeczywisty wzrost liczników,
- zapis realnych `PRODUCTION_DELTAS`,
- batch `COMMITTED`,
- `ES_DERIVED -> DONE`,
- świeże summary/norm snapshot,
- poprawna klasyfikacja produkcji poza V2 jako `NO_APP`,
- read-only Stage 8B Context na prawdziwym źródle ES.

Nadal otwarte przed pełnym PASS Stage 7:
- realny `MATCH_PROCESS` albo prawidłowy `BOUNDARY_PAK_PICK` dla pracownika, który jednocześnie ma otwartą obecność/proces V2 i faktycznie generuje PAK/PICK w ES,
- potwierdzenie procentów normy na tej samej realnej pracy.

Przy obecnym ograniczeniu Moniti tego dowodu nie można uzyskać na `dtatarska`, a `atybus`/`asorokopud` nie generują PAK/PICK. Nie należy obchodzić tego ograniczenia sztucznymi danymi ani zmianą `MONITI_ENABLED` bez osobnej decyzji użytkownika.

Wniosek: **realne źródło i ingest Stage 7 oraz realny Context Stage 8B są potwierdzone; pełny test eligible norm Stage 7 pozostaje otwarty.**
