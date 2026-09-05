# Etap 7 - ES, normy i spojny status

Data rozpoczecia: 2026-09-05. Uzytkownik jawnie odebral etap 6 i zlecil wykonanie etapu 7 element po elemencie. Odbior etapu 6 nie zmienia historycznych ograniczen jego testow. Etap 8 nie jest rozpoczety.

Punkt powrotu: main `63c3f6faf0ac52151636be95c224ea5161cbf4b9`, galaz `backup/pre-stage7-20260905`. Prace: `codex/stage7-es-norms`. Nie zmieniamy V1, jej tabel ani raportow. Nie rozszerzamy dat/osob testow Moniti.

| Element | Zakres | Status |
|---|---|---|
| 7.1 | Odczyt kodu/live, mapowania, backup | WYKONANY |
| 7.2 | Checkpointy ES, zamrozone partie zapisu, publikacja agregatow i rewizje widoku | WDROZONE; TESTY KONCOWE |
| 7.3 | Centralny odczyt ES, baseline/reset/deduplikacja, klasyfikacja i granice procesow | WDROZONE; TESTY KONCOWE |
| 7.4 | Normy dzienne i wazony miesiac, konsument ATTENDANCE_DERIVED | WDROZONE; TESTY KONCOWE |
| 7.5 | Worker-status i daily/monthly, autoryzacja i ochrona starych odpowiedzi | WDROZONE; TESTY KONCOWE |
| 7.6 | Minimalny UI norm i odizolowany mirror Sheets | WDROZONE; TESTY KONCOWE |
| 7.7 | Regresja, awarie/retry, dowody, publikacja, odbior | WDROZONE; TESTY KONCOWE |

## Odczyt poczatkowy

MCP: n8n-estyl-team. Health 0.6.0, stage 6, READY/ONLINE, HTTP 200. V2 ma trzy aktywne konta: MOL004/dtatarska WORKER, MOL014/asorokopud LEADER, MOL015/atybus ADMIN. es_worker_id zgadza sie z es_operator w odczytanej referencji V1. Nie zmieniono hasel, rol ani mapowan. ES_ENABLED=false przed etapem 7. Tabela produkcji V2 byla pusta.

Referencje V1 `13K8nWM3QYV13GUr` i `V27sooFYIuQaskUR` sa obecnie nieaktywne (inaczej niz historyczny pakiet); odczytano ich draft, nie uruchamiano. Raport ES ma kolumny Operator, Ilosc zadan PICK i ilosc skontrolowanych zamowien (dokladne polskie klucze zachowuje adapter). Zwraca narastajace liczniki dnia, nie timestampy pojedynczych zdarzen. Helper cookie `pOllPUXcKbtX9MG8` jest aktywny i tylko odczytuje wspolny magazyn sesji ES.

## Reguly wdrozenia

PAK 70/h, PICK 210/h, przelicznik 3. Miesiac = suma licznikow / suma mianownikow, nigdy srednia procentow dni. Zerowy czas mierzalny daje null z NO_ELIGIBLE_PROCESS_TIME. PRZERWA i inne procesy niemierzalne nie wchodza do mianownika. Klasyfikacja delt jest niezmienna po korekcie czasu.

Pierwszy odczyt operatora w dniu i reset licznika ustanawiaja baseline bez naliczenia historycznej produkcji. Brak operatora lub blad ES nie oznacza zera. Jednoczesny przyrost PAK/PICK nie jest sam w sobie dowodem granicy procesu. Odczyt graniczny i okresowy korzystaja z tego samego checkpointu; nie moga naliczyc tej samej delty dwukrotnie.

Nowe tabele sa dodatkiem do 19 istniejacych schematow. Bez usuwania lub odtwarzania tabel pracownikow. Zapisy wielotabelowe wymagaja wspolnej blokady i zamrozonego planu; sam upsert nie jest transakcja. Wersja widoku norm jest oddzielona od attendance.version uzywanej przez komendy.

## Testy wymagane

Reczne przypadki 70 PAK/1h, 210 PICK/1h, mieszany dzien 100%, wazony miesiac 25% zamiast 50%; baseline/reset/duplikat/spozniony odczyt/polnoc/DST/mapowania; outside bez dnia/procesu i przy zlym procesie; granice, STOP, korekta, recovery; zachowanie normy przy bledzie i odwroconej kolejnosci odpowiedzi; WORKER nie odczytuje cudzych wynikow; lider/admin widza wszystkich. Wyniki fixture, testy live i testy niewykonane beda rozdzielone.

## Checkpoint kontynuacji

Backend etapu 7, wspolny status i raport norm sa opublikowane. UI pozostaje na galezi do koncowego scalania. Dodatnie wyniki ES nie sa potwierdzone na realnych kontach: sobotni raport nie zawiera trzech operatorow; komunikat ES_OPERATOR_NOT_FOUND jest jawny. Nie wykonano nowego zalogowanego E2E ani nowych zapisow Moniti.

Regresja lokalna: 276 numerowanych przypadkow (71 metrics, 39 attendance, 41 processes, 23 permissions, 24 norms UI, 16 mirror, 22 worker view, 19 persistence/recovery, 10 summary input, 11 scheduler), plus auth/password/attendance UI. To testy izolowane, nie rownoznaczne z produkcyjnym load-testem. Generatory tworza 34 grafy V2 z 24 schematami.

Raport: Normy dzienne V2 (sheetId 7), Normy miesieczne V2 (8). Pierwszy udany zapis i read-back: execution 584218, MOL004:2026-09 v2, 2 zweryfikowane wiersze. Kolejny: 584318, MOL015:2026-09 v2. Brak niezrealizowanych NORM_DRIVE po zakonczeniu zapisu. Formularze norm wymagaja jawnej dostepnosci, zerowy mianownik daje pusta komorke.

Poprawki testowe: powtorzony niezmieniony worker-status zachowuje lock_owner; wszystkie delty ESB wymagaja COMMITTED komendy; zrodlo granicy innego operatora jest czytane po UUID; zamknieta praca przez polnoc uzywa checkpointu dnia STOP. Ograniczona kolejka przeliczen rotuje zamiast pomijac osoby za szosta pozycja.

Granica algorytmu ES: raport zawiera narastajace liczniki, nie czasy pojedynczych zdarzen. Przypisanie oznacza kwalifikacje podczas odczytu przy wspolnej blokadzie, nie dowod faktycznego czasu wykonania kazdego zadania. PAK/PICK na granicy sa dopuszczone wylacznie dla zamrozonej komendy zmiany tych dwoch procesow. Po bledzie odczytu na granicy stosowany jest jawny gap/rebaseline, nie zgadywanie historii.
