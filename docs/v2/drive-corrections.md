# Zatwierdzane korekty czasu z Google Sheets

Status: rozszerzenie etapu 2 zaakceptowane przez użytkownika. Jest to kontrakt do implementacji, nie działająca jeszcze integracja.

## Obsługa arkusza

Arkusz rozliczeniowy zawiera kolumny: Pracownik, Dzień pracy, Obecny START, Obecny STOP, Skorygowany START, Skorygowany STOP, Powód, Zatwierdź korektę, Status, Szczegóły błędu i Czas synchronizacji. Identyfikator wiersza i wersja obecności są polami systemowymi. Sortowanie wierszy nie zmienia tożsamości korekty.

LEADER/ADMIN wpisuje nowe godziny i powód, a następnie używa uwierzytelnionej akcji „Zatwierdź korektę”. Sama edycja komórki ani wpisanie nazwiska w kolumnie autora nie stanowią zatwierdzenia. Adapter ustala tożsamość zatwierdzającego z uwierzytelnionego kontekstu, mapuje ją na pracownika V2 i sprawdza uprawnienia do danego pracownika. Brak wiarygodnej tożsamości zatrzymuje import. Dostęp do edycji pliku nie zastępuje roli w aplikacji.

Puste pole skorygowanej godziny oznacza „pozostaw bez zmian”. Co najmniej jedna godzina musi być podana. Korekta nie usuwa START/STOP; ponowne otwarcie dnia wymaga operacji REOPEN. Godziny są interpretowane w Europe/Warsaw i zapisywane jako jednoznaczne znaczniki czasu z offsetem; niejednoznaczne godziny przy zmianie czasu wymagają doprecyzowania przed zatwierdzeniem.

## Przetwarzanie

1. Zatwierdzenie zamraża treść korekty, autora, czas i wersję bazowego dnia. Powstaje stabilny correction_id i request_id.
2. Backend sprawdza rolę, zakres zespołu, datę, kolejność godzin, istniejące procesy i expected_version. Nie nadpisuje nowszej zmiany z aplikacji: konflikt wymaga odświeżenia i ponownego zatwierdzenia.
3. Przy MONITI_ENABLED=true wspólny adapter zapisuje korektę w Moniti i potwierdza ją przez read-back. Brak potwierdzenia zatrzymuje commit w Data Tables. Przy false etap ten otrzymuje NOT_REQUIRED.
4. Wspólna usługa korekt zapisuje stan w Data Tables i audyt: przed/po, pracownik, autor, powód, źródło DRIVE_SHEET, identyfikatory komendy i arkusza.
5. Przelicza właściwe podsumowania dnia/miesiąca, aktualizuje wersję snapshotu aplikacji i kolejkuje odświeżenie raportu na Drive. Historyczna klasyfikacja przyrostów ES nie jest zmieniana automatycznie.
6. Outbox zapisuje wynik do arkusza. Pełne zakończenie jest widoczne dopiero po potwierdzeniu wszystkich wymaganych zapisów.

## Kontrakt wewnętrznej komendy

Wymagane pola: request_id (UUID), correction_id, employee_id, work_date, expected_version, reason, source=DRIVE_SHEET, spreadsheet_id, sheet_id, row_id oraz co najmniej jedno z start_at/stop_at. Pola approved_by i approved_at nadaje zaufany adapter po sprawdzeniu tożsamości; nie są przyjmowane na wiarę z komórek. Hash obejmuje zamrożoną treść i wersję źródłową. Wszystkie pola czasu przekazane do usługi mają format ISO 8601 z offsetem.

Wynik: request_id, correction_id, status, attendance_version, moniti_sync, drive_sync, error_code i updated_at. Identyczna komenda zwraca poprzedni wynik. Zmieniony payload z tym samym request_id daje IDEMPOTENCY_CONFLICT. Nowa świadoma korekta wymaga nowego zatwierdzenia i identyfikatora.

## Statusy i odporność

| Status | Znaczenie |
|---|---|
| PENDING | Zatwierdzona korekta oczekuje na przetworzenie |
| PROCESSING | Trwa walidacja lub zapis |
| CONFLICT | Wersja dnia zmieniła się; wymagany ponowny przegląd i zatwierdzenie |
| REJECTED | Błędne godziny, brak uprawnień lub naruszenie reguły biznesowej |
| RETRY_PENDING | Błąd przejściowy; ponowienie tej samej komendy |
| RECOVERY_REQUIRED | Moniti potwierdziło, ale lokalny commit nie został zakończony; wymagane odtworzenie |
| APPLIED_REPORT_PENDING | Data Tables zapisane, Moniti potwierdzone lub wyłączone; raport oczekuje na aktualizację |
| SYNCED | Data Tables i raport zapisane, Moniti potwierdzone lub NOT_REQUIRED |

Zapisy automatu do raportu nie tworzą nowych korekt. Adapter przetwarza wyłącznie jawne zatwierdzenia i deduplikuje je po correction_id/request_id. Edycja propozycji po zatwierdzeniu nie zmienia komendy w toku. Aktualizacja raportu chroni nowe robocze propozycje w kolumnach korekty. Niepowodzenie zapisu statusu do Drive pozostaje w outboxie; stan komendy w Data Tables pozwala odtworzyć wynik.

## Scenariusze odbiorowe implementacji

1. Korekta zamkniętego dnia aktualizuje Moniti, Data Tables, aplikację i raport; audyt pokazuje przed/po i autora.
2. Korekta starsza niż 31 dni działa dla uprawnionego LEADER/ADMIN; WORKER jest odrzucany.
3. Ponowne zatwierdzenie/dostarczenie tej samej komendy nie duplikuje zapisów.
4. Równoczesna korekta w aplikacji powoduje CONFLICT zamiast nadpisania nowszej wersji.
5. Awaria Moniti zatrzymuje lokalną zmianę; awaria Drive po commicie daje APPLIED_REPORT_PENDING i skuteczny retry.
6. Przy wyłączonym Moniti aktualizują się Data Tables i raport z moniti_sync=NOT_REQUIRED.
7. Niedozwolony autor, brak wiarygodnej tożsamości i błędne godziny nie powodują zapisów biznesowych.
8. Sortowanie arkusza, edycja propozycji w toku oraz automatyczny zapis raportu nie tworzą pomyłek ani pętli synchronizacji.
