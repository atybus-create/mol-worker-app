# MOL App V2 — Etap 10 — rozdzielenie raportów

Data: 2026-09-07
Status: wymaganie włączone do Etapu 10

## Powód

Podczas rozbudowy raportowania norm ekran raportowy zaczął pełnić przede wszystkim rolę raportu wydajności. Nie zastępuje to zaakceptowanego wcześniej raportu obecności/czasu pracy z Etapu 9.

Raport czasu pracy i raport wydajności są od tej zmiany dwoma osobnymi ekranami.

## Raport: Czas pracy

Dostęp: LEADER / ADMIN w panelu WWW.

Zakres UI:
- wybór jednego, kilku albo wszystkich pracowników,
- `Zaznacz wszystkich` / `Wyczyść`,
- zakres dat `od` / `do`,
- osobny przycisk generowania,
- eksport CSV / XLSX,
- podsumowanie liczby wybranych pracowników, dni z pracą, łącznego czasu i średniego czasu na dzień,
- tabela: data, pracownik, stan dnia, START, STOP, czas pracy.

Ten ekran nie pokazuje PICK, PAK ani procentów normy.

Źródło backendowe do podłączenia w Etapie 11 pozostaje zaakceptowanym kontraktem Etapu 9:
- `GET /mol-app-v2-report-attendance`,
- `GET /mol-app-v2-report-export`.

## Raport: Wydajność

Osobny ekran przeznaczony dla danych produkcyjnych i norm:
- PICK,
- PAK,
- PICK/PAK w jednostkach normy,
- ilość łącznie / do normy / poza normą,
- czas,
- procent normy,
- wybór jednego, kilku lub wszystkich pracowników,
- dowolny zakres dat,
- CSV / XLSX.

Reguła przeliczenia łącznego wyniku pozostaje: `1 PAK = 1 j.n.`, `3 PICK = 1 j.n.`.

## Granica Etapu 10 / 11

Etap 10 definiuje i testuje osobne interfejsy obu raportów na danych demonstracyjnych.
Etap 11 podłącza je do rzeczywistych endpointów i rozszerza kontrakt wydajności tam, gdzie potrzebne są pola total / eligible / outside_norm.
