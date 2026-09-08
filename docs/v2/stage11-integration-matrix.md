# MOL V2 — Stage 11B integration matrix

Źródłem prawdy dla runtime jest backend n8n V2. Frontend nie może używać danych demonstracyjnych ani lokalnie wyliczać reguł domenowych.

## Mobile

| UI / akcja | Endpoint / źródło |
|---|---|
| Logowanie | POST `mol-app-v2-auth-login` |
| Sesja / rola | GET `mol-app-v2-auth-session` |
| Status dnia, START, STOP, aktywny proces, czas bez procesu | GET `mol-app-v2-worker-status` |
| Norma dzienna | GET `mol-app-v2-norms-daily` |
| Norma miesięczna | GET `mol-app-v2-norms-monthly` |
| Komunikaty pracownika | GET `mol-app-v2-messages` |
| Pokazanie komunikatu | POST `mol-app-v2-message-shown` |
| ACK komunikatu | POST `mol-app-v2-message-ack` |
| START pracy | POST `mol-app-v2-attendance-start` |
| STOP pracy | POST `mol-app-v2-attendance-finish` |
| Cofnij STOP | POST `mol-app-v2-attendance-reopen` |
| Korekta własnego czasu | POST `mol-app-v2-attendance-correct` |
| Start procesu | POST `mol-app-v2-process-start` |
| Zmiana procesu | POST `mol-app-v2-process-change` |
| Wyloguj z procesu | POST `mol-app-v2-process-logout` |
| Zespół LEADER/ADMIN | GET `mol-app-v2-leader-team` |
| Raport wydajności | GET `mol-app-v2-report-performance` |
| Eksport raportu | GET `mol-app-v2-report-export` |
| Odbiorcy komunikatów | GET `mol-app-v2-leader-message-recipients` |
| Wyślij komunikat | POST `mol-app-v2-message-send` |
| Kolejka korekt | GET `mol-app-v2-corrections-queue` |
| Akceptacja korekty | POST `mol-app-v2-attendance-correct` z dokładną propozycją i `expected_version` z kolejki |
| Odrzucenie korekty | POST `mol-app-v2-correction-reject` |
| Lista użytkowników | GET `mol-app-v2-user-list` |
| Utwórz użytkownika | POST `mol-app-v2-user-create` |
| Aktywuj/dezaktywuj | POST `mol-app-v2-user-active` |
| Reset hasła | POST `mol-app-v2-user-password-reset` |
| Wylogowanie | POST `mol-app-v2-auth-logout` |

## WWW LEADER/ADMIN

| UI / akcja | Endpoint / źródło |
|---|---|
| Zespół | GET `mol-app-v2-leader-team` |
| Szczegóły pracownika | GET `mol-app-v2-employee-history` |
| Czas pracy | GET `mol-app-v2-report-attendance` |
| Wydajność | GET `mol-app-v2-report-performance` |
| Eksport CSV/XLSX | GET `mol-app-v2-report-export` |
| Korekty | GET `mol-app-v2-corrections-queue` + POST korekty/odrzucenia |
| Użytkownicy | GET `mol-app-v2-user-list` + POST create/active/password-reset |
| Komunikaty | GET recipients + POST send |
| Audyt | GET `mol-app-v2-audit-history` |

## Reguły integracji

- Frontend nie zawiera fikcyjnych użytkowników ani przykładowych norm/czasów.
- Frontend nie liczy średniej z procentów norm. Agregaty grupowe pochodzą z backendu.
- Każdy zapis generuje `request_id` i używa `expected_version`, gdy kontrakt go wymaga.
- Po zapisie czasu/procesu/korekty UI przeładowuje stan z backendu zamiast utrzymywać optymistyczny stan lokalny.
- Zapisy są odblokowywane dopiero po PASS authenticated E2E odczytów.
- WORKER nie ma WWW; BIURO nie jest dostępne dla WORKER.
- Automatyczne alerty pozostają OFF/HOLD.
- V1 pozostaje nietknięte.
