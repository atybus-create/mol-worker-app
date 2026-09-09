# MOL V2 — PWA TEST RC1 BASELINE

Data zamrożenia: 2026-09-09

## Cel wydania

Dostarczyć jedną stabilną wersję testową aplikacji:
- instalowalną jako PWA na telefonie,
- dostępną w przeglądarce WWW,
- podłączoną do rzeczywistego API V2 n8n,
- gotową do ograniczonego testu odbiorczego.

## Punkt startowy

- źródło aplikacji: commit `ab364ac471a695b7aab44e5d3924b275f88c7b74`,
- stan publikacji przed RC1: commit `2bb0bc67baf90b8aee4c61aced2685998fc87805`,
- rollback publikacji: gałąź `backup/pre-pwa-test-rc1-20260909`,
- gałąź realizacyjna: `pwa-test-rc1`.

## Zamrożony zakres

Etapy 1–10, 11A oraz 11B.1–11B.3 są traktowane jako wykonana baza. Nie uruchamiamy ponownie ich pełnej regresji bez zmiany kodu dotyczącej danego obszaru albo nowego dowodu błędu.

## Katalog docelowy

Jedynym katalogiem publikacyjnym dla tego wydania będzie:

`/pwa/`

Katalogi `/stage9-preview/` i `/stage10-preview/` pozostają historycznymi podglądami i nie są źródłem kolejnego wydania.

## Zakres RC1

1. Usunięcie testów E2E blokujących normalne używanie aplikacji.
2. Ujednolicenie frontendu, nazw plików i numeru builda.
3. Dodanie manifestu, ikon oraz service workera.
4. Stabilny przepływ logowanie → START → proces → STOP.
5. Ograniczony test odbiorczy mobile i WWW.
6. Publikacja jednego spójnego builda z możliwością rollbacku.

## Poza zakresem RC1

- APK/AAB i Google Play,
- natywne powiadomienia push,
- pełny fault injection i rozszerzone testy concurrency,
- automatyzacje biznesowe niezwiązane bezpośrednio z aplikacją pracowniczą,
- ponowne wykonywanie zakończonych etapów bez przesłanki technicznej.

## Status realizacji

- Krok 1 — zamrożenie RC1: WYKONANY.
- Krok 2 — usunięcie runtime E2E gate: WYKONANY.
  - usunięto `runReadE2E()`, `waitE2E()` i klucz `mol.v2.stage11.read-e2e`,
  - akcje czekają tylko na podstawową gotowość interfejsu,
  - awaria opcjonalnej sekcji nie blokuje podstawowych zapisów,
  - pełne testy E2E pozostają poza runtime aplikacji.
- Krok 3 — uporządkowanie frontendu: WYKONANY.
  - jeden build `20260909.1`,
  - wspólny klient `shared/auth.js`,
  - launcher TEST i widoczne oznaczenia środowiska,
  - usunięte historyczne pliki i komunikaty demo/preview,
  - zachowane reguły dostępu WORKER/LEADER/ADMIN.
- Krok 4 — warstwa PWA: WYKONANY.
  - docelowy katalog `/pwa/` zawiera pełną kopię testowego frontendu build `20260909.2`,
  - dodano manifest z właściwym scope GitHub Pages, ikonami 192/512/maskable i `display: standalone`,
  - dodano service worker cache’ujący wyłącznie shell aplikacji, bez odpowiedzi API i bez kolejki zapisów offline,
  - dodano ekran offline oraz kontrolowaną aktualizację cache po decyzji użytkownika,
  - brak zmian w `main` i publicznej publikacji.
- Krok 5 — stabilizacja podstawowej ścieżki n8n: WYKONANY 2026-09-09.
  - konto testowe: `atybus` / `MOL015` / Moniti `99191`,
  - uzgodniono historyczny rekord 2026-09-08 z rzeczywistym stanem Moniti: `CLOSED`, STOP `13:33 UTC`, wersja V2 `14`,
  - zamknięto nieaktualną komendę recovery, która próbowała ustawić inny czas STOP,
  - adoptowano istniejący START Moniti 2026-09-09 do V2: `05:48 UTC`,
  - prawdziwe logowanie, sesja, status, wylogowanie i unieważnienie sesji: PASS,
  - `PROCESS_START INNE`: PASS, wersja obecności `1 → 2`,
  - powtórzenie identycznego `request_id` i payloadu: PASS, brak zmiany wersji,
  - ten sam `request_id` z innym payloadem: PASS — `409 REQUEST_ID_CONFLICT`, stan bez zmian,
  - zapis ze starą wersją: PASS — `409 VERSION_CONFLICT`, stan bez zmian,
  - `PROCESS_CHANGE INNE → MAGAZYN`: PASS, wersja `2 → 3`,
  - `PROCESS_LOGOUT`: PASS, wersja `3 → 4`, brak aktywnego procesu,
  - `ATTENDANCE_FINISH`: PASS, wersja `4 → 5`,
  - stan końcowy V2 i Moniti: `CLOSED`, START `05:48 UTC`, STOP `13:52 UTC`,
  - `moniti_sync=SYNCED`, `drive_sync=SYNCED`, `correction_required=false`,
  - wszystkie skuteczne komendy są `COMMITTED`; brak oczekującej komendy dla `MOL015`,
  - wszystkie locki, w tym `command-writer` i `metrics-writer`, są zwolnione,
  - zakres zapisów testowych 2026-09-09 pozostaje ograniczony do loginu `atybus`.

## Reguła odbioru

Scenariusz, który przeszedł i którego kod nie został później zmieniony, nie jest powtarzany. Błąd zatrzymuje wyłącznie powiązaną ścieżkę, a nie cały program testów.
