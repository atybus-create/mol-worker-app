# Etap 8 — alerty i komunikacja

Status: WDROŻONY TECHNICZNIE — DO ODBIORU UŻYTKOWNIKA.
Data technicznego domknięcia: 2026-09-06.
Wersja wydania testowego: `0.8.0`, health stage `8`.

## Wdrożony zakres

1. **Trwała komunikacja V2** w osobnych Data Tables: rekordy komunikacji oraz dziennik komend, idempotentny batch writer i recovery.
2. **MANUAL**: LEADER/ADMIN może wysłać komunikat do wybranych pracowników z otwartym dniem pracy albo do wszystkich aktualnie `OPEN`. WORKER jest odrzucany przez backend. Lista odbiorców jest zamrażana w komendzie.
3. **Historia / SHOWN / ACK**: stronicowana historia własnych wiadomości, przyrostowy odczyt zmian po rewizji, trwałe oznaczenie wyświetlenia i potwierdzenia. ACK nie rozwiązuje przyczyny alertu.
4. **NO_PROCESS**: opublikowany silnik epizodów i deduplikacji. Nie jest aktywowany bez zatwierdzonego progu i polityki ACK.
5. **ATTENDANCE_CORRECTION / REOPEN**: opublikowany silnik komunikacji do aktywnych LEADER/ADMIN po skomitowanej korekcie/wznowieniu; epizod jest rozwiązany przez sam fakt wykonanej zmiany, niezależnie od ACK.
6. **FORGOTTEN_STOP**: opublikowany silnik przypomnienia i późniejszej eskalacji. Nigdy nie zapisuje godziny STOP automatycznie. Nie jest aktywowany bez zatwierdzonej godziny, czasu eskalacji i polityki ACK.
7. **WRONG_PROCESS**, **WORK_OUTSIDE_APP**, **NO_ACTIVITY**: opublikowane silniki z dodatkową bramą `es_verified`. Przy `STALE`/braku potwierdzonego pokrycia ES `NO_ACTIVITY` zwraca stan niedostępnego źródła, a nie fałszywy alert.
8. **Spójny worker-status** zawiera `unread_messages`, `messages_available` i `communication_revision`. Zmiana komunikacji bierze udział w monotonicznym `snapshot_version`; frontend nie musi pobierać pełnej historii co 30 sekund.
9. **Frontend WWW 0.8.0**: skrzynka, historia, szczegóły, SHOWN, ACK, retry tego samego `request_id`, formularz MANUAL dla LEADER/ADMIN. Dodatkowy polling komunikacji pozostaje wyłączony przy `poll_seconds=null`; istniejący spójny worker-status sygnalizuje zmianę rewizji komunikacji.
10. **Drive mirror**: zakładka `Komunikaty V2` w testowym raporcie, aktualizacja po `message_id`, stan przyrostowy i osobna blokada. Data Tables pozostają źródłem operacyjnym.
11. **Bezpieczny cutover auto-alertów**: historyczny backlog `ALERT_DERIVED` jest objęty `history_policy=HOLD`; granica legacy została zapisana jako `alert_cutover_outbox_id=7689`, a `auto_alert_consumer_enabled=false`. Przyszły konsument nie może uruchomić się bez jawnego włączenia i jawnego watermarku; rekordy `id <= 7689` pozostają poza przyszłą konsumpcją.

## Aktywne workflowy Stage 8

- COMM RECORD WRITER: `TJiDDKw10Ue3UKWO`
- COMM BATCH SERVICE: `J3qIFff05cYGDW7C`
- COMM API RULES: `F199c1dBaCT9CDAy`
- COMM API SERVICE: `YlTLPRWmIeOnrRzz`
- COMM SEND: `eys7PhOVvCzXsgMr`
- COMM SHOWN: `cPRymemz7EC09Ox3`
- COMM ACK: `HQBhMCEhQqujQbos`
- COMM LIST: `7HfWqIshFLgpGeoW`
- COMM RECIPIENTS: `hBO6ShOy2MH3FCI4`
- NO_PROCESS: `EsCycMxoypbudrE7`
- ATTENDANCE_CORRECTION: `jv7WUWyuwngD7FFe`
- FORGOTTEN_STOP: `NHPqesBIjOwZHth4`
- WRONG_PROCESS: `XYQziIf4NkjcNKhP`
- WORK_OUTSIDE_APP: `wnkjKWWLBGefGytg`
- NO_ACTIVITY: `UjpB45UX6384rTMW`
- COMM DRIVE MIRROR: `NdRo0Umetu6SYpIk`

## Wyniki testów

- Fundament komunikacji: idempotencja, versioning, frozen plan i recovery — PASS.
- MANUAL / API / historia: 59 przypadków domenowych + 31 adapterów — PASS.
- NO_PROCESS: 47 przypadków — PASS.
- ATTENDANCE_CORRECTION: 13 przypadków — PASS.
- FORGOTTEN_STOP: 11 przypadków — PASS.
- WRONG_PROCESS: 9 przypadków — PASS.
- WORK_OUTSIDE_APP: 7 przypadków — PASS.
- NO_ACTIVITY: 9 przypadków — PASS.
- Worker-view communication: 7 przypadków — PASS.
- Frontend communication contract: 15 przypadków — PASS.
- Cutover starego backlogu: 9 przypadków fail-closed / watermark / legacy hold — PASS.
- Stage 8 foundation po dodaniu cutover: 21/21 niezależnych jobów regresji + deterministic sync — SUCCESS (`34040718042`).
- Health LIVE: HTTP 200, `version=0.8.0`, `stage=8`, `READY`, `ONLINE`.
- Zalogowany E2E MANUAL został wykonany na rzeczywistym dniu testowym: LEADER `MOL014` → WORKER `MOL004` → SEND → LIST → SHOWN → ACK → przyrostowa historia. SHOWN podniosło rewizję 1→2, ACK 2→3, a ACK nie zmienił stanu przyczyny.
- Drive mirror LIVE dla tego samego `message_id` zaktualizował istniejący wiersz do `ACKNOWLEDGED` bez duplikatu.
- Po naprawie `METRICS TASK ACK` dwa kolejne cykle schedulera domknęły `ES_DERIVED` jako `DONE` i nie utworzyły nowych `ALERT_DERIVED`. Ostatni historyczny rekord pozostał `id=7689`, `PENDING`, `attempts=0`.

## Konfiguracja bezpiecznego uruchomienia

`COMMUNICATIONS_CONFIG`:
- `mode=LIVE`
- `manual_enabled=true`
- `es_verified=false`
- `poll_seconds=null`
- `history_policy=HOLD`
- `auto_alert_consumer_enabled=false`
- `alert_cutover_outbox_id=7689`
- wszystkie reguły automatyczne `enabled=false`
- niezatwierdzone progi/godziny/ACK pozostają `null`.

Nie przyjęto arbitralnych wartości dla progów ani godziny STOP. Stary backlog nie jest kasowany ani masowo oznaczany jako wykonany.

## Otwarte testy / ograniczenia

1. **Automatyczne reguły są wdrożone jako silniki, ale celowo nieaktywne** do czasu zatwierdzenia parametrów operacyjnych. Konsument auto-alertów pozostaje jawnie wyłączony.
2. **WRONG_PROCESS / WORK_OUTSIDE_APP / NO_ACTIVITY** dodatkowo czekają na zamknięcie pozytywnego testu rzeczywistego ES z etapu 7. `es_verified=false` uniemożliwia ich użycie do wysyłki.
3. Pozytywny E2E Stage 7 musi zostać wykonany w realnym dniu roboczym, gdy ten sam pracownik używa V2 i równocześnie powstają rzeczywiste PAK/PICK w ES. Nie tworzymy sztucznej historii produkcyjnej.
4. Push, firmowy dźwięk, wibracja, heads-up, wygaszony ekran i restart telefonu pozostają zakresem późniejszego APK/pilota, nie są zaliczane przez WWW.
5. Pełny panel lidera i raporty przekrojowe pozostają etapem 9.

## Kryterium odbioru użytkownika

Etap 8 może zostać oznaczony `ODEBRANY` dopiero po publikacji `main`/Pages i jawnej decyzji użytkownika. Odbiór Stage 8 nie oznacza automatycznego zamknięcia niewykonanego pozytywnego testu Stage 7 ani włączenia automatycznych alertów.
