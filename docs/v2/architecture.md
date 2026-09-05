# MOL App V2 — architektura docelowa

Status: kontrakt etapu 2, do odbioru przed rozpoczęciem implementacji etapu 3.

## 1. Zasady nadrzędne

1. V2 jest odizolowana od V1: osobne endpointy, workflowy, tabele i frontend.
2. n8n Data Tables są operacyjnym źródłem prawdy dla bieżącego stanu aplikacji.
3. Google Drive/Sheets służy jako mirror, audyt i źródło raportów oraz przyjmuje jawnie zatwierdzone korekty rozliczeniowe. Bieżący UI nadal czyta Data Tables. Kontrakt importu: `drive-corrections.md`.
4. Moniti jest opcjonalnym adapterem dla START/STOP/korekt. Wyłączenie `MONITI_ENABLED` nie wyłącza żadnej funkcji V2 poza wywołaniami Moniti.
5. ES jest źródłem zdarzeń wykonania PAK/PICK, nie czasu pracy ani wyboru procesu.
6. Stan biznesowy jest oddzielony od stanu synchronizacji i błędów technicznych.
7. Każda operacja zapisująca ma `request_id`, jest idempotentna i zostawia ślad audytowy.
8. Frontend renderuje wyłącznie potwierdzony snapshot z jednego endpointu statusowego; nie składa stanu z kilku niespójnych odpowiedzi.

## 2. Podział komponentów

### Publiczne workflowy API

- `MOL APP V2 — Health`
- `MOL APP V2 — Auth`
- `MOL APP V2 — Worker Status`
- `MOL APP V2 — Attendance`
- `MOL APP V2 — Processes`
- `MOL APP V2 — Messages`
- `MOL APP V2 — Norms`
- `MOL APP V2 — Leader`
- `MOL APP V2 — Reports`

Każdy publiczny workflow jest cienki: uwierzytelnia, waliduje kontrakt, wywołuje workflow domenowy i mapuje wynik na jednolitą odpowiedź HTTP. Nie budujemy ponownie jednego workflowu z dziesiątkami rozgałęzień `action`.

### Workflowy wewnętrzne

- `Command Executor` — idempotencja, blokada logiczna, wykonanie i commit komendy.
- `Moniti Adapter` — jedyne miejsce znające kontrakt Moniti.
- `Drive Outbox Worker` — asynchroniczny mirror z retry i dead-letter.
- `Drive Corrections Adapter` — odbiera zatwierdzoną korektę arkusza, sprawdza autora i wersję danych, przekazuje komendę do wspólnej usługi korekt i zapisuje wynik w arkuszu.
- `ES Ingest & Classify` — pobranie przyrostów i nieodwracalna klasyfikacja w chwili zapisu.
- `Summary Recalculator` — dobowe i miesięczne agregaty.
- `Alert Engine` — reguły, epizody i deduplikacja.
- `Error Handler` — log techniczny z korelacją po `request_id`.

## 3. Przepływ komendy zapisującej

1. Uwierzytelnienie sesji i sprawdzenie roli.
2. Walidacja schematu i reguł biznesowych.
3. Rejestracja lub odczyt komendy po `request_id`.
4. Założenie krótkiej blokady logicznej dla pracownika/dnia.
5. Jeśli Moniti jest włączone: wywołanie i potwierdzenie zapisu/read-back. Brak potwierdzenia zatrzymuje lokalny commit.
6. Zapis niezmiennego zdarzenia domenowego ze statusem `COMMITTING`.
7. Aktualizacja bieżącego stanu w Data Tables.
8. Oznaczenie zdarzenia i komendy jako `COMMITTED`.
9. Dodanie zadań do outboxa: Drive, podsumowania, alerty i powiadomienia.
10. Zwrot potwierdzonego snapshotu do klienta.

Jeśli Moniti potwierdzi zapis, a lokalny commit ulegnie awarii, komenda otrzymuje `RECOVERY_REQUIRED`. Automat odtwarza stan z dziennika komend; frontend nie dostaje fałszywego sukcesu.

## 4. Kolejność i spójność odczytu

`GET worker-status` wykonuje jeden spójny odczyt: sesja → obecność → aktywny proces → normy → nieprzeczytane komunikaty → alerty techniczne. Odpowiedź zawiera `snapshot_version` i `calculated_at`. Frontend przyjmuje tylko snapshot o wersji nie mniejszej od już wyświetlanej. Dzięki temu wolniejsza, starsza odpowiedź nie może wyczyścić świeżo pokazanej normy.

## 5. Źródła prawdy

| Obszar | Źródło operacyjne | Mirror / źródło zewnętrzne | Zasada |
|---|---|---|---|
| Sesje i role | Data Tables V2 | — | Backend rozstrzyga uprawnienia |
| Czas pracy | Data Tables V2 | Moniti opcjonalnie, Drive | UI nigdy nie liczy obecności z Moniti/Drive |
| Proces pracownika | Data Tables V2 | Drive | Maksymalnie jeden aktywny proces |
| Wykonanie PAK/PICK | Zdarzenia ES zapisane w V2 | ES | Klasyfikacja zamrażana przy pobraniu |
| Normy | Agregaty V2 | Drive/raport | Wyliczenia serwerowe, wersjonowane |
| Wiadomości i alerty | Data Tables V2 | Drive/audyt | Jeden epizod = jeden `dedup_key` |
| Raporty historyczne | Data Tables V2 | Drive/Sheets | Drive nie blokuje bieżącej pracy |

## 6. Zachowanie zależności

- `MONITI_ENABLED=false`: zapis lokalny działa, `moniti_sync=NOT_REQUIRED`.
- Moniti włączone i brak potwierdzenia: HTTP 502/503, brak lokalnej zmiany biznesowej.
- Drive niedostępny: operacja biznesowa kończy się sukcesem, `drive_sync=PENDING`, retry w tle.
- ES niedostępny: czas pracy i procesy działają; normy mają jawny stan `STALE` lub `UNAVAILABLE`, nie znikają.
- Błąd przeliczenia: ostatni poprawny agregat pozostaje widoczny wraz z `freshness` i błędem technicznym.

## 7. Bezpieczeństwo

- Token sesji w nagłówku `Authorization: Bearer ...`; wylogowanie unieważnia sesję po stronie backendu.
- Hasła muszą być hashowane, a logowanie ograniczone rate-limitem przed przełączeniem produkcji.
- Dane logowania, tokeny i hasła nie trafiają do logów ani odpowiedzi błędów.
- Kontrola ról jest wykonywana w backendzie dla każdej operacji, niezależnie od widoczności przycisków.

## 8. Granica etapu 2

Ten dokument zatwierdza architekturę i nie uruchamia jeszcze zapisów produkcyjnych. Utworzenie tabel i workflowów domenowych nastąpi dopiero w etapie 3 po odbiorze użytkownika.
