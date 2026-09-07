# MOL App V2 — rejestr odbiorów

| Etap | Zakres | Test techniczny | Odbiór użytkownika | Status |
|---:|---|---|---|---|
| 1 | Zamrożenie V1, inwentaryzacja, izolowany szkielet V2 | Backend 200; 0 błędów; 0 ostrzeżeń; `writes_enabled=false` | Potwierdzony 2026-09-05 | ODEBRANY |
| 2 | Finalny model działania i kontrakty API | PASS: kontrola kontraktu; uwzględnione korekty z Drive | Zatwierdzony przez użytkownika 2026-09-05 | ODEBRANY |
| 3 | Rdzeń backendu V2 | PASS: 17 schematów; 5 workflowów bez błędów/ostrzeżeń; testy idempotencji, konfliktów, współbieżności i recovery | Potwierdzony przez użytkownika | ODEBRANY |
| 4 | Logowanie i sesja | PASS: backend, idempotencja, race, expiry, rate-limit, testy UI i przeglądarka na atybus | Potwierdzony przez użytkownika | ODEBRANY |
| 5 | Czas pracy | PASS: 39 testów domeny, UI, trzy role, Moniti/Drive, retry, recovery, race; granice w stage-5-acceptance.md | Potwierdzony przez użytkownika po udanej korekcie Drive | ODEBRANY |
| 6 | Procesy pracownika i uprawnienia BIURO | Zakres testów i ograniczenia: stage-6-closeout-20260905.md | Jawnie odebrany przez użytkownika 2026-09-05 | ODEBRANY |
| 7 | ES, normy i spójny status | PASS techniczny na żywych danych 2026-09-07: realny baseline, dodatni PAK, `MATCH_PROCESS`, norma, publiczne worker-status, Google Sheet, Drive mirror, czyste lock/recovery. Dowód: stage7-stage8b-live-evidence-20260907.md | Jawnie odebrany przez użytkownika 2026-09-07 | ODEBRANY |
| 8 | Alerty i komunikacja | PASS: MANUAL, RECIPIENTS, LIST history/changes, SHOWN, ACK, Drive mirror, worker-status, realny START/STOP Moniti i recovery; realny Context ES sprawdzony dla `NO_APP` i `MATCH_PROCESS`, bez uruchamiania automatów | Jawnie odebrany przez użytkownika 2026-09-07 | ODEBRANY |
| 9 | Panel lidera, raporty, użytkownicy i kolejka korekt | PASS: aktywne i poprawne serwisy, publiczne bramki 401 bez sesji, wcześniejsze pełne E2E user-admin/status/corrections; protokół `stage-9-closeout-20260907.md` | Panel testowy obejrzany i zaakceptowany przez użytkownika 2026-09-07 | ODEBRANY |
| 10 | Docelowy frontend V2: mobile role-based + WWW LEADER/ADMIN; pełny katalog procesów, normy dzienne/miesięczne, komunikacja, monitoring i rozdzielone raporty czasu/wydajności | PASS: dedykowany Stage 10 i pełny regres V2 po końcowym audycie kompletności; izolowany preview Pages PASS | Jawnie odebrany przez użytkownika 2026-09-07 | ODEBRANY |
| 11 | Domknięcie backendu pod odebrany frontend, a następnie integracja frontendów z backendem | Backend gap closure rozpoczęty po odbiorze Etapu 10; frontend pozostaje zamrożony do ponownego audytu | — | W TOKU — BACKEND |
| 12 | Pełny regres V2 / Release Candidate | — | — | NIE ROZPOCZĘTO |
| 13 | Android APK/AAB | — | — | NIE ROZPOCZĘTO |
| 14 | Powiadomienia Android w tle | — | — | NIE ROZPOCZĘTO |
| 15 | Pilot magazynowy | — | — | NIE ROZPOCZĘTO |
| 16 | Produkcja i monitoring | — | — | NIE ROZPOCZĘTO |

## Domknięcie etapu 6 i brama etapu 7

Protokół: [stage-6-closeout-20260905.md](stage-6-closeout-20260905.md). BIURO jest ograniczone do LEADER/ADMIN, a listy procesów są sterowane danymi ról i osób w MOL_V2_CONFIG. Nie utworzono fizycznej kolumny allowed_processes w EMPLOYEES; różnica względem literalnego pola jest jawna. Testów fixture nie traktujemy jako nowego odbioru przeglądarkowego lub zalogowanego API. Użytkownik jawnie odebrał etap 6 i zlecił etap 7 dnia 2026-09-05; nie wymagamy ponownego odbioru etapu 6.

## Etap 7 — ODEBRANY 2026-09-07

Wcześniejszy otwarty punkt dodatniej realnej produkcji ES został zamknięty na `MOL004 / dtatarska`. Po odczycie prawdziwego START Moniti 06:28 stan obecności został jednorazowo zsynchronizowany do V2 bez zmiany Moniti. O 08:41 uruchomiono w V2 `PAKOWANIE`; realny batch `ES-681193` przyniósł +2 PAK zaklasyfikowane jako `MATCH_PROCESS`. Kolejne cykle pokazały 5 PAK w normie przy 728 s pakowania i wynik 35,3%, zgodny w publicznym `worker-status` i arkuszu `Normy dzienne V2`.

`NORM_DRIVE` zakończył się `DONE`, `command-writer` jest wolny, nie ma `RECOVERY_REQUIRED` ani batchy `PREPARED`. Pełny dowód: [stage7-stage8b-live-evidence-20260907.md](stage7-stage8b-live-evidence-20260907.md).

Użytkownik 2026-09-07 jawnie uznał etap 7 za zamknięty. Nie wracać do odbioru Stage 7 ani nie powtarzać pozytywnego testu ES, chyba że nowy błąd/regresja uzasadni ponowną weryfikację.

## Etap 8 — ODEBRANY 2026-09-07

Etap 8 został technicznie wdrożony 2026-09-06. Zaliczone zostało realne E2E LEADER → WORKER dla komunikatu MANUAL, pełna i przyrostowa historia, SHOWN, ACK, mirror Drive oraz realny START/STOP Moniti po czasowym rozszerzeniu zgody użytkownika na 2026-09-06. Podczas E2E wykryto i naprawiono błąd dynamicznego filtrowania Data Table w paginacji LIST. Pełny protokół: [stage-8-e2e-20260906.md](stage-8-e2e-20260906.md).

Dnia 2026-09-07 Stage 8B Context został dodatkowo sprawdzony na prawdziwym `NO_APP` oraz prawdziwym `MATCH_PROCESS`. Dla zgodnego PAKOWANIA nie wygenerował `WRONG_PROCESS` ani `WORK_OUTSIDE_APP`; NO_ACTIVITY pozostało fail-closed przy `coverage=PARTIAL`. Test nie zapisał komunikatu i nie uruchomił konsumpcji alertów.

Automatyczne reguły alertów pozostają świadomie wyłączone: `COMMUNICATIONS_CONFIG.es_verified=false`, `auto_alert_consumer_enabled=false`, wszystkie reguły `enabled=false`, `history_policy=HOLD`, cutover `7689`. To jest zaakceptowany bezpieczny stan końcowy etapu 8. Późniejsze uruchomienie automatycznych alertów wymaga osobnej decyzji biznesowej o odbiorcach, treści, ACK i progach; nie jest warunkiem ponownego odbioru Stage 8.

Użytkownik 2026-09-07 jawnie uznał etap 8 za zamknięty. Nie wracać do odbioru Stage 8 ani nie aktywować auto-alertów bez nowej dyspozycji.

## Etap 9 — ODEBRANY 2026-09-07

Panel lidera został wdrożony i pokazany na środowisku testowym. Użytkownik potwierdził, że wygląda poprawnie i zlecił domknięcie Etapu 9 oraz przejście do Etapu 10.

Zakres końcowy Etapu 9 jest szerszy od pierwotnej koncepcji read-only. Obejmuje kontrolowane operacje administracyjne i korekty przy zachowaniu rozdziału ról:

- WORKER nie ma panelu lidera ani cudzych danych,
- LEADER widzi cały zespół i może zarządzać kontami WORKER w zatwierdzonym zakresie,
- ADMIN ma rozszerzone zarządzanie użytkownikami,
- kolejka korekt obsługuje akceptację i odrzucenie,
- odrzucona niezmieniona korekta nie może ominąć decyzji przez starszą ścieżkę zatwierdzania.

Pełny protokół: [stage-9-closeout-20260907.md](stage-9-closeout-20260907.md). Kontrakt live: `backend/v2/stage9-live-contract.json`.

Frontend użyty do odbioru Etapu 9 pozostaje narzędziem testowym. Nie jest docelowym frontendem produkcyjnym.

## Etap 10 — ODEBRANY 2026-09-07

Etap 10 zbudował docelowy frontend na zaakceptowanym backendzie Stage 9 i kolejnych doprecyzowaniach użytkownika. Użytkownik 2026-09-07 jawnie odebrał końcowy frontend po audycie kompletności.

Model dostępu docelowego:

1. WORKER korzysta wyłącznie z aplikacji mobilnej.
2. LEADER i ADMIN mogą korzystać z aplikacji mobilnej z dodatkowymi ekranami wynikającymi z roli.
3. LEADER i ADMIN mają dodatkowo dostęp do rozbudowanego panelu WWW.
4. WORKER nie ma dostępu do panelu WWW ani do menedżerskich danych przez bezpośrednie API.

Finalny frontend odwzorowuje 10 kanonicznych procesów backendu. WORKER ma 9 procesów bez BIURO; LEADER/ADMIN wszystkie 10. `MAGAZYN` jest aktywowany od razu po kliknięciu procesu; dwa narzędzia magazynowe są wyłącznie opcjonalnym dodatkiem. Demonstracyjne SORTOWANIE zostało usunięte.

Norma pracownika jest pokazana osobno dla dnia i od początku bieżącego miesiąca. W obu okresach PICK, PAK i PICK/PAK mają jawne pola: `Ilość łącznie`, `Ilość do normy`, `Ilość poza normą`, `Czas`, `Procent normy`. PICK/PAK używa reguły `1 PAK = 1 j.n.; 3 PICK = 1 j.n.`.

Panel lidera rozdziela `Wydajność` i `Czas pracy`, obsługuje jednego/wielu/wszystkich pracowników i dowolny zakres dat. Komunikaty lidera mają osobny ekran oraz szybkie wejście z wybranego pracownika. Monitoring obejmuje proces, czasy, wyniki, alerty, aktywność aplikacji i diagnostykę źródła ES.

Audyt `stage-10-frontend-backend-audit-20260907.md` wykazał kilka braków kontraktowych backendu. Na polecenie użytkownika po odbiorze Etapu 10 frontend zostaje zamrożony, a Etap 11 rozpoczyna się od uzupełnienia backendu. Dopiero po ponownym audycie można rozpocząć integrację finalnego frontendu.

## Historyczny test odbiorowy etapu 1

1. Otwórz produkcyjną V1 i potwierdź, że ekran logowania działa jak wcześniej.
2. Otwórz testową V2 pod adresem `/v2/`.
3. Na V2 sprawdź, czy kafel backendu pokazuje `ONLINE`.
4. Sprawdź, czy `Zapisy danych` pokazują `WYŁĄCZONE`.
5. Kliknij `Sprawdź ponownie` i potwierdź, że status nadal jest `ONLINE`.

Etap 1 został odebrany przez użytkownika 2026-09-05. Powyższe oczekiwania dotyczą tamtego etapu, nie bieżących flag integracji. V1 nie jest zmieniana podczas realizacji V2 bez osobnej zgody.
