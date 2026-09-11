# Etap 7 — ES, normy i spójny status: protokół odbiorowy

Data: 2026-09-05. Wersja V2: 0.7.0. Etap 6 został jawnie odebrany przez użytkownika. Etap 7: implementacja i weryfikacja automatyczna przygotowane do odbioru; brak pełnego potwierdzenia end-to-end. Etap 8 nie został rozpoczęty. Publikację frontendu i dokładny commit main dokumentuje osobny `stage-7-release.md`; ten protokół nie zastępuje potwierdzenia publikacji ani decyzji użytkownika.

## 7.1–7.6 — wykonany zakres

| Element | Implementacja | Granica potwierdzenia |
|---|---|---|
| 7.1 | Odczyt V1 jako referencji, mapowania trzech kont i punkt powrotu | Bez migracji całego zespołu i bez zmiany V1 |
| 7.2 | Pięć dodatkowych tabel: ES_POLL_STATE, ES_BATCHES, NORM_SNAPSHOTS, STATUS_SNAPSHOTS, REPORT_INDEX | Łącznie 24 schematy; nie odtwarzano tabel pracowników |
| 7.3 | Centralny odczyt ES, baseline, reset, deduplikacja, zamrożona klasyfikacja i odczyt graniczny | Brak dodatniej produkcji rzeczywistych kont w sobotnim źródle; szczegóły niżej |
| 7.4 | Normy dzienne, ważony miesiąc, przeliczanie po zdarzeniach i bezpieczne rozliczanie outboxa | Wyniki liczbowe potwierdzone na fixture, obsługa braków źródła także live |
| 7.5 | Worker-status oraz API daily/monthly, oddzielna rewizja widoku | Role sprawdzone w kodzie/fixture; nowy zalogowany E2E niezaliczony |
| 7.6 | Minimalny ekran norm, jeden status/polling i mirror w dwóch zakładkach Sheets V2 | DOM i raport sprawdzone; test wizualny przeglądarki zablokowany |

Kod źródłowy i generatory znajdują się w `backend/v2/metrics/`, eksporty w `backend/v2/workflows/`, kontrakt w `docs/v2/openapi.json`, ekran w `v2/norms.js` i `v2/attendance.js`. Generatory odtwarzają 34 eksporty. To deterministyczne grafy wdrożeniowe, nie deklaracja identyczności bajtowej z API n8n, które normalizuje wartości domyślne i układ. Manifest zawiera odczytane opublikowane wersje komponentów etapu 7; niezmienione odwołania wcześniejszych etapów zachowują poprzednią datę weryfikacji.

## Reguły ES i granicy procesu

Źródło ES udostępnia narastające liczniki dnia, nie czasy poszczególnych zadań. Pierwszy poprawny odczyt operatora ustawia baseline bez naliczenia wcześniejszej produkcji. Reset, zmiana mapowania i przerwa wymagająca nowego baseline nie tworzą ujemnych przyrostów. Duplikaty i stare odczyty nie nadpisują nowszego checkpointu.

Przyrost zostaje nieodwracalnie zakwalifikowany podczas odczytu według obecności OPEN i procesu w Data Tables. Powody: MATCH_PROCESS, BOUNDARY_PAK_PICK, NO_APP, NO_PROCESS, NON_MEASURABLE, WRONG_PROCESS. Późniejsza korekta obecności nie zamienia dawnych outside na eligible.

Odczyt graniczny korzysta z tego samego checkpointu co okresowy. Dopuszczenie obu przyrostów PAK/PICK występuje wyłącznie przy zaufanej, zamrożonej komendzie zmiany tych dwóch procesów; sam jednoczesny wzrost liczników nie jest dowodem zmiany procesu. Czas starego i nowego procesu nie nakłada się. Delty ESB są używane w podsumowaniach dopiero po COMMITTED powiązanej komendy, także gdy dotyczy ona innego operatora. Po błędzie odczytu granicznego zapisywana jest luka pokrycia i wymagany nowy baseline, zamiast zgadywania historii.

**Ograniczenie pomiaru:** kwalifikacja przy pobraniu nie dowodzi faktycznego czasu wykonania każdej sztuki. Baseline rozpoczęty w środku dnia oznacza częściowe pokrycie. Pełny test produkcyjny wymaga kolejnych rzeczywistych przyrostów oraz uzgodnionego dnia i kont; nie należy rekonstruować ich z fikcyjnych wpisów obecności.

## Normy i spójność

- PAK% = eligible_PAK / (pak_seconds / 3600 × 70) × 100.
- PICK% = eligible_PICK / (pick_seconds / 3600 × 210) × 100.
- Dzienna% = (eligible_PAK + eligible_PICK / 3) / ((pak_seconds + pick_seconds) / 3600 × 70) × 100.
- Miesiąc używa sum liczników i czasu, nigdy średniej procentów dni. 100% przez 1 h i 0% przez 3 h daje 25%.
- Zerowy czas mierzalny daje null / NO_ELIGIBLE_PROCESS_TIME. PRZERWA i procesy niemierzalne nie wchodzą do mianownika; PRZERWA nie jest czasem międzyprocesowym.

NORM_SNAPSHOTS publikuje dzień i miesiąc w jednym wersjonowanym pakiecie. STATUS_SNAPSHOTS ma osobną monotoniczną rewizję dla aktora, pracownika, daty i wybranego miesiąca. `attendance.version` pozostaje wersją komend obecności/procesów, nie jest globalną wersją norm. Nieudany odczyt lub stare odpowiedzi nie kasują ostatniej poprawnej normy. FRESH, STALE i UNAVAILABLE są jawne. Przy otwartym dniu scheduler aktualizuje czas także bez nowego przyrostu ES.

Wiele zapisów Data Tables nie jest transakcją SQL. Wspólna blokada, zamrożony plan ES, stabilne ID, weryfikacja read-back i recovery zapewniają kontrolowaną sekwencję. Nie przejmujemy cudzej blokady tylko dlatego, że minął lease. Istniejące zdarzenia ATTENDANCE_DERIVED są rozliczane po wykonaniu skutków; ALERT_DERIVED zachowuje pracę przeznaczoną dla etapu 8.

## 7.7 — potwierdzone testy

Zweryfikowana rewizja kodu: `3e0620a52a9f60ab73a1d1972d9a5601d658484b`. GitHub Actions `Stage 7 verification`, run `33987252174`, job `101363013377`: SUCCESS, 2026-09-05 19:29 UTC. Przeszły zarówno testy źródeł/eksportów, jak i publiczne API/preflight, bez logowania i zapisów biznesowych.

| Zestaw izolowanych przypadków | Liczba | Wynik |
|---|---:|---|
| ES i reguły norm | 71 | PASS |
| Obecność — regresja | 39 | PASS |
| Procesy — regresja | 41 | PASS |
| Wygenerowana usługa uprawnień | 23 | PASS |
| Normy — DOM, sieć, stare odpowiedzi i zmiana konta | 24 | PASS |
| Mirror i formuły raportu | 16 | PASS |
| Składanie widoku pracownika | 22 | PASS |
| Zapis, kontrola wersji i recovery | 19 | PASS |
| Wejście przeliczenia, granice i dzień STOP | 10 | PASS |
| Kolejkowanie i rotacja zakresów | 11 | PASS |
| **Razem numerowane przypadki** | **276** | **PASS** |

Dodatkowo PASS: hasła, sesje, regresja interfejsu obecności, składnia, kontrakt 23 endpointów, izolacja 24 schematów, odtworzenie 34 eksportów. Liczba testów nie jest miarą produkcyjnej przepustowości ani zamiennikiem E2E.

Walidacja czterech głównych workflowów n8n: attendance service 76 węzłów, ES ingest 47, summary recalculator 38, norm Drive 41 — 0 błędów; łącznie 42 ostrzeżenia świadomego executeOnce na odczytach. Nie usuwano tych zabezpieczeń dla uzyskania pustej listy ostrzeżeń.

Publiczne worker-status, norms-daily i norms-monthly bez sesji: 3 × HTTP 401 UNAUTHENTICATED, poprawny origin aplikacji i Cache-Control: no-store. Health opublikowany jako 0.7.0, stage 7. To potwierdza dostępność i odmowę dostępu bez sesji, nie zalogowaną ścieżkę sukcesu.

## Raport i końcowy stan live

Osobny raport V2: arkusz wskazany w manifeście, zakładki Normy dzienne V2 (sheetId 7) i Normy miesięczne V2 (8). Odczytano wartości, formuły i wyniki trzech osób. Pierwsze potwierdzone zapisy/read-back obejmowały executions 584218 i 584318. Wersja pakietów raportu: 2. Pola procentów są puste przy UNAVAILABLE, nie fałszywie równe 0%.

Końcowe odczyty kolejek 2026-09-05 około 19:33–19:35 UTC: ATTENDANCE_DERIVED inne niż DONE = 0, ES_DERIVED inne niż DONE = 0, NORM_DRIVE inne niż DONE = 0; RECOVERY_REQUIRED = 0; partie ES PREPARED = 0. ALERT_DERIVED nadal oczekuje na etap 8; całego outboxa nie nazywamy pustym.

Aktualna obecność: MOL004 CLOSED v36, MOL014 CLOSED v25, MOL015 CLOSED v15, Moniti i Drive SYNCED. To nowszy stan niż snapshot v31/v20/v10 z wcześniejszego podsumowania; nie został cofnięty. Końcowe odczyty i publikacja nie wykonywały nowych komend Moniti ani zmian godzin. Dwa pomocnicze workflowy etapu 7 zostały zdezaktywowane; nie usunięto audytu.

## Niewykonane i ograniczenia odbioru

1. Sobotni raport ES nie zawiera trzech testowanych operatorów. Checkpointy mają ES_OPERATOR_NOT_FOUND i brak last_good_at. Nie potwierdzono dodatniego rzeczywistego przyrostu ani zgodności wyników pełnego dnia produkcyjnego. Brak danych nie jest dowodem zerowej produkcji.
2. Nowy zalogowany test end-to-end trzech ról pozostaje niezaliczony. Wcześniejsze wywołanie uwierzytelnione zatrzymało zabezpieczenie narzędzia; nie obchodzono go innym klientem ani wytworzoną sesją. Role są potwierdzone testami izolowanego kodu, nie nowym live 200/403.
3. Próba wizualnego testu Chromium zakończyła się ERR_BLOCKED_BY_ADMINISTRATOR przed uruchomieniem scenariusza. Nie ma nowego dowodu wizualnego desktop/telefon ani zalogowanej przeglądarki. Testy DOM nie są przedstawiane jako taki dowód.
4. Wspólny historyczny Validate frontend miał nieudany test starego endpointu V1 mol-app-config (HTTP 500/CORS). Nie zmieniono V1 ani nie pominięto tego testu. Stan sprawdzeń po publikacji jest rejestrowany oddzielnie w stage-7-release.md.
5. Test docelowej liczby pracowników, rzeczywistej równoczesności HTTP, restartu całej instancji i retencja produkcyjna należą do pilota/uruchomienia. Bieżące wykonania schedulera nie są takim testem. Odnotowano pojedynczy timeout połączenia kolejki przed wykonaniem węzłów; późniejsze wykonania były poprawne, ale nie ustalono pełnej przyczyny infrastrukturalnej.

## Odbiór użytkownika

Po publikacji otwórz `/mol-worker-app/v2/`, zaloguj się standardowo i sprawdź wersję 0.7.0, widok norm dnia i miesiąca oraz jawny brak danych ES dla 2026-09-05. Odświeżenie, przełączenie daty/miesiąca i ponowne wejście na konto nie mogą powodować mieszania danych osób ani zamiany braku wyniku na 0%. Porównaj raport V2. Ten pierwszy odbiór może być wyłącznie odczytowy — nie wymaga wznowienia dnia ani zapisów Moniti.

Do pełnego potwierdzenia funkcjonalnego pozostaje uzgodniony test z realnymi przyrostami ES i trzema rolami. Nowy termin zapisów obecności wymaga nowej zgody. Etap 8 można rozpocząć dopiero po jawnej decyzji użytkownika dotyczącej odbioru etapu 7 i podanych ograniczeń.
