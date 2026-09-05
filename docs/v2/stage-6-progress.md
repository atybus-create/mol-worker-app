# Etap 6 — procesy pracownika

Status: wdrożenie backendu i frontendu testowego; odbiór techniczny NIEZAKOŃCZONY. Użytkownik zaakceptował etap 5 i wyraźnie zlecił przejście do etapu 6.

## Zrobione 2026-09-05

- PROCESS_START, PROCESS_CHANGE, PROCESS_LOGOUT przez uwierzytelnione API.
- Ten sam writer, kontrola wersji i trwały dziennik komend co obecność. Zmiana procesu zamyka poprzedni i otwiera następny z tym samym czasem. Niedokończona komenda blokuje następne zapisy i nie jest pokazywana jako sukces.
- Ponowny odczyt obu zapisanych procesów przed zakończeniem komendy. STOP obecności zamyka aktywny proces; wznowienie dnia nie uruchamia procesu.
- Słownik 10 procesów zgodny z nazwami V1; osobna tabela V2. Źródło: backend/v2/processes/catalog.json. Normy 70/210 są metadanymi, moduł wyników jeszcze nie działa.
- Frontend 0.6.0: wybór i zmiana procesu, zakończenie tylko procesu, historia, liczniki czasu procesowego i bez procesu. Wspólna obsługa pending/request_id i blokada przycisków podczas zapisu. Liczniki są ekstrapolacją ostatniego snapshotu, wymagają odświeżenia po zmianie w innej karcie.
- Przy włączonym Moniti procesy używają tej samej dokładności minuty co STOP obecności, aby natychmiastowe zakończenie dnia nie dawało czasu procesu po STOP.
- Każdy lider odczytuje dane wszystkich pracowników. Wybór procesu wykonuje osoba na własnym koncie, także lider/admin; rola nie daje nieuzgodnionego prawa sterowania cudzym procesem.

## Testy wykonane

- 25 testów domenowych PASS: uprawnienia, otwarty dzień, zmiana atomowa, brak/niedostępny proces, duplikaty, północ, Przerwa, Moniti on/off, STOP i rozliczenie czasu.
- Testy regresji obecności (39), UI, autoryzacji oraz walidacja kontraktu/backendu.
- Live WORKER: wznowienie → Pakowanie → Kompletacja → logout procesu (dzień OPEN) → Przerwa → STOP (dzień CLOSED i brak aktywnego procesu).
- Powtórzenie pierwotnego START zwróciło dawną wersję wyniku, nie zmieniając nowszego stanu.
- Live LEADER: podgląd innego pracownika 200, próba uruchomienia cudzego procesu 403.
- Live LEADER: test przerwania PROCESS_CHANGE przez chwilowe wyłączenie zapisu drugiego procesu. Stan RECOVERY_REQUIRED; przywrócono węzeł, retry tego samego request_id zakończył zapis; następnie STOP zamknął dzień i proces. Węzeł jest ponownie włączony.
- ADMIN: logowanie i odczyt stanu 200. Testy sterowania procesem admina w przeglądarce pozostają do wykonania.
- GitHub CI i Pages: sukces dla commita 89341d6.
- Sesje API utworzone do testów unieważniono. Nie kasowano historii ani zmian wykonanych równolegle przez użytkownika.

## Pozostałe sprawdzenia przed odbiorem

1. Przeglądarka: trzy role, wybór/zmiana/logout, odświeżenie podczas aktywnego procesu, STOP, zachowanie liczników i błędów.
2. Osobny test współbieżnych komend procesowych oraz potwierdzenie drenażu Drive po wszystkich testach.
3. Spójność eksportów z końcową wersją live po testach awarii; końcowy protokół odbioru.
4. Backend health nadal pokazuje wersję 0.5.0; zaktualizować przy domknięciu etapu.

Otwarcie osobnej karty przeglądarkowej do testu zostało zablokowane przez automatyczną kontrolę narzędzia, która zakwestionowała zgodę na etap 6. Blokada nie została ominięta. Wymagane ponowne potwierdzenie użytkownika dla tego testu. Etap 6 pozostaje W TRAKCIE; etap 7 nie rozpoczęty.

## Wymaganie zapamiętane

Docelowo korekta ma być zatwierdzana przyciskiem bezpośrednio w odpowiednim arkuszu Google Sheets, bez przepisywania UUID. Autoryzacja i kontrola wersji pozostają obowiązkowe. Zapisano jako wymaganie docelowego raportowania w drive-corrections.md.
