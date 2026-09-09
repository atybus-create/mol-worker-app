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
- Krok 3 — uporządkowanie frontendu: WYKONANY.
  - jeden build `20260909.1`,
  - wspólny klient `shared/auth.js`,
  - launcher TEST i widoczne oznaczenia środowiska,
  - usunięte historyczne pliki i komunikaty demo/preview,
  - zachowane reguły dostępu WORKER/LEADER/ADMIN.
- Krok 2 — usunięcie runtime E2E gate: WYKONANY.
  - usunięto `runReadE2E()`, `waitE2E()` i klucz `mol.v2.stage11.read-e2e`,
  - akcje czekają tylko na podstawową gotowość interfejsu,
  - awaria opcjonalnej sekcji nie blokuje podstawowych zapisów,
  - pełne testy E2E pozostają poza runtime aplikacji.

## Reguła odbioru

Scenariusz, który przeszedł i którego kod nie został później zmieniony, nie jest powtarzany. Błąd zatrzymuje wyłącznie powiązaną ścieżkę, a nie cały program testów.
