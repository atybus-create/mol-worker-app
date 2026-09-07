# MOL App V2 — Etap 10: docelowy frontend

Status: GOTOWY TECHNICZNIE DO ODBIORU
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

Dodatkowo dla LEADER/ADMIN w aplikacji mobilnej:

- mobilny podgląd zespołu,
- szybki podgląd pracownika,
- bieżące wykonanie dzienne PICK i PAK obok procentu normy,
- raporty z wyborem wielu pracowników,
- kolejka korekt,
- administracja użytkownikami w zakresie dozwolonym dla roli.

WORKER nie otrzymuje panelu WWW ani menedżerskich ekranów mobilnych.

### `web/` — dodatkowy panel dla LEADER / ADMIN

Docelowy panel desktopowy dostępny obok aplikacji mobilnej.

- widok całego zespołu,
- bieżące PICK dzisiaj i PAK dzisiaj dla każdego pracownika,
- szybki podgląd pracownika z PICK / PAK / normą / obecnością,
- historia i raporty,
- raportowanie dowolnie zaznaczonej grupy pracowników,
- `Zaznacz wszystkich`, `Wyczyść`, licznik zaznaczonych i raport tylko dla wybranych,
- CSV/XLSX dokładnie dla zaznaczonych osób i zakresu dat,
- kolejka korekt,
- administracja użytkownikami zgodna z rolą,
- historia operacji.

Backend musi odrzucać WORKER niezależnie od ukrycia elementów UI.

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

## Stan końcowy Etapu 10

Zbudowano i zamrożono jako wejście do Etapu 11:

1. wspólny design system,
2. mobile shell operacyjny,
3. mobile role views LEADER/ADMIN,
4. WWW LEADER/ADMIN shell,
5. komponenty wspólne i stany,
6. kanoniczny katalog procesów i granice `BIURO`,
7. wieloosobowe raportowanie w UI,
8. dzienne PICK/PAK w podglądzie zespołu,
9. responsywne warianty mobile / tablet / desktop,
10. dedykowane CI Stage 10.

Podłączenie do zaakceptowanych endpointów backendu zaczyna się dopiero w Etapie 11.

## Ograniczenia

- nie zmieniać V1,
- nie rozszerzać zgody Moniti,
- nie włączać automatycznych alertów w Etapie 10,
- nie przepisywać zaakceptowanej logiki backendu bez konkretnej regresji,
- wszystkie akcje Stage 10 są nadal demonstracyjne i nie wykonują zapisu do backendu.
