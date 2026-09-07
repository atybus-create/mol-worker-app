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
| 9 | Panel lidera i raporty | — | — | NIE ROZPOCZĘTO |
| 10 | Spójny frontend V2 | — | — | NIE ROZPOCZĘTO |
| 11 | Test równoległy V1 kontra V2 | — | — | NIE ROZPOCZĘTO |
| 12 | Przełączenie produkcji | — | — | NIE ROZPOCZĘTO |

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

## Następna brama — Etap 9

Etapy 1–8 są odebrane. Następny planowany etap to **Etap 9 — Panel lidera i raporty**. Rozpoczynając nową rozmowę, najpierw wykonać krótki read-only sanity check bieżącego HEAD working branch, live health i acceptance-log, a następnie przejść bezpośrednio do wdrażania Stage 9. Nie zaczynać ponownie etapów 7/8.

Zakres roli LEADER przyjęty wcześniej przez użytkownika:
1. Konto `asorokopud` otwiera panel lidera i widzi wszystkich pracowników, także bez przypisanego `leader_id`.
2. Lider widzi czas pracy, procesy, normy, wyniki, historię i raporty pracowników.
3. Lider wysyła komunikat do wybranej osoby i do wszystkich; część komunikacyjna została odebrana w Stage 8.
4. Konto WORKER nie uzyskuje panelu lidera ani cudzych danych, również przez bezpośrednie wywołanie API.
5. Lider nie uzyskuje administracji konfiguracją, nadawania ról, haseł ani tokenów. Podgląd nie nadaje dodatkowych praw edycji poza zatwierdzonymi korektami czasu pracy.
6. Stage 9 obejmuje także raporty/eksport oraz docelowy przycisk zatwierdzania korekty bezpośrednio w odpowiednim arkuszu Google Sheets.

## Historyczny test odbiorowy etapu 1

1. Otwórz produkcyjną V1 i potwierdź, że ekran logowania działa jak wcześniej.
2. Otwórz testową V2 pod adresem `/v2/`.
3. Na V2 sprawdź, czy kafel backendu pokazuje `ONLINE`.
4. Sprawdź, czy `Zapisy danych` pokazują `WYŁĄCZONE`.
5. Kliknij `Sprawdź ponownie` i potwierdź, że status nadal jest `ONLINE`.

Etap 1 został odebrany przez użytkownika 2026-09-05. Powyższe oczekiwania dotyczą tamtego etapu, nie bieżących flag integracji. V1 nie jest zmieniana podczas realizacji V2 bez osobnej zgody.
