# MOL App V2 — rejestr odbiorów

| Etap | Zakres | Test techniczny | Odbiór użytkownika | Status |
|---:|---|---|---|---|
| 1 | Zamrożenie V1, inwentaryzacja, izolowany szkielet V2 | Backend 200; 0 błędów; 0 ostrzeżeń; `writes_enabled=false` | Potwierdzony 2026-09-05 | ODEBRANY |
| 2 | Finalny model działania i kontrakty API | PASS: kontrola kontraktu; uwzględnione korekty z Drive | Zatwierdzony przez użytkownika 2026-09-05 | ODEBRANY |
| 3 | Rdzeń backendu V2 | PASS: 17 schematów; 5 workflowów bez błędów/ostrzeżeń; testy idempotencji, konfliktów, współbieżności i recovery | Potwierdzony przez użytkownika | ODEBRANY |
| 4 | Logowanie i sesja | PASS: backend, idempotencja, race, expiry, rate-limit, testy UI i przeglądarka na atybus | Potwierdzony przez użytkownika | ODEBRANY |
| 5 | Czas pracy | PASS: 39 testów domeny, UI, trzy role, Moniti/Drive, retry, recovery, race; granice w stage-5-acceptance.md | Potwierdzony przez użytkownika po udanej korekcie Drive | ODEBRANY |
| 6 | Procesy pracownika i uprawnienia BIURO | Historyczne testy: stage-6-acceptance.md. Domknięcie: 41 testów procesów, 39 obecności, 23 wygenerowanego Decide, UI/auth/kontrakt PASS; n8n 0 błędów. Nowy zalogowany test API zablokowany przez narzędzie — niezaliczony; szczegóły w stage-6-closeout-20260905.md | Oczekuje; polecenie domknięcia nie jest odbiorem | DO ODBIORU |
| 7 | Normy i wyniki | — | — | NIE ROZPOCZĘTO |
| 8 | Alerty i komunikacja | — | — | NIE ROZPOCZĘTO |
| 9 | Panel lidera i raporty | — | — | NIE ROZPOCZĘTO |
| 10 | Spójny frontend V2 | — | — | NIE ROZPOCZĘTO |
| 11 | Test równoległy V1 kontra V2 | — | — | NIE ROZPOCZĘTO |
| 12 | Przełączenie produkcji | — | — | NIE ROZPOCZĘTO |

## Domknięcie etapu 6

Protokół: [stage-6-closeout-20260905.md](stage-6-closeout-20260905.md). BIURO jest ograniczone do LEADER/ADMIN, a listy procesów są sterowane danymi ról i osób w MOL_V2_CONFIG. Nie utworzono fizycznej kolumny allowed_processes w EMPLOYEES; różnica względem literalnego pola jest jawna. Testów fixture nie traktujemy jako nowego odbioru przeglądarkowego lub zalogowanego API. Etap 7 pozostaje zamknięty do decyzji użytkownika.

## Wymagania odbiorowe roli LEADER — etapy 8 i 9

Zatwierdzone doprecyzowanie użytkownika: każdy lider ma dostęp do panelu lidera, podglądu wszystkich danych pracowników w aplikacji oraz wysyłania komunikatów. To wymaganie, nie potwierdzenie wdrożenia tych etapów.

1. Konto `asorokopud` otwiera panel lidera i widzi wszystkich pracowników, także bez przypisanego `leader_id`.
2. Lider widzi czas pracy, procesy, normy, wyniki, historię i raporty pracowników.
3. Lider wysyła komunikat do wybranej osoby i do wszystkich; odbiorcy widzą komunikat po ponownym odczycie.
4. Konto WORKER nie uzyskuje panelu lidera ani cudzych danych, również przez bezpośrednie wywołanie API.
5. Lider nie uzyskuje administracji konfiguracją, nadawania ról, haseł ani tokenów. Podgląd nie nadaje dodatkowych praw edycji poza zatwierdzonymi korektami czasu pracy.

## Test odbiorowy etapu 1

1. Otwórz produkcyjną V1 i potwierdź, że ekran logowania działa jak wcześniej.
2. Otwórz testową V2 pod adresem `/v2/`.
3. Na V2 sprawdź, czy kafel backendu pokazuje `ONLINE`.
4. Sprawdź, czy `Zapisy danych` pokazują `WYŁĄCZONE`.
5. Kliknij `Sprawdź ponownie` i potwierdź, że status nadal jest `ONLINE`.

Etap 1 został odebrany przez użytkownika 2026-09-05. V1 pozostała dostępna bez zmian, razem ze znanymi błędami, które nie mogą zostać przeniesione do V2.
