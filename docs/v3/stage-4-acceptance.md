# MOL App V3 — Etap 4 — ES, normy i wyniki

Status: **wdrożony technicznie, DO ODBIORU użytkownika**. Etap nie jest zaakceptowany bez jawnego `AKCEPTUJĘ ETAP 4`.

## Zakres

- Centralny odczyt statystyk operatorów EasyStorage co 1 minutę w dni robocze 06:00–18:00.
- Mapowanie V3 `employee_id -> es_worker_id`; telefon nie odpytuje EasyStorage bezpośrednio.
- Izolowany baseline/checkpoint liczników ES oraz zamrożone delty produkcji V3.
- Pierwszy odczyt dnia ustawia baseline i nie przypisuje wcześniejszej produkcji.
- Spadek/reset licznika ustawia nowy baseline; ujemne przyrosty nie są tworzone.
- Przyrost kwalifikowany jest według obecności V3 i procesu obejmującego cały interwał odczytu.
- `PAKOWANIE + PAK` i `KOMPLETACJA + PICK` mogą wejść do normy; brak obecności, brak procesu, proces niemierzalny, zły proces lub granica procesu trafiają do `outside` z zamrożonym powodem.
- Granica zmiany procesu jest fail-closed (`BOUNDARY_UNCERTAIN`), bez wymyślania momentu przyrostu i bez podwójnego zaliczania.
- Normy czytane z `MOL // APP / NORMY` / `KONFIG`: PAK 70/h, PICK 210/h, przelicznik 3 PICK = 1 jednostka PAK.
- API udostępnia wynik dzienny i miesięczny. Miesiąc jest liczony jako wynik ważony z sum liczników i mianowników, a nie średnia procentów dni.
- Zerowy mianownik zwraca `null` / `NO_ELIGIBLE_PROCESS_TIME`, nie fałszywe 0%.
- Stan źródła ES: `FRESH`, `STALE`, `UNAVAILABLE`, czas ostatniego odczytu oraz jawny błąd mapowania/braku operatora w raporcie.
- Każda odpowiedź wynikowa ma monotoniczny `snapshot_version`; frontend MOBILE ignoruje starszą odpowiedź i przy błędzie odświeżenia zachowuje ostatni poprawny wynik.
- Minimalny UI Etapu 4 jest podłączony na MOBILE: norma dzienna i miesięczna, PAK, PICK, wynik łączny, ilość do normy, poza normą, czas i procent.
- WWW nie otrzymał funkcji panelu wydajności zespołu — to zakres późniejszego etapu panelu lidera. Stały link WWW pozostaje do regresji logowania/sesji i wcześniejszych funkcji.

## Nowe workflowy V3

- `MOL // APP V3 // ES LIVE POLL` — `UZHF0XFvQsnC0XLB` — ACTIVE.
- `MOL // APP V3 // API PERFORMANCE` — `PPnMZTz4E9OhZMJL` — ACTIVE.

## Nowe Data Tables V3

- `MOL_V3_ES_COUNTER_STATE` — `6BLbrW3CvPRT0Z3c`.
- `MOL_V3_PRODUCTION_DELTAS` — `M9tHlnU1V9CkJACp`.

## Endpointy

- `GET /webhook/mol-app-v3-performance-daily`
- `GET /webhook/mol-app-v3-performance-monthly`

## Wzory

- `PAK% = eligible_PAK / (hours_PAK * 70) * 100`
- `PICK% = eligible_PICK / (hours_PICK * 210) * 100`
- `PICK/PAK% = (eligible_PAK + eligible_PICK/3) / ((hours_PAK + hours_PICK) * 70) * 100`
- Miesiąc: suma liczników / suma mianowników.

## Dowody techniczne 2026-09-11

- `ES LIVE POLL`: walidacja runtime PASS, 18 węzłów, 17 poprawnych połączeń, 0 błędów, 0 ostrzeżeń; read-back aktywnej wersji potwierdzony.
- `API PERFORMANCE`: walidacja runtime PASS, 17 węzłów, 17 poprawnych połączeń, 0 błędów, 0 ostrzeżeń; read-back aktywnej wersji potwierdzony.
- Live ES rzeczywiście aktualizuje stan i delty co minutę. Po włączeniu kontroli obecności bieżące wykonania bez otwartego dnia V3 są zapisywane jako `NO_ATTENDANCE` i w całości `outside`.
- Testy ochrony API bez sesji: daily = HTTP 401 `UNAUTHENTICATED`; monthly = HTTP 401 `UNAUTHENTICATED`.
- Test health po wdrożeniu: HTTP 200, `READY`, `MOL_APP_V3`.
- Fixture wzorów: 70 PAK / 1h = 100%; 210 PICK / 1h = 100%; 70 PAK + 210 PICK / 2h = 100%; ważenie 70 PAK / 4h = 25%.
- GitHub Pages dla builda `20260911.7`: deploy SUCCESS. Globalny workflow `Validate frontend` ma osobny błąd na historycznym teście CORS nieaktywnego endpointu V2; jego krok `Check JavaScript syntax` zakończył się SUCCESS. Nie zmieniano tego testu w Etapie 4, aby nie rozszerzać zakresu.

## Granice odbioru

- Automatyczny test uwierzytelnionego endpointu Stage 4 nie został wykonany przez narzędzie, ponieważ nie eksportujemy ani nie obchodzimy zabezpieczeń surowego tokenu/hasła. Test użytkownika na istniejącej sesji MOBILE jest częścią odbioru.
- Nie wdrożono alertów/komunikacji, panelu wydajności zespołu WWW, raportów lidera, eksportów ani APK/push — to późniejsze etapy.
- Mechanizm wspólnego testowego hasła pozostaje tymczasowy zgodnie z wcześniejszym ustaleniem i musi zostać usunięty przed produkcją.
- Instancja PRIV nie była używana do żadnego zapisu.

## Build i linki odbiorowe

Build frontendu: `20260911.7`.

MOBILE: https://atybus-create.github.io/mol-worker-app/pwa/mobile/login.html

WWW: https://atybus-create.github.io/mol-worker-app/pwa/web/login.html
