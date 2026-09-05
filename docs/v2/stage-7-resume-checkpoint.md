# Etap 7 — punkt kontynuacji po implementacji, 2026-09-05

Etap 6 został jawnie odebrany. Etap 7 jest zaimplementowany i zweryfikowany automatycznie, ale nie został odebrany przez użytkownika. Etap 8 nie rozpoczęty. Nie wracaj do początku prac ani nie buduj ponownie istniejących modułów.

## Co już istnieje

Backend 0.7.0/stage 7, 24 schematy, 34 deterministyczne eksporty, centralny ES ingest z checkpointem i zamrożonym planem, normy dzienne i ważony miesiąc, wersjonowany worker-status, trzy publiczne endpointy status/daily/monthly, minimalny UI norm oraz działający mirror dwóch zakładek Sheets. Repo, generatory i manifest uwzględniają etap 7. Używaj `backend/v2/metrics/build-all.mjs`, nie samego generatora procesów z etapu 6.

Ostatni dokładnie zweryfikowany kod w momencie sporządzenia protokołu: `3e0620a52a9f60ab73a1d1972d9a5601d658484b`, CI `33987252174` SUCCESS. Kolejne commity dokumentacji nie zastępują tej referencji. Bieżący stan publikacji main, SHA i wyniki Pages sprawdź w `stage-7-release.md` oraz bezpośrednio w GitHub. Nie zakładaj dawnego main 63c3f6f i nie cofaj nowszych zmian. Przed finalnym scaleniem porównaj branch `codex/stage7-es-norms` z main; jeśli release.md jest już obecny, nie powtarzaj wdrożenia bez potrzeby.

## Sprawdzone

276 numerowanych przypadków izolowanych: 71 metrics, 39 attendance, 41 processes, 23 permissions, 24 norms UI, 16 mirror, 22 worker view, 19 persistence/recovery, 10 summary input, 11 scheduler. Dodatkowo auth/password/attendance UI, kontrakt, izolacja i odtwarzalność wszystkich eksportów. Cztery główne workflowy n8n: 0 błędów; ostrzeżenia executeOnce są świadome. Publiczne API: 401 bez sesji, poprawne CORS/no-store. Nie jest to test zalogowanego E2E.

Raport V2 `1fvAKvxe0_OvJjzwJ-Ouii6zvTFBjHM-CLOhxjLzSYQ4`: Normy dzienne V2 (7), Normy miesięczne V2 (8). Potwierdzone realne zapisy i read-back, bezpośrednio sprawdzone komórki trzech kont. NORM_DRIVE nie ma zaległych zadań w końcowym odczycie. Nie buduj tego adaptera ponownie.

## Stan operacyjny i ograniczenia

Odczyt około 19:33–19:35 UTC: MOL004 CLOSED v36, MOL014 CLOSED v25, MOL015 CLOSED v15; Moniti/Drive SYNCED. Nie wracaj do wersji v31/v20/v10 z wcześniejszego podsumowania. Kolejki ATTENDANCE_DERIVED, ES_DERIVED i NORM_DRIVE: 0 niedokończonych; komendy RECOVERY_REQUIRED i partie ES PREPARED: 0. ALERT_DERIVED czeka na etap 8 i nie wolno masowo oznaczyć go DONE bez wykonania skutków.

Dwa pomocnicze workflowy wyłączono: 5QQkZWLqVDzx5it5 i vqpQl7orcv75JNC5. Nie reaktywuj publicznych testów ani nie odczytuj sekretów credentiali. Końcowa kontrola i publikacja nie wykonywały nowych zapisów Moniti. Nie rozszerzaj zgody testowej na kolejne daty lub osoby; nie zmieniaj V1.

ES zwraca raport, ale brak trzech testowanych operatorów oznacza ES_OPERATOR_NOT_FOUND / UNAVAILABLE, a nie zerową produkcję. Brak pozytywnego testu rzeczywistych przyrostów. Nowy zalogowany test API i wizualny test przeglądarki pozostają niezaliczone; ograniczeń narzędzi nie obchodzono. Szczegóły w `stage-7-acceptance.md` i `stage-7-evidence.json`.

Następny krok po opublikowaniu: odbiór odczytowego UI przez użytkownika oraz uzgodnienie brakującego testu z rzeczywistymi przyrostami ES i rolami. Stage 7 nie staje się odebrany tylko dlatego, że działa CI lub health. Przejście do etapu 8 wymaga jawnej decyzji użytkownika.
