# MOL App V2 — Etap 10: docelowy frontend

Status: W TOKU
Start: 2026-09-07

## Zasada

Frontend z katalogu `v2/` pozostaje środowiskiem testowym użytym do odbioru backendu i funkcji Etapu 9.

Docelowy produkt powstaje od nowa w `stage10/` na bazie zaakceptowanego backendu i zaakceptowanych wizualizacji.

## Dwa interfejsy

### `mobile/` — WORKER

Docelowa aplikacja mobilna pracownika magazynu.

- logowanie,
- START / STOP pracy,
- wybór i zmiana procesu,
- bieżąca norma i czas bez procesu,
- komunikaty,
- historia,
- korekta własnego czasu,
- profil i sesja,
- stany offline / retry / wygasła sesja.

WORKER nie otrzymuje panelu WWW.

### `web/` — LEADER / ADMIN

Docelowy panel desktopowy.

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
2. mobile WORKER shell,
3. WWW LEADER/ADMIN shell,
4. komponenty wspólne i stany,
5. podłączenie backendu Stage 9,
6. regres responsywności i dostępności,
7. przejście do Etapu 11 integracyjnego.

## Ograniczenia

- nie zmieniać V1,
- nie rozszerzać zgody Moniti,
- nie włączać automatycznych alertów w Etapie 10,
- nie przepisywać zaakceptowanej logiki backendu bez konkretnej regresji.
