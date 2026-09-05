# Etap 7 - ES, normy i spojny status

Data rozpoczecia: 2026-09-05. Uzytkownik jawnie odebral etap 6 i zlecil wykonanie etapu 7 element po elemencie. Odbior etapu 6 nie zmienia historycznych ograniczen jego testow. Etap 8 nie jest rozpoczety.

Punkt powrotu: main `63c3f6faf0ac52151636be95c224ea5161cbf4b9`, galaz `backup/pre-stage7-20260905`. Prace: `codex/stage7-es-norms`. Nie zmieniamy V1, jej tabel ani raportow. Nie rozszerzamy dat/osob testow Moniti.

| Element | Zakres | Status |
|---|---|---|
| 7.1 | Odczyt kodu/live, mapowania, backup | WYKONANY |
| 7.2 | Checkpointy ES, zamrozone partie zapisu, publikacja agregatow i rewizje widoku | W TRAKCIE |
| 7.3 | Centralny odczyt ES, baseline/reset/deduplikacja, klasyfikacja i granice procesow | PLAN |
| 7.4 | Normy dzienne i wazony miesiac, konsument ATTENDANCE_DERIVED | PLAN |
| 7.5 | Worker-status i daily/monthly, autoryzacja i ochrona starych odpowiedzi | PLAN |
| 7.6 | Minimalny UI norm i odizolowany mirror Sheets | PLAN |
| 7.7 | Regresja, awarie/retry, dowody, publikacja, odbior | PLAN |

## Odczyt poczatkowy

MCP: n8n-estyl-team. Health 0.6.0, stage 6, READY/ONLINE, HTTP 200. V2 ma trzy aktywne konta: MOL004/dtatarska WORKER, MOL014/asorokopud LEADER, MOL015/atybus ADMIN. es_worker_id zgadza sie z es_operator w odczytanej referencji V1. Nie zmieniono hasel, rol ani mapowan. ES_ENABLED=false przed etapem 7. Tabela produkcji V2 byla pusta.

Referencje V1 `13K8nWM3QYV13GUr` i `V27sooFYIuQaskUR` sa obecnie nieaktywne (inaczej niz historyczny pakiet); odczytano ich draft, nie uruchamiano. Raport ES ma kolumny Operator, Ilosc zadan PICK i ilosc skontrolowanych zamowien (dokladne polskie klucze zachowuje adapter). Zwraca narastajace liczniki dnia, nie timestampy pojedynczych zdarzen. Helper cookie `pOllPUXcKbtX9MG8` jest aktywny i tylko odczytuje wspolny magazyn sesji ES.

## Reguly wdrozenia

PAK 70/h, PICK 210/h, przelicznik 3. Miesiac = suma licznikow / suma mianownikow, nigdy srednia procentow dni. Zerowy czas mierzalny daje null z NO_ELIGIBLE_PROCESS_TIME. PRZERWA i inne procesy niemierzalne nie wchodza do mianownika. Klasyfikacja delt jest niezmienna po korekcie czasu.

Pierwszy odczyt operatora w dniu i reset licznika ustanawiaja baseline bez naliczenia historycznej produkcji. Brak operatora lub blad ES nie oznacza zera. Jednoczesny przyrost PAK/PICK nie jest sam w sobie dowodem granicy procesu. Odczyt graniczny i okresowy korzystaja z tego samego checkpointu; nie moga naliczyc tej samej delty dwukrotnie.

Nowe tabele sa dodatkiem do 19 istniejacych schematow. Bez usuwania lub odtwarzania tabel pracownikow. Zapisy wielotabelowe wymagaja wspolnej blokady i zamrozonego planu; sam upsert nie jest transakcja. Wersja widoku norm jest oddzielona od attendance.version uzywanej przez komendy.

## Testy wymagane

Reczne przypadki 70 PAK/1h, 210 PICK/1h, mieszany dzien 100%, wazony miesiac 25% zamiast 50%; baseline/reset/duplikat/spozniony odczyt/polnoc/DST/mapowania; outside bez dnia/procesu i przy zlym procesie; granice, STOP, korekta, recovery; zachowanie normy przy bledzie i odwroconej kolejnosci odpowiedzi; WORKER nie odczytuje cudzych wynikow; lider/admin widza wszystkich. Wyniki fixture, testy live i testy niewykonane beda rozdzielone.
