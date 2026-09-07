# MOL App V2 — Etap 10: docelowy frontend

Status: GOTOWY TECHNICZNIE DO ODBIORU — po rozszerzeniu norm PICK/PAK
Start: 2026-09-07

## Zasada

Frontend z katalogu `v2/` pozostaje środowiskiem testowym użytym do odbioru backendu i funkcji Etapu 9.

Docelowy produkt powstaje od nowa w `stage10/` na bazie zaakceptowanego backendu i zaakceptowanych wizualizacji.

## Dwa interfejsy

### `mobile/` — aplikacja mobilna dla wszystkich ról

Telefon jest podstawowym interfejsem pracy operacyjnej.

WORKER korzysta wyłącznie z aplikacji mobilnej. LEADER i ADMIN również mogą korzystać z aplikacji mobilnej, ale na podstawie swojej roli otrzymują dodatkowe widoki i funkcje menedżerskie zgodne z zaakceptowanymi wizualizacjami.

Zakres wspólny operacyjny:

- logowanie,
- START / STOP pracy,
- wybór i zmiana procesu,
- bieżąca norma i czas bez procesu,
- komunikaty,
- historia,
- korekta własnego czasu,
- profil i sesja,
- stany offline / retry / wygasła sesja / forbidden / empty.

Każdy WORKER musi widzieć własne rozliczenie normy w dwóch okresach:

1. **dzisiaj**,
2. **od pierwszego dnia bieżącego miesiąca kalendarzowego do dziś**.

W obu okresach obowiązuje identyczne rozbicie dla `PAK`, `PICK` i `PICK/PAK`:

- **Ilość łącznie** — cała produkcja z danego procesu/okresu,
- **Ilość do normy** — produkcja zakwalifikowana przez backend do naliczania normy,
- **Ilość poza normą** — produkcja zachowana w wyniku, ale niekwalifikowana do normy,
- **Czas**,
- **Procent normy**.

Frontend nie może ukrywać produkcji poza normą ani prezentować samego `eligible` jako całkowitego wykonania.

Dodatkowo dla LEADER/ADMIN w aplikacji mobilnej:

- mobilny podgląd zespołu,
- szybki podgląd pracownika,
- bieżące wykonanie dzienne PICK, PAK i PICK/PAK z rozbiciem łącznie / do normy / poza normą,
- raporty z wyborem jednego, wielu lub wszystkich pracowników,
- zakres dat `od` / `do`,
- raport PICK / PAK / PICK-PAK w układzie: ilość łącznie / do normy / poza normą / czas / procent,
- kolejka korekt,
- administracja użytkownikami w zakresie dozwolonym dla roli.

WORKER nie otrzymuje panelu WWW ani menedżerskich ekranów mobilnych.

### `web/` — dodatkowy panel dla LEADER / ADMIN

Docelowy panel desktopowy dostępny obok aplikacji mobilnej.

- widok całego zespołu,
- bieżące PICK, PAK i PICK/PAK dla każdego pracownika z trzema jawnie opisanymi ilościami: łącznie / do normy / poza normą,
- szybki podgląd pracownika z pełnym rozliczeniem dziennym i od początku bieżącego miesiąca,
- w każdym okresie: PICK, PAK i PICK/PAK jako ilość łączna / ilość do normy / ilość poza normą / czas / procent normy,
- historia i raporty,
- raportowanie jednego, wielu lub wszystkich pracowników,
- `Zaznacz wszystkich`, `Wyczyść`, licznik zaznaczonych i raport tylko dla wybranych,
- dowolny zakres dat `od` / `do`,
- CSV/XLSX dokładnie dla zaznaczonych osób i zakresu dat,
- kolejka korekt,
- administracja użytkownikami zgodna z rolą,
- historia operacji.

Backend musi odrzucać WORKER niezależnie od ukrycia elementów UI.

## Źródło semantyki norm

Stage 7 rozróżnia produkcję kwalifikowaną do normy od produkcji poza normą. Przykładowo realne `MATCH_PROCESS` zostało zaliczone do `eligible_pak`, natomiast wcześniejsza produkcja `NO_APP` pozostała poza normą i nie była przepisywana wstecz.

W Etapie 11 frontend nie może samodzielnie zgadywać kwalifikacji. Publiczny kontrakt API należy rozszerzyć tak, aby dla PICK i PAK zwracał wartości potrzebne do prezentacji:

- total,
- eligible,
- outside_norm,
- seconds,
- percent,

oraz analogiczny wynik łączny PICK/PAK. Agregacje dzienne, miesięczne i za dowolny okres mają pochodzić z backendu/snapshotów, nie z prowizorycznych obliczeń po stronie przeglądarki.

## Katalog procesów

Źródło UI: `shared/processes.js`, odwzorowujące zaakceptowany katalog backendu.

Aktywne procesy:

1. `PAKOWANIE` — Pakowanie,
2. `KOMPLETACJA` — Kompletacja,
3. `DYZUR` — Dyżur,
4. `ZWROTY` — Zwroty,
5. `BIURO` — Biuro,
6. `PORZADKI_KARTONY` — Porządki – kartony,
7. `PRZYGOTOWANIE_STANOWISKA` — Przygotowanie stanowiska,
8. `MAGAZYN` — Magazyn,
9. `PRZERWA` — Przerwa,
10. `INNE` — Inne.

Uprawnienia:

- WORKER: wszystkie powyższe poza `BIURO`,
- LEADER: wszystkie 10,
- ADMIN: wszystkie 10.

Fikcyjne `SORTOWANIE` nie występuje w finalnym frontendzie.

## Wspólny design system

`shared/tokens.css` jest źródłem podstawowych wartości wizualnych obu interfejsów:

- kolorów,
- odstępów,
- promieni,
- cieni,
- typografii,
- semantycznych stanów success/warning/danger/info.

Zaakceptowany kierunek: ciemny granat/grafit, cyan/teal, wysoki kontrast, czytelne karty, interfejs przemysłowo-logistyczny.

## Stan Etapu 10

Zbudowano:

1. wspólny design system,
2. mobile shell operacyjny,
3. mobile role views LEADER/ADMIN,
4. WWW LEADER/ADMIN shell,
5. komponenty wspólne i stany,
6. kanoniczny katalog procesów i granice `BIURO`,
7. wieloosobowe raportowanie w UI,
8. dzienne PICK/PAK/PICK-PAK w podglądzie zespołu,
9. rozliczenie WORKER dzisiaj + bieżący miesiąc,
10. rozdzielenie ilości na `łącznie`, `do normy`, `poza normą`,
11. analogiczne rozliczenie w panelu lidera i raporcie okresowym,
12. responsywne warianty mobile / tablet / desktop,
13. dedykowane CI Stage 10.

Ostatnie rozszerzenie ilości przeszło dedykowane CI Stage 10 (`34124929440`) oraz pełny regres frontendu/V2 (`34124929502`) z wynikiem PASS.

Podłączenie do zaakceptowanych endpointów backendu zaczyna się dopiero w Etapie 11. Etap 10 pozostaje nieodebrany do czasu obejrzenia odświeżonego preview przez użytkownika.

## Ograniczenia

- nie zmieniać V1,
- nie rozszerzać zgody Moniti,
- nie włączać automatycznych alertów w Etapie 10,
- nie przepisywać zaakceptowanej logiki backendu bez konkretnej regresji,
- wszystkie akcje Stage 10 są nadal demonstracyjne i nie wykonują zapisu do backendu.
