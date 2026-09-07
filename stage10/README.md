# MOL App V2 — Etap 10: docelowy frontend

Status: W TOKU
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
- stany offline / retry / wygasła sesja.

Dodatkowo dla LEADER/ADMIN w aplikacji mobilnej:

- mobilny podgląd zespołu,
- szybki podgląd pracownika,
- raporty,
- kolejka korekt,
- administracja użytkownikami w zakresie dozwolonym dla roli.

WORKER nie otrzymuje panelu WWW ani menedżerskich ekranów mobilnych.

### `web/` — dodatkowy panel dla LEADER / ADMIN

Docelowy panel desktopowy dostępny obok aplikacji mobilnej.

- widok całego zespołu,
- szybki podgląd pracownika,
- historia i raporty,
- CSV/XLSX,
- kolejka korekt,
- administracja użytkownikami zgodna z rolą,
- historia operacji.

Backend musi odrzucać WORKER niezależnie od ukrycia elementów UI.

## Wspólny design system

`shared/tokens.css` jest źródłem podstawowych wartości wizualnych obu interfejsów:

- kolorów,
- odstępów,
- promieni,
- cieni,
- typografii,
- semantycznych stanów success/warning/danger/info.

Zaakceptowany kierunek: ciemny granat/grafit, cyan/teal, wysoki kontrast, czytelne karty, interfejs przemysłowo-logistyczny.

## Kolejność implementacji

1. wspólny design system — rozpoczęty,
2. mobile shell operacyjny,
3. mobile role views LEADER/ADMIN,
4. WWW LEADER/ADMIN shell,
5. komponenty wspólne i stany,
6. podłączenie backendu Stage 9,
7. regres responsywności i dostępności,
8. przejście do Etapu 11 integracyjnego.

## Ograniczenia

- nie zmieniać V1,
- nie rozszerzać zgody Moniti,
- nie włączać automatycznych alertów w Etapie 10,
- nie przepisywać zaakceptowanej logiki backendu bez konkretnej regresji.
