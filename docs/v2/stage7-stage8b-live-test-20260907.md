# MOL V2 — runbook testu na żywych danych Stage 7 → Stage 8B

Data przygotowania: 2026-09-06. Planowany test: 2026-09-07.

## Status wejściowy

System jest przygotowany technicznie do testu na żywych danych, ale **test nie został jeszcze wykonany**.

Nie wolno przed testem zmieniać poniższych zabezpieczeń:
- `COMMUNICATIONS_CONFIG.es_verified=false`,
- `COMMUNICATIONS_CONFIG.auto_alert_consumer_enabled=false`,
- wszystkie reguły automatyczne COMM `enabled=false`,
- `history_policy=HOLD`,
- `alert_cutover_outbox_id=7689`.

Stage 8B jest podłączony, ale fail-closed. Source Gate działa co minutę, jednak przy powyższej konfiguracji nie konsumuje `ALERT_DERIVED`.

Snapshot wersji testowanych znajduje się w:
- `backend/v2/metrics/stage7-live-contract.json`,
- `backend/v2/communication/stage8b-live-contract.json`.

## Ważne ograniczenie Moniti przed testem

`MONITI_ENABLED=true`, a aktualny Attendance Service i Moniti Adapter mają jawnie ograniczony realny zapis do daty `2026-09-06` oraz trzech wcześniej uzgodnionych worker IDs.

Dlatego 07.09:
- nie rozszerzać okna Moniti automatycznie,
- jeżeli wybrany pracownik nie ma już prawidłowo otwartej obecności wymaganej do testu, **STOP** i uzyskać jawne potwierdzenie rozszerzenia testowego okna Moniti dla konkretnego konta i dnia,
- samo odczytywanie ES i scheduler metryk nie wymaga rozszerzenia Moniti.

## Wersje Stage 7 do testu

- ES REPORT READ `LQnqf4nQmNKsRsMT` — `c90f9be9-c265-4ec0-90dc-13327124f607`
- ES INGEST `i4MdwSwbjUkEosk4` — `9aeb3f82-5a8f-4123-9aa7-642b68f6edb6`
- METRICS SCHEDULER `vxe3T6UbcSofc4FL` — `395d5949-d5ea-4c50-a1f4-ba291ec1a955`, interwał 1 minuta
- SUMMARY RECALCULATOR `pBYXQiiTNxhK9IGq` — `2d4e29bd-d956-43f4-b744-f586608b309d`
- NORM DRIVE `25EgiHZmEcqxxTvG` — `ef240fa2-1dc5-4af0-b045-f2b7c4251e08`
- METRICS TASK ACK `r0pQp59VKwIt4i0h` — `e688b2fd-af46-4a89-92c2-6e7aef5d22d0`

Źródło ES:
- PAK = kolumna `ilość skontrolowanych zamówień`,
- PICK = kolumna `Ilość zadań PICK`,
- operator jest normalizowany przez `trim + lowercase`.

Znane mapowania testowe z wcześniejszego odbioru:
- `MOL004` → `dtatarska`,
- `MOL014` → `asorokopud`,
- `MOL015` → `atybus`.

Nie zakładać jednak, że konkretne mapowanie działa 07.09 — najpierw musi faktycznie wystąpić operator w raporcie ES.

## Preflight — musi przejść przed pierwszą operacją pracownika

Sprawdzić wyłącznie odczytem:
1. `command-writer` ma pustego ownera.
2. `MOL_V2_COMMANDS` ma 0 `RECOVERY_REQUIRED`.
3. `MOL_V2_ES_BATCHES` ma 0 `PREPARED`.
4. Outbox ma 0 niedokończonych `ES_DERIVED`, `ATTENDANCE_DERIVED` i `NORM_DRIVE` z poprzednich testów.
5. `MOL_V2_PRODUCTION_DELTAS` przed pierwszym pozytywnym testem pozostaje na oczekiwanym stanie bazowym; na końcu 06.09 było 0 rekordów.
6. Wszystkie aktywne wersje Stage 7 oraz Stage 8B są zgodne z dwoma plikami `*-live-contract.json`. W przypadku driftu najpierw wyjaśnić zmianę.
7. `ES_ENABLED=true`, `METRICS_ENABLED=true`, `NORM_DRIVE_ENABLED=true`.
8. COMM nadal pozostaje fail-closed według statusu wejściowego powyżej.

Każdy niepusty stary lease/owner musi zostać wyjaśniony. Nie przejmować automatycznie niepustego ownera tylko dlatego, że lease wygląda na wygasły.

## Faza A — pierwszy poprawny raport i baseline

Cel: uzyskać prawidłowy, świeży checkpoint ES. **To nie jest jeszcze pozytywny test produkcji.**

1. Poczekać na normalne wykonanie schedulera, w którym ES REPORT READ zwraca prawidłowy raport i `operator_count > 0`.
2. Wybrać jednego pracownika, którego skonfigurowany `es_worker_id` rzeczywiście występuje w tym raporcie dokładnie jeden raz.
3. Poczekać na zakończenie pełnego cyklu ES INGEST.
4. Sprawdzić `MOL_V2_ES_POLL_STATE` dla `<EMPLOYEE_ID>:2026-09-07`:
   - `state_json` nie jest pusty,
   - `last_good_at` jest ustawione,
   - `error_code` jest puste,
   - `es_operator` odpowiada operatorowi z raportu,
   - zapis jest z 07.09.
5. Zanotować z `state_json` bazowe liczniki `pak`, `pick`, `captured_at`, `last_batch_id` oraz `baseline_at`.
6. Sprawdzić, że pierwszy prawidłowy odczyt **nie utworzył historycznego przyrostu**. Pierwszy odczyt jest baseline i wcześniejszej pracy nie wolno doliczać.

PASS fazy A = poprawny baseline. `PRODUCTION_DELTAS=0` na tym etapie jest prawidłowe, jeżeli nie było jeszcze późniejszego wzrostu po baseline.

STOP, jeżeli wystąpi m.in.:
- `ES_REPORT_EMPTY`,
- `ES_AUTH_UNAVAILABLE` / błąd źródła,
- `ES_OPERATOR_NOT_FOUND`,
- `ES_MAPPING_AMBIGUOUS`,
- duplikat operatora,
- nieprawidłowy dzień raportu,
- checkpoint nie ma `last_good_at`.

Braku operatora lub źródła nie wolno zamieniać na „0 produkcji”.

## Faza B — rzeczywisty dodatni przyrost PAK/PICK

Cel: pierwszy realny dowód Stage 7.

Warunek: Faza A PASS.

1. Pracownik musi wykonywać zwykłą rzeczywistą pracę. Nie tworzyć fikcyjnej obecności ani sztucznej produkcji tylko po to, żeby przejść test.
2. Jeżeli V2 ma już prawidłową otwartą obecność dla tego pracownika, aktywny proces ma odpowiadać testowanej czynności:
   - `PAKOWANIE` dla PAK,
   - `KOMPLETACJA` dla PICK.
3. Jeżeli do uzyskania prawidłowego stanu V2 wymagany byłby nowy START/korekta z zapisem do Moniti 07.09, STOP do czasu jawnego rozszerzenia okna testowego Moniti.
4. **Po zapisanym baseline** wykonać co najmniej jedną rzeczywistą operację, która zmieni licznik ES:
   - PAK: wzrost `ilość skontrolowanych zamówień`, albo
   - PICK: wzrost `Ilość zadań PICK`.
5. Poczekać na kolejny pełny cykl schedulera. Scheduler działa co minutę; jeżeli raport ES publikuje zmianę z opóźnieniem, dopuścić kolejny normalny cykl — nie wymuszać ręcznie wartości.
6. Sprawdzić `MOL_V2_PRODUCTION_DELTAS` (`GT4Ritsrue5U57NA`). PASS wymaga realnego rekordu dla wybranego pracownika:
   - `pak_count > 0` XOR `pick_count > 0`,
   - metryka odpowiada faktycznie zmienionemu licznikowi,
   - `source_time` jest po baseline,
   - `captured_at` odpowiada późniejszemu odczytowi,
   - `attendance_id = <EMPLOYEE_ID>:2026-09-07`,
   - klasyfikacja odpowiada rzeczywistemu stanowi aplikacji.
7. Dla zgodnego aktywnego procesu oczekiwana klasyfikacja to `MATCH_PROCESS`. `BOUNDARY_PAK_PICK` jest dopuszczalne tylko dla zaufanej granicy przełączenia PAK/PICK. `WRONG_PROCESS`, `NO_APP`, `NO_PROCESS` albo `NON_MEASURABLE` są dowodem innego stanu — nie wolno ich ręcznie przepisywać na MATCH_PROCESS.
8. Sprawdzić nowy `MOL_V2_ES_POLL_STATE`:
   - wersja wzrosła,
   - `last_good_at` jest świeże,
   - `state_json` ma nowe liczniki,
   - brak `error_code`.
9. Sprawdzić `MOL_V2_ES_BATCHES`: odpowiedni batch jest `COMMITTED`, brak `PREPARED`.
10. Sprawdzić jego `ES_DERIVED` w outboxie. Format źródłowy jest tworzony jako `<batch_id>:<aggregate_id>:derived`, `request_id=<batch_id>`, payload `{employee_id,work_date,batch_id}`. Po poprawnym summary job powinien zakończyć się `DONE`.
11. Sprawdzić DAILY/MONTHLY/NORM publication oraz `NORM_DRIVE`: brak zaległego retry/recovery i świeża publikacja dla pracownika.
12. Sprawdzić, że `command-writer` po cyklu jest wolny.

Dopiero komplet powyższych punktów = **pozytywny test Stage 7 PASS**.

Nie ustawiać `es_verified=true` przed zebraniem i zapisaniem tego dowodu.

### Reset/licznik malejący

Jeżeli licznik PAK lub PICK jest mniejszy niż zapamiętany baseline, system powinien wykonać rebaseline i nie tworzyć ujemnej lub wymyślonej produkcji. Taki przebieg nie zalicza pozytywnego testu; trzeba wykonać kolejny realny wzrost po nowym baseline.

## Faza C — Stage 8B na tych samych żywych danych, tylko read-only

Cel: potwierdzić, że Context potrafi zinterpretować prawdziwy batch ES przed uruchomieniem automatycznych komunikatów.

Ważne: `METRICS TASK ACK` tworzy `ALERT_DERIVED` tylko wtedy, gdy co najmniej jedna reguła COMM ma `enabled=true`. Ponieważ wszystkie reguły są obecnie wyłączone, poprawny test Stage 7 **nie powinien sam tworzyć nowego ALERT_DERIVED**. Tak ma zostać.

Po PASS Fazy B:
1. Zidentyfikować rzeczywisty zakończony `ES_DERIVED` dla testowanego batchu/pracownika.
2. Z tego realnego rekordu zbudować wyłącznie wejście diagnostyczne Context:
   - `source_outbox_id` = prawdziwy `outbox_id` ES_DERIVED,
   - `source_row_id` = prawdziwe numeryczne `id` rekordu outbox,
   - `employee_id` = pracownik testowy,
   - `work_date = 2026-09-07`,
   - `batch_id` = prawdziwy `ES-...`,
   - `observed_at` = aktualny czas diagnostyki.
3. Wywołać **tylko** `COMM ES ALERT CONTEXT` (`qs36Tri1hIQhU5FH`) przez kontrolowany tymczasowy harness. Harness nie może mieć żadnego zapisu i po teście ma zostać usunięty.
4. Sprawdzić, że Context widzi:
   - właściwego pracownika,
   - prawidłową obecność/proces,
   - prawdziwe `current_batch_deltas`,
   - prawidłowe dane świeżości/normy,
   - trzy typy reguł ES przygotowane do oceny (`WRONG_PROCESS`, `WORK_OUTSIDE_APP`, `NO_ACTIVITY`).
5. Nie wywoływać pełnego Coordinatora w trybie konsumpcji. `auto_alert_consumer_enabled` pozostaje false.
6. Nie tworzyć ręcznie `ALERT_DERIVED` w tabeli tylko po to, żeby przejść test.

PASS Fazy C = prawdziwy batch ES jest poprawnie zrozumiany przez Context, a żaden komunikat nie został wysłany i żaden source alert nie został skonsumowany.

Po tym możemy uznać techniczne źródło ES Stage 8B za zweryfikowane i rozważyć `es_verified=true`, ale **consumer nadal pozostaje false, a reguły nadal false**, dopóki użytkownik nie zatwierdzi finalnej polityki komunikatów.

## Co pozostaje po teście źródła

Osobna decyzja użytkownika jest nadal potrzebna dla:
- odbiorców `WRONG_PROCESS`,
- odbiorców `WORK_OUTSIDE_APP`,
- odbiorców `NO_ACTIVITY`,
- treści każdego automatycznego komunikatu,
- `ack_required`,
- progu `NO_ACTIVITY`.

Dopiero po tej decyzji można przygotować kontrolowany test pełnego `ALERT_DERIVED → CLAIM → rule → persistence → delivery → ACK source` dla jednej reguły i jednego testowego pracownika.

## Twarde warunki STOP

Natychmiast przerwać test bez „naprawiania danych”, jeżeli:
- source ES nie jest świeży lub operatora nie ma,
- występuje counter reset i nie zakończył się rebaseline,
- istnieje `RECOVERY_REQUIRED` lub `ES_BATCHES.PREPARED`,
- `command-writer` ma niepustego ownera, którego nie można wyjaśnić,
- klasyfikacja nie odpowiada rzeczywistemu stanowi procesu,
- pojawi się `ALERT_DERIVED` o `id <= 7689` jako kandydat nowej ścieżki,
- COMM config nieoczekiwanie zmieni `auto_alert_consumer_enabled`, `es_verified` albo `rules.*.enabled`,
- test wymaga zapisu Moniti poza zatwierdzonym zakresem,
- jakikolwiek krok wymaga ręcznego wpisania produkcji, czasu lub statusu w celu uzyskania PASS.

## Stan oczekiwany po zatrzymaniu przed testem

Na koniec przygotowania 06.09:
- nie wykonano realnego dodatniego PAK/PICK,
- `real_positive_es_test_complete=false`,
- `es_verified=false`,
- `auto_alert_consumer_enabled=false`,
- automatyczne reguły COMM=false,
- brak testowych fixture/probe w tabelach,
- command-writer wolny,
- repo/CI i live workflowy są przygotowane do rozpoczęcia Fazy A na żywych danych.
