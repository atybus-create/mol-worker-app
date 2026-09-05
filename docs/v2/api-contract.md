# MOL App V2 — kontrakt API

Maszynowym źródłem kontraktu jest `openapi.json`. Wszystkie endpointy V2 mają prefiks `/mol-app-v2-` i nie kolidują z V1.

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

Każdy zapis przyjmuje `request_id` w JSON. Identyczny użytkownik + operacja + payload zwraca pierwotny wynik bez powtórzenia skutków. Ten sam identyfikator z innym payloadem zwraca `409 IDEMPOTENCY_CONFLICT`. Rekordy są przechowywane minimum 90 dni.

## 3. Endpointy

| Metoda i ścieżka | Rola | Cel |
|---|---|---|
| `GET /mol-app-v2-health` | publiczny | Stan środowiska V2 |
| `POST /mol-app-v2-auth-login` | publiczny | Utworzenie sesji |
| `POST /mol-app-v2-auth-logout` | zalogowany | Unieważnienie sesji |
| `GET /mol-app-v2-worker-status` | zalogowany | Jeden spójny snapshot ekranu pracownika |
| `GET /mol-app-v2-config` | zalogowany | Konfiguracja dozwolona dla roli |
| `POST /mol-app-v2-attendance-start` | WORKER+ | Rozpoczęcie dnia |
| `POST /mol-app-v2-attendance-finish` | WORKER+ | Zakończenie procesu i dnia |
| `POST /mol-app-v2-attendance-reopen` | WORKER+ | Ponowne otwarcie dnia |
| `POST /mol-app-v2-attendance-correct` | WORKER+ | Automatyczna korekta czasu |
| `POST /mol-app-v2-process-start` | WORKER+ | Start pierwszego procesu |
| `POST /mol-app-v2-process-change` | WORKER+ | Atomowa zmiana procesu |
| `POST /mol-app-v2-process-logout` | WORKER+ | Koniec procesu bez końca pracy |
| `GET /mol-app-v2-messages` | zalogowany | Stronicowana lista wiadomości |
| `POST /mol-app-v2-message-ack` | zalogowany | Potwierdzenie wiadomości |
| `GET /mol-app-v2-norms-daily` | zalogowany | Norma dzienna |
| `GET /mol-app-v2-norms-monthly` | zalogowany | Ważona norma miesięczna |
| `GET /mol-app-v2-leader-team` | LEADER/ADMIN | Bieżący stan zespołu |
| `POST /mol-app-v2-leader-message` | LEADER/ADMIN | Komunikat do zespołu/osób |
| `GET /mol-app-v2-employee-history` | LEADER/ADMIN | Stronicowana historia pracownika |
| `GET /mol-app-v2-report-attendance` | LEADER/ADMIN | Raport obecności |
| `GET /mol-app-v2-report-export` | LEADER/ADMIN | Eksport raportu |

## 4. Snapshot pracownika

Odpowiedź statusowa zawsze zawiera razem: użytkownika i rolę, obecność, aktywny proces, czasy procesowe/międzyprocesowe, normę z `freshness`, liczbę wiadomości, stan synchronizacji oraz `snapshot_version`. Częściowy błąd źródła nie usuwa ostatniej poprawnej wartości.

## 5. Korekty — polityka zatwierdzona

Pracownik może korygować własne dni do 31 dni wstecz; starszą korektę wykonuje LEADER/ADMIN. Użytkownik zaakceptował limit 31 dni.

## 6. Korekty z arkusza rozliczeniowego — zatwierdzone rozszerzenie

Arkusz Google Sheets na Drive może przekazywać zatwierdzone korekty do tej samej usługi domenowej co aplikacja. Kontrakt wewnętrzny, uprawnienia, statusy i scenariusze odbiorowe są zapisane w `drive-corrections.md`. Nie powstaje dodatkowy publiczny endpoint: adapter arkusza wywołuje wewnętrzny Command Executor. Publiczne API pozostaje bez zmian.
