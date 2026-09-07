# MOL App V2 — kontrakt API

Bazowy kontrakt maszynowy pozostaje w `openapi.json`. Rozszerzenia wdrożone po odbiorze Etapu 10 są dodatkowo przypięte w `openapi-stage11-addendum.json` oraz `backend/v2/stage11-live-contract.json`. Do czasu scalenia specyfikacji przed Release Candidate skuteczny kontrakt to suma tych trzech plików. Wszystkie endpointy V2 mają prefiks `/mol-app-v2-` i nie kolidują z V1.

## 1. Format odpowiedzi

Sukces:

```json
{
  "ok": true,
  "request_id": "7eedbcf1-19e0-4c90-828b-509286fe18df",
  "data": {},
  "meta": { "api_version": "2.0", "server_time": "2026-09-05T12:00:00Z" }
}
```

Błąd:

```json
{
  "ok": false,
  "request_id": "7eedbcf1-19e0-4c90-828b-509286fe18df",
  "error": {
    "code": "ATTENDANCE_ALREADY_CLOSED",
    "message": "Dzień pracy jest już zakończony.",
    "retryable": false,
    "details": {}
  },
  "meta": { "api_version": "2.0", "server_time": "2026-09-05T12:00:00Z" }
}
```

HTTP: `400` walidacja, `401` sesja, `403` rola, `404` zasób, `409` konflikt stanu/idempotencji, `422` reguła biznesowa, `429` limit logowania, `502` odrzucenie/brak potwierdzenia Moniti, `503` zależność niedostępna.

## 2. Idempotencja

Każdy zapis przyjmuje `request_id` w JSON. Identyczny użytkownik + operacja + payload zwraca pierwotny wynik bez powtórzenia skutków. Ten sam identyfikator z innym payloadem zwraca `409 REQUEST_ID_CONFLICT`. Retencja minimum 90 dni pozostaje wymogiem.

Odczyty raportowe, monitoring, historia i audyt nie wykonują zapisów biznesowych. `GET /mol-app-v2-auth-session` wykonuje wyłącznie techniczny heartbeat sesji przez aktualizację `SESSIONS.last_seen_at`; nie zapisuje czasu pracy ani Moniti.

## 3. Endpointy

| Metoda i ścieżka | Rola | Cel |
|---|---|---|
| `GET /mol-app-v2-health` | publiczny | Stan środowiska V2 |
| `POST /mol-app-v2-auth-login` | publiczny | Utworzenie sesji |
| `POST /mol-app-v2-auth-logout` | zalogowany | Unieważnienie sesji |
| `GET /mol-app-v2-auth-session` | zalogowany | Potwierdzenie sesji/roli + heartbeat `last_seen_at` |
| `GET /mol-app-v2-attendance-status` | WORKER+ | Stan dnia; LEADER/ADMIN także wskazany pracownik |
| `GET /mol-app-v2-worker-status` | zalogowany | Spójny snapshot pracownika z normą dzienną i miesięczną |
| `GET /mol-app-v2-config` | zalogowany | Konfiguracja dozwolona dla roli |
| `POST /mol-app-v2-attendance-start` | WORKER+ | Rozpoczęcie dnia |
| `POST /mol-app-v2-attendance-finish` | WORKER+ | Zakończenie procesu i dnia |
| `POST /mol-app-v2-attendance-reopen` | WORKER+ | Ponowne otwarcie dnia |
| `POST /mol-app-v2-attendance-correct` | WORKER+ | Korekta czasu |
| `POST /mol-app-v2-process-start` | WORKER+ | Start pierwszego procesu |
| `POST /mol-app-v2-process-change` | WORKER+ | Atomowa zmiana procesu |
| `POST /mol-app-v2-process-logout` | WORKER+ | Koniec procesu bez końca dnia |
| `GET /mol-app-v2-messages` | zalogowany | Stronicowana historia wiadomości |
| `POST /mol-app-v2-message-ack` | zalogowany | Potwierdzenie wiadomości |
| `GET /mol-app-v2-norms-daily` | zalogowany | Norma dzienna + jawne total/eligible/outside |
| `GET /mol-app-v2-norms-monthly` | zalogowany | Ważona norma miesięczna + jawne total/eligible/outside |
| `GET /mol-app-v2-leader-team` | LEADER/ADMIN | Monitoring całego zespołu: czas, proces, normy, app activity, alerty, ES |
| `POST /mol-app-v2-leader-message` | LEADER/ADMIN | Komunikat do wybranych albo wszystkich OPEN |
| `GET /mol-app-v2-employee-history` | LEADER/ADMIN | Historia pracownika + paginowany timeline |
| `GET /mol-app-v2-report-attendance` | LEADER/ADMIN | Raport czasu pracy dla 1/wielu/wszystkich |
| `GET /mol-app-v2-report-performance` | LEADER/ADMIN | Raport wydajności dla 1/wielu/wszystkich |
| `GET /mol-app-v2-report-export` | LEADER/ADMIN | CSV/XLSX dla attendance albo performance |
| `GET /mol-app-v2-audit-history` | LEADER/ADMIN | Stronicowana historia operacji bez sekretów |

## 4. Snapshot i normy

`worker-status`, `norms-daily` i `norms-monthly` wystawiają jawnie dane potrzebne frontendowi. Dla PICK i PAK dostępne są wartości źródłowe `eligible_*`, `outside_*`, czasy i procenty oraz wyliczone backendowo:

- `total_pak = eligible_pak + outside_pak`,
- `total_pick = eligible_pick + outside_pick`,
- `total_combined_units = total_pak + total_pick / 3`,
- `eligible_combined_units = eligible_pak + eligible_pick / 3`,
- `outside_combined_units = outside_pak + outside_pick / 3`,
- `combined_seconds = pak_seconds + pick_seconds`.

Frontend nie rekonstruuje kwalifikacji do normy. Źródłem są snapshoty backendu z `freshness`, `coverage`, `source_error`, `reason` i `calculated_at`.

Wzory referencyjne:

- `PAK% = SUM(eligible_PAK) / (SUM(hours_PAK) × 70) × 100`,
- `PICK% = SUM(eligible_PICK) / (SUM(hours_PICK) × 210) × 100`,
- `PICK/PAK% = (SUM(eligible_PAK) + SUM(eligible_PICK)/3) / ((SUM(hours_PAK)+SUM(hours_PICK)) × 70) × 100`.

Nigdy nie wolno uśredniać gotowych procentów pracowników lub dni.

## 5. Monitoring lidera

`GET /mol-app-v2-leader-team?work_date=YYYY-MM-DD` zwraca dla pracownika m.in.:

- obecność i aktywny proces,
- `presence_seconds`, `process_seconds`, `no_process_seconds`,
- normę dzienną i miesięczną,
- `app_activity.status`, `last_seen_at`, `session_active`,
- `active_alert_count` i `active_alerts`,
- `es_mapping.status`, `configured`, `es_worker_id`, `last_good_at`, `last_attempt_at`, `error_code`.

Status aktywności aplikacji jest oparty o `SESSIONS.last_seen_at`. Poprawne wywołanie `auth-session` aktualizuje heartbeat. ADMIN bez otwartego dnia nie jest zwykłą pozycją operacyjnego zespołu.

## 6. Historia pracownika

`GET /mol-app-v2-employee-history` przyjmuje:

- `employee_id`,
- opcjonalne `date_from`, `date_to`,
- `limit` 1–500,
- `cursor` w formacie `o:N`.

Odpowiedź łączy obecność, sesje procesów, normy, WORK_EVENTS, korekty Drive, decyzje i komunikaty. `timeline` jest sortowany malejąco i stronicowany przez `next_cursor`. Bezpośrednia korekta czasu ma event `ATTENDANCE_CORRECTED`; ponowne otwarcie dnia `WORK_REOPENED`. Dla bezpośredniej korekty historia dołącza powód z dziennika komendy.

## 7. Raport czasu pracy

`GET /mol-app-v2-report-attendance` przyjmuje `date_from`, `date_to`, opcjonalnie `employee_id` lub listę `employee_ids` rozdzieloną przecinkami oraz filtr `status` (`NOT_STARTED`, `OPEN`, `CLOSED`). Maksymalny zakres jednego żądania to 367 dni, maksymalnie 100 wskazanych pracowników.

Każdy wiersz może zawierać:

- START/STOP i stan dnia,
- czas obecności, procesów i między procesami,
- `time_by_process` i sesje procesów,
- korekty z Drive i decyzje,
- `direct_correction_events` (`ATTENDANCE_CORRECTED`, `WORK_REOPENED`),
- status synchronizacji Moniti/Drive,
- podstawowy stan/freshness normy.

## 8. Raport wydajności

`GET /mol-app-v2-report-performance` używa tego samego zakresu osób i dat. Wiersz zawiera PICK, PAK i PICK/PAK: total, eligible, outside, seconds, percent, a także freshness/coverage/source_error i czasy procesów. Podsumowanie grupy jest liczone z sum liczników i mianowników, nie ze średniej procentów.

## 9. Eksport

`GET /mol-app-v2-report-export` przyjmuje te same filtry oraz:

- `report_type=attendance|performance`,
- `format=csv|xlsx`.

Eksport korzysta z tego samego serwisu raportowego, więc zakres osób, dat i znaczenie kolumn są identyczne jak w odpowiedzi JSON.

## 10. Audyt

`GET /mol-app-v2-audit-history` przyjmuje `date_from`, `date_to`, opcjonalnie `employee_id`, `actor_id`, `event_type`, `limit` i `cursor=o:N`. Łączy WORK_EVENTS, audyt komunikacji i decyzje korekt. Filtr pracownika dla decyzji korekt jest wiązany z propozycją korekty. Rekurencyjnie usuwane są pola o nazwach wskazujących hasło, token, secret, authorization lub credential.

## 11. Korekty — polityka

Pracownik może korygować własne dni do 31 dni wstecz; starszą korektę wykonuje LEADER/ADMIN. Korekty z arkusza Drive przechodzą przez tę samą usługę domenową. Podgląd: `attendance-status?correction_id=UUID`; zatwierdzenie: `attendance-correct` z `{request_id, correction_id, approved_hash}`.

## 12. Granice bezpieczeństwa

- V1 pozostaje nietknięta.
- Odczyty lidera wymagają LEADER/ADMIN; WORKER dostaje 403/401 zależnie od etapu autoryzacji.
- Automatyczne alerty pozostają OFF/HOLD i nie są aktywowane przez ten kontrakt.
- Rozszerzenia raportów i monitoringu nie wykonują zapisów do Moniti.
