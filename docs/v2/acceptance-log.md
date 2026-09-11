# MOL App V2 — rejestr odbiorów

| Etap | Zakres | Test techniczny | Odbiór użytkownika | Status |
|---:|---|---|---|---|
| 1 | Zamrożenie V1, inwentaryzacja, izolowany szkielet V2 | Backend 200; 0 błędów; 0 ostrzeżeń; `writes_enabled=false` | Potwierdzony 2026-09-05 | ODEBRANY |
| 2 | Finalny model działania i kontrakty API | PASS: kontrola kontraktu; uwzględnione korekty z Drive | Zatwierdzony przez użytkownika 2026-09-05 | ODEBRANY |
| 3 | Rdzeń backendu V2 | PASS: 17 schematów; 5 workflowów bez błędów/ostrzeżeń; testy idempotencji, konfliktów, współbieżności i recovery | Potwierdzony przez użytkownika | ODEBRANY |
| 4 | Logowanie i sesja | PASS: backend, idempotencja, race, expiry, rate-limit, testy UI i przeglądarka na atybus | Potwierdzony przez użytkownika | ODEBRANY |
| 5 | Czas pracy | PASS: 39 testów domeny, UI, trzy role, Moniti/Drive, retry, recovery, race; granice w stage-5-acceptance.md | Potwierdzony przez użytkownika po udanej korekcie Drive | ODEBRANY |
| 6 | Procesy pracownika i uprawnienia BIURO | Zakres testów i ograniczenia: stage-6-closeout-20260905.md | Jawnie odebrany przez użytkownika w tej rozmowie 2026-09-05 | ODEBRANY |
| 7 | ES, normy i spójny status | 276 izolowanych przypadków PASS, raport Sheets i publiczne API sprawdzone; niezaliczone: dodatnia produkcja ES, zalogowany E2E i test wizualny. Protokół: stage-7-acceptance.md; publikacja: stage-7-release.md | Oczekuje na decyzję po zapoznaniu z ograniczeniami | DO ODBIORU — E2E OTWARTE |
| 8 | Alerty i komunikacja | PASS: MANUAL, RECIPIENTS, LIST history/changes, SHOWN, ACK, Drive mirror, worker-status, realny START/STOP Moniti i recovery; CI Stage 8 zielone. Protokół: stage-8-e2e-20260906.md | Oczekuje na jawny odbiór użytkownika | DO ODBIORU |
| 9 | Panel lidera i raporty | — | — | NIE ROZPOCZĘTO |
| 10 | Spójny frontend V2 | — | — | NIE ROZPOCZĘTO |
| 11 | Test równoległy V1 kontra V2 | — | — | NIE ROZPOCZĘTO |
| 12 | Przełączenie produkcji | — | — | NIE ROZPOCZĘTO |

## Domknięcie etapu 6 i brama etapu 7

Protokół: [stage-6-closeout-20260905.md](stage-6-closeout-20260905.md). BIURO jest ograniczone do LEADER/ADMIN, a listy procesów są sterowane danymi ról i osób w MOL_V2_CONFIG. Nie utworzono fizycznej kolumny allowed_processes w EMPLOYEES; różnica względem literalnego pola jest jawna. Testów fixture nie traktujemy jako nowego odbioru przeglądarkowego lub zalogowanego API. Użytkownik jawnie odebrał etap 6 i zlecił etap 7 dnia 2026-09-05; nie wymagamy ponownego odbioru etapu 6.

Etap 7 nie został jeszcze odebrany przez użytkownika. Wdrożenie kodu i zaliczenie testów automatycznych nie zamykają niewykonanych scenariuszy E2E. Użytkownik jawnie zlecił wdrożenie etapu 8 mimo otwartego punktu dodatniej produkcji ES w etapie 7; wykonanie etapu 8 nie zamyka automatycznie etapu 7.

## Etap 8 — stan do odbioru

Etap 8 został technicznie wdrożony 2026-09-06. Zaliczone zostało realne E2E LEADER → WORKER dla komunikatu MANUAL, pełna i przyrostowa historia, SHOWN, ACK, mirror Drive oraz realny START/STOP Moniti po czasowym rozszerzeniu zgody użytkownika na 2026-09-06. Podczas E2E wykryto i naprawiono błąd dynamicznego filtrowania Data Table w paginacji LIST. Pełny protokół: [stage-8-e2e-20260906.md](stage-8-e2e-20260906.md).

Automatyczne reguły alertów pozostają świadomie wyłączone: brak zatwierdzonych progów/godzin/ACK, a reguły produkcyjne pozostają dodatkowo zablokowane przez `es_verified=false`. To jest zamierzona konfiguracja bezpieczna, a nie brak wdrożonego silnika.

## Wymagania odbiorowe roli LEADER — etapy 8 i 9

Zatwierdzone doprecyzowanie użytkownika: każdy lider ma dostęp do panelu lidera, podglądu wszystkich danych pracowników w aplikacji oraz wysyłania komunikatów. Etap 8 potwierdza część komunikacyjną; pełny panel lidera i raporty pozostają zakresem etapu 9.

1. Konto `asorokopud` otwiera panel lidera i widzi wszystkich pracowników, także bez przypisanego `leader_id`.
2. Lider widzi czas pracy, procesy, normy, wyniki, historię i raporty pracowników.
3. Lider wysyła komunikat do wybranej osoby i do wszystkich; odbiorcy widzą komunikat po ponownym odczycie.
4. Konto WORKER nie uzyskuje panelu lidera ani cudzych danych, również przez bezpośrednie wywołanie API.
5. Lider nie uzyskuje administracji konfiguracją, nadawania ról, haseł ani tokenów. Podgląd nie nadaje dodatkowych praw edycji poza zatwierdzonymi korektami czasu pracy.

## Historyczny test odbiorowy etapu 1

1. Otwórz produkcyjną V1 i potwierdź, że ekran logowania działa jak wcześniej.
2. Otwórz testową V2 pod adresem `/v2/`.
3. Na V2 sprawdź, czy kafel backendu pokazuje `ONLINE`.
4. Sprawdź, czy `Zapisy danych` pokazują `WYŁĄCZONE`.
5. Kliknij `Sprawdź ponownie` i potwierdź, że status nadal jest `ONLINE`.

Etap 1 został odebrany przez użytkownika 2026-09-05. Powyższe oczekiwania dotyczą tamtego etapu, nie bieżących flag integracji. V1 nie jest zmieniana podczas realizacji V2 bez osobnej zgody.
