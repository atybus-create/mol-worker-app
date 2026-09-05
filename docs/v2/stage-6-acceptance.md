# Etap 6 — procesy pracownika

Wersja aplikacji: 0.6.0, poprawka UI `0.6.0-r2`, commit implementacyjny `4e33a39`. Testy 2026-09-05. Etap 7 nie został rozpoczęty.

## Zakres

- Rozpoczęcie, zmiana i zakończenie własnego procesu na kontach WORKER, LEADER i ADMIN.
- Historia procesów, aktywny proces oraz oddzielne liczniki czasu w procesach i bez procesu.
- PRZERWA jako osobny proces. Zakończenie samego procesu pozostawia obecność OPEN; STOP zamyka obecność i proces. Wznowienie dnia nie uruchamia procesu.
- Kontrola wersji, trwała komenda, wspólny writer i weryfikacja zapisanych rekordów. Zmiana zamyka stary proces i otwiera nowy w tym samym momencie.
- Przy COMMAND_BUSY frontend ponawia identyczne żądanie maksymalnie trzy razy po 2, 4 i 8 sekundach. Potem pozostawia ręczne ponowienie. Błędy uprawnień i wersji nie są ponawiane automatycznie. Wylogowanie przerywa dalsze próby.

## Potwierdzone testy

| Sprawdzenie | Wynik |
|---|---|
| Domena procesów | PASS: 25 przypadków, w tym role, granice dnia, nakładanie, Przerwa i integracja STOP |
| Regresja obecności | PASS: 39 przypadków |
| UI i sesje | PASS: double-click, offline, odtworzenie pending, identyczny request_id, ograniczenie retry, anulowanie po wylogowaniu |
| Kontrakt i izolacja backendu | PASS: 23 endpointy, 19 schematów, 22 eksporty workflowów |
| dtatarska / WORKER w przeglądarce | PASS: odtworzenie Kompletacji po odświeżeniu, logout procesu pozostawia OPEN, Przerwa + STOP zamyka oba stany |
| asorokopud / LEADER w przeglądarce | PASS: wznowienie, Pakowanie, Kompletacja, logout procesu, STOP, wylogowanie |
| atybus / ADMIN w przeglądarce | PASS: wznowienie, Magazyn, odświeżenie, Biuro, logout procesu, STOP, wylogowanie |
| Smoke test opublikowanej poprawki | PASS: dtatarska, wznowienie → Pakowanie → Przerwa → STOP; bez ręcznego retry |
| Cztery wywołania identycznego START przez MCP | PASS: identyczny wynik v14, jeden rekord procesu |
| Cztery konkurujące zmiany z expected_version=14 | PASS: jedna 200/v15, trzy 409 VERSION_CONFLICT; jeden aktywny proces |
| Przerwanie zapisu drugiego procesu | PASS z wcześniejszego testu live: RECOVERY_REQUIRED, przywrócenie węzła, retry tej samej komendy, brak duplikacji |
| Role API | LEADER odczytuje innego pracownika (200), nie uruchamia jego procesu (403) |
| Wygląd panelu procesów | Sprawdzony w wąskiej przeglądarce: czytelne liczniki, wybór, historia i wyłączony START po STOP |
| Publikacja | GitHub Validate frontend i Deploy GitHub Pages: SUCCESS dla 4e33a39 |

Testy konkurencji wysłano równolegle przez MCP; transport może szeregować obsługę. Wynik potwierdza idempotencję i odrzucenie sprzecznych wersji, nie jest pomiarem maksymalnej przepustowości produkcyjnej.

## Granice etapu

Końcowy stan: MOL004 v27, MOL014 v16, MOL015 v10 — wszystkie CLOSED, Moniti/Drive SYNCED. Bezpośrednio sprawdzono komórki `'Czas pracy V2'!A2:K4`. Kolejka ATTENDANCE_DRIVE pusta, 0 aktywnych procesów i 0 komend RECOVERY_REQUIRED. Sesje utworzone w końcowych testach zostały unieważnione, w tym sesja porzucona przy przerwaniu przeglądarki. Szczegóły: `stage-6-evidence.json`.

- Czas przy włączonym Moniti jest zapisywany z dokładnością do minuty. Proces rozpoczęty i zakończony w tej samej minucie może mieć 0 minut. Licznik sekund jest bieżącą prezentacją ostatniego stanu, nie deklaracją sekundowej dokładności zapisu.
- Po zmianach z innej karty należy odświeżyć stan. Nie ma jeszcze pełnego frontendu etapu 10.
- Etap 7 wdroży normy i wyniki. Zdarzenia ATTENDANCE_DERIVED pozostają w kolejce celowo, nie są dowodem wdrożenia norm.
- Etapy 8–9 wdrożą komunikaty, panel lidera i pełne raporty procesów. Obecny arkusz raportuje obecność i jej wersję, nie pełne szczegóły procesów.
- Obowiązuje wymaganie przycisku zatwierdzania korekty bezpośrednio w odpowiednim arkuszu Drive, bez kopiowania UUID; zapis w `drive-corrections.md`.
- Zapis Moniti ograniczony do 2026-09-05 i uzgodnionych trzech kont. Nie rozszerzono testów na inne dni ani pracowników.

## Odbiór użytkownika

1. Otwórz V2 i zaloguj się wybranym kontem testowym.
2. Wznów dzisiejszy dzień, rozpocznij Pakowanie, zmień na Kompletację i odśwież stronę. Proces i historia powinny pozostać.
3. Kliknij „Zakończ tylko proces”. Dzień ma pozostać otwarty, a czas bez procesu rosnąć.
4. Włącz Przerwę, następnie STOP pracy. Dzień i proces mają się zakończyć; START procesu ma być niedostępny.
5. Sprawdź zgodność obecności z Moniti i raportem V2 po synchronizacji.

Przejście do etapu 7 dopiero po potwierdzeniu użytkownika.
