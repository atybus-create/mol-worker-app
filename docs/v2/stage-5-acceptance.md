# Etap 5 — czas pracy: protokół techniczny

Status: wdrożony do środowiska odbiorowego V2; oczekuje na odbiór użytkownika. Data testów: 2026-09-05. Etap 6 nie został rozpoczęty.

## Wdrożony zakres

- START, STOP, wznowienie dnia i korekta z powodem oraz kontrolą wersji.
- Rzeczywisty zapis Moniti i ponowny odczyt przed potwierdzeniem lokalnej zmiany.
- Trwała komenda, idempotencja, blokada równoczesnych zapisów, odtwarzanie niedokończonych komend.
- Raport Drive w tle z ponowieniami; awaria raportu nie cofa prawidłowego czasu pracy.
- Zatwierdzane przez sesję lidera/admina propozycje z zakładki Korekty. Sam wpis w arkuszu niczego nie zmienia.
- Powiadomienia o korektach i wznowieniach widoczne dla zarządzających; każdy lider obejmuje wszystkich pracowników.
- Ekran czasu pracy dla trzech ról, blokada podwójnego kliknięcia, zachowanie request_id po awarii/odświeżeniu, brak starych odpowiedzi po wylogowaniu.

## Wyniki

39 testów reguł domenowych PASS. Testy UI, sesji, haseł, kontraktu i izolacji backendu PASS. Kontrola składni wszystkich węzłów Code PASS. Walidatory n8n głównych nowych workflowów: 0 błędów; ostrzeżenia executeOnce są świadome i chronią przed wielokrotnym odczytem tabel.

Wykonano rzeczywiste START/STOP na trzech uzgodnionych kontach, wznowienie i korekty oraz korektę Drive zatwierdzoną przez lidera. Przeglądarka: dtatarska — wznowienie/odświeżenie/STOP/korekta; asorokopud — powiadomienia i ponowne zatwierdzenie; atybus — rola i stan czasu pracy. WORKER nie odczytał cudzego dnia i nie zatwierdził korekty Drive.

Próba awarii Moniti: 503 i brak zmiany lokalnych godzin, potem poprawny retry. Próba awarii Drive: lokalny commit zachowany, raport odtworzony po ponowieniu. Próba utraty końcowego znacznika komendy: odtworzenie bez duplikatu. Cztery równoczesne żądania: jeden commit i trzy COMMAND_BUSY. Podmieniony hash propozycji oraz publiczne pola recovery odrzucone.

Końcowo: 15/15 zadań ATTENDANCE_DRIVE = DONE, rejestr korekty = SYNCED, trzy testowe dni CLOSED. Ponowny odczyt Moniti zgadza się z Data Tables i arkuszem. Szczegóły bez sekretów: stage-5-evidence.json.

## Znalezione i poprawione

Moniti przechowuje minuty, nie sekundy. Pierwszy test wykrył rozbieżność i prawidłowo zatrzymał commit; zamrożony testowy zamiar uzgodniono jednorazowo z rzeczywistym wpisem, a dalsze zapisy normalizują minuty. Odczyty Data Tables otrzymały executeOnce po wykryciu powielonych wejść w recovery. Poprawiono polskie separatory formuł, format całych kolumn dat/godzin, zachowanie komunikatu błędu i czyszczenie formularza przy zmianie konta.

Jedno wylogowanie w przeglądarce otrzymało chwilowe COMMAND_BUSY; ponowienie tym samym request_id unieważniło sesję. UI nie udawał udanego wylogowania. Jest to jawne zachowanie przy współbieżności, nie błąd utraty danych.

## Granice tego odbioru

- Moniti dopuszcza testowe zapisy tylko dla trzech uzgodnionych kont i dnia 2026-09-05. Po tym dniu zapis zostanie zablokowany; rozszerzenie zakresu wymaga zgody.
- Nie zmieniono kodu V1 ani jej bazy i raportu. Moniti jest wspólne — pozostają trzy uzgodnione wpisy testowe, nie zostały usunięte.
- Limit 31 dni, DST, wyłączone Moniti i zamykanie aktywnego procesu przetestowano w logice domenowej, bez ingerowania w historyczne realne wpisy. Procesy, normy, pełny panel lidera i wysyłka komunikatów pozostają etapami 6–9.
- ATTENDANCE_DERIVED pozostaje w kolejce dla późniejszych modułów. Nie jest to zakończone przeliczenie norm miesięcznych.
- Ochrona ręcznych zmian raportu jest zaimplementowana, lecz nie była osobnym testem live. Należy edytować zakładkę Korekty, nie potwierdzone dane raportu.
- Dane, formuły i formaty arkusza sprawdzono przez API. Natywny podgląd Google wymaga logowania Google, którego nie wykonywano. Ekran aplikacji sprawdzono w przeglądarce.
- Raport ma limit 999 wierszy danych na tab; dalsza pojemność/paginacja należy do produkcyjnego raportowania.

## Odbiór użytkownika

1. Otwórz [V2](https://atybus-create.github.io/mol-worker-app/v2/), zaloguj się i sprawdź dzień 2026-09-05.
2. Porównaj godziny z [raportem testowym](https://docs.google.com/spreadsheets/d/1fvAKvxe0_OvJjzwJ-Ouii6zvTFBjHM-CLOhxjLzSYQ4/edit) i Moniti.
3. W uzgodnionym dniu wznowienie → odświeżenie → STOP → korekta z powodem. Drive potwierdza wynik w tle, zwykle do minuty.
4. Na koncie lidera sprawdź powiadomienia i podgląd propozycji Drive. Nowa korekta wymaga nowego UUID i aktualnej wersji z raportu. Zatwierdzona propozycja nie służy do edytowania kolejnej zmiany.
5. Potwierdź odbiór etapu 5 albo wskaż konkretną rozbieżność. Dopiero potem etap 6.

