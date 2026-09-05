# Etap 3 — rdzeń backendu V2

Wykonano 2026-09-05. Status: gotowe do odbioru użytkownika.

## Co działa

- 17 osobnych tabel MOL_V2_*; nazwy i typy każdej kolumny potwierdzone odczytem MCP.
- Konfiguracja środowiska testowego: limit korekty pracownika 31 dni, strefa Europe/Warsaw, wyłączone biznesowe zapisy i integracje.
- CORE COMMAND: walidacja wejścia, SHA-256 z natywnego węzła Crypto, blokada zapisującego, rejestr intencji, idempotencja, audyt, outbox i zachowana odpowiedź.
- CORE OUTBOX: przejęcie pojedynczego zadania, wymóg COMMITTED komendy źródłowej, kontrola terminu ponowienia, retry z rosnącym odstępem, limit 8 prób i DEAD_LETTER.
- CORE ERROR HANDLER: zapis bez danych logowania, zwolnienie blokady zakończonego błędem wykonania, ponowne zakolejkowanie jego zadania outbox.
- Health 0.3.0 wykonuje rzeczywisty odczyt konfiguracji Data Tables i zwraca READY / ONLINE.

Workflowy i ich opublikowane wersje: `backend/v2/manifest.json`. Eksporty grafów: `backend/v2/workflows/`. Wyniki automatycznych kontroli: `stage-3-evidence.json`.

## Wyniki prób wykonania

| Próba | Wynik |
|---|---|
| Nowa komenda | HTTP 200, jeden wpis komendy, audytu i outboxa |
| Powtórzenie request_id i treści | Identyczna odpowiedź wraz z pierwotnym server_time; bez duplikatów |
| Ten sam request_id, inna treść | HTTP 409 IDEMPOTENCY_CONFLICT |
| Błędny request_id | HTTP 400 VALIDATION_ERROR |
| Niedozwolony kontekst próby | HTTP 403 FORBIDDEN |
| Niewdrożona operacja biznesowa | HTTP 422 OPERATION_NOT_IMPLEMENTED |
| Przerwanie po audycie | HTTP 503; ponowienie kończy pierwotną komendę, attempts=2 |
| Rzeczywisty wyjątek po audycie | Error Handler zwalnia blokadę; ponowienie kończy komendę |
| Cztery równoczesne żądania HTTP | Jeden HTTP 200, trzy HTTP 409 COMMAND_BUSY; po ponowieniu zapisany wynik |
| Błąd dostarczenia outbox | RETRY_PENDING, attempts=1 |
| Próba przed next_attempt_at | SKIPPED / NOT_DUE |
| Ponowienie po terminie | COMPLETED, attempts=2 |
| Powtórne wykonanie zakończonego zadania | SKIPPED / ALREADY_COMPLETED |
| Ósma nieudana próba | DEAD_LETTER; dalsza próba SKIPPED |
| Walidacja pięciu workflowów | 0 błędów, 0 ostrzeżeń |

Próba limitu retry została przygotowana przez ustawienie attempts=7 dla jednego wyłącznie testowego zadania; nie udajemy ośmiu kolejnych dostarczeń. Cztery żądania wysłane przez MCP okazały się wykonane kolejno, dlatego właściwy test współbieżności wykonano równoczesnymi żądaniami HTTP. Dowód zawiera wynik tej drugiej próby.

Testy wykryły ograniczenia środowiska: require('crypto') i $helpers w Code nie są dostępne. Wdrożony kod używa natywnego Crypto, a usunięta pomocnicza próba HTTP nie występuje w eksporcie. Rejestr błędów zachowuje ślady początkowej awarii i celowego wyjątku testowego.

## Granice odbioru

To działający fundament infrastruktury, testowany techniczną komendą CORE_PROBE i syntetycznym pracownikiem V2_TEST. Handlery logowania, obecności i procesów są przedmiotem etapów 4–6. Adaptery Moniti, Drive/Sheets i ES nie są jeszcze podłączone; test outboxa nie stanowi testu wysyłki do tych systemów. Limit 31 dni jest zapisany w konfiguracji, a jego egzekwowanie będzie testowane wraz z korektami.

Obecnie jest jeden globalny writer dla krótkich komend. Dołączenie handlerów biznesowych wymaga uwierzytelnienia i sprawdzenia uprawnień, egzekwowania WRITES_ENABLED, bezpiecznego commitowania stanu domeny oraz pomiaru czasu obsługi. Nie wolno podłączać publicznego webhooka bezpośrednio do wewnętrznego CORE COMMAND. Operacje synchronizacji muszą korzystać z właściwych adapterów i potwierdzeń, zanim otrzymają status COMPLETED.

Nie ma transakcji obejmującej wiele tabel ani automatycznego przejęcia porzuconej blokady po restarcie całej instancji. W takim przypadku należy sprawdzić execution_id właściciela, potwierdzić zakończenie wykonania, zwolnić wyłącznie jego blokadę i ponowić pierwotne request_id. Zwykły wyjątek workflow obsługuje Error Handler. Procesy okresowego odbierania outboxa zostaną podłączone razem z rzeczywistymi adapterami.

Po testach STAGE 3 TEST HARNESS został zdezaktywowany. Testowe komendy i audyty pozostają jako dowód; nie modyfikowano czasu pracy żadnego pracownika. V1 pozostaje bez zmian.

## Odbiór użytkownika

1. Otwórz https://atybus-create.github.io/mol-worker-app/v2/ i odśwież stronę.
2. Sprawdź Backend ONLINE, wersję 0.3.0 i Bazę V2 ONLINE.
3. Sprawdź, że Zapisy pracowników mają status WYŁĄCZONE.
4. Kliknij Sprawdź ponownie — wynik powinien pozostać poprawny.
5. Potwierdź odbiór etapu 3, aby rozpocząć etap 4: logowanie i sesje.

## Kontrole lokalne

`node scripts/validate-v2-contract.js`

`node scripts/validate-v2-backend.js`

Przeanalizowana implementacja warunkowego UPDATE: https://github.com/n8n-io/n8n/blob/master/packages/cli/src/modules/data-table/data-table-rows.repository.ts . Wniosek o zachowaniu bieżącej instancji potwierdzono także testem rzeczywistych równoczesnych żądań; nie opiera się wyłącznie na wersji master.
