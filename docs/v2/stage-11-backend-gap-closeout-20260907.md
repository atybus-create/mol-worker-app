# MOL App V2 — Etap 11A: domknięcie backendu przed integracją frontendu

Data: 2026-09-07
Status: **BACKEND GOTOWY DO INTEGRACJI ODEBRANEGO FRONTENDU ETAPU 10**

## Kolejność wykonania

Zgodnie z decyzją użytkownika Etap 10 został najpierw formalnie odebrany. Następnie frontend został zamrożony i wykonano brakujące prace wyłącznie w backendzie/dokumentacji. Integracja `stage10/` z API nie została rozpoczęta.

## Co uzupełniono w backendzie

### 1. Normy i worker-status

`worker-status`, `norms-daily` i `norms-monthly` wystawiają teraz jawnie:

- `total_pak`,
- `total_pick`,
- `total_combined_units`,
- `eligible_combined_units`,
- `outside_combined_units`,
- `combined_seconds`.

Frontend nie musi rekonstruować total z innych pól. Reguła łączna pozostaje `1 PAK = 1 j.n.; 3 PICK = 1 j.n.`.

### 2. Monitoring lidera

`leader-team` został rozszerzony o:

- aktywność aplikacji `ONLINE / RECENT / OFFLINE`,
- `last_seen_at` i stan sesji,
- aktywne alerty oraz ich licznik,
- diagnostykę/mapowanie ES,
- normę dzienną i miesięczną z jawnymi totalami,
- zasadę: ADMIN bez otwartego dnia nie jest zwykłą pozycją operacyjnego zespołu.

### 3. Heartbeat aplikacji

`GET /mol-app-v2-auth-session` dla poprawnej aktywnej sesji aktualizuje `SESSIONS.last_seen_at`. Jest to wyłącznie zapis technicznego heartbeat sesji; nie zapisuje czasu pracy, procesu ani Moniti.

### 4. Historia pracownika

`employee-history` łączy teraz:

- dni i obecność,
- sesje procesów,
- normy,
- WORK_EVENTS (START/STOP/REOPEN/proces/korekta),
- korekty z Drive i decyzje,
- historię komunikacji,
- powód bezpośredniej korekty czasu z COMMANDS.

Dodano paginowany `timeline` z `cursor=o:N`, `next_cursor` i `total_timeline_items`.

### 5. Raport czasu pracy

`report-attendance` obsługuje:

- jednego, wielu lub wszystkich pracowników,
- `employee_ids` do 100 ID,
- zakres do 367 dni,
- START/STOP/stan dnia,
- czas obecności, procesów i między procesami,
- `time_by_process`,
- sesje procesów,
- korekty z arkusza i ich decyzje,
- bezpośrednie `ATTENDANCE_CORRECTED` i `WORK_REOPENED`,
- statusy synchronizacji,
- filtr stanu istniejącego rekordu dnia.

Raport nie syntetyzuje `NOT_STARTED` dla dni bez rekordu obecności. Bez osobnego kalendarza zmian/urlopów brak rekordu nie jest dowodem, że pracownik miał pracować; generowanie takich wierszy dawałoby fałszywe nieobecności w weekendy/urlopy/dni wolne.

### 6. Raport wydajności

Dodano aktywny endpoint:

`GET /mol-app-v2-report-performance`

Workflow: `apaA176w09BdBkex`.

Obsługuje jednego/wielu/wszystkich pracowników i zakres dat. Zwraca PICK, PAK i PICK/PAK: total, eligible, outside, czas, procent, freshness/coverage/source_error, czasy procesów i dane źródłowe agregacji.

Podsumowanie grupy jest liczone z sum liczników i mianowników. Nie używa średniej z procentów.

### 7. Eksport

`report-export` obsługuje teraz:

- `report_type=attendance`,
- `report_type=performance`,
- `format=csv|xlsx`,
- te same filtry dat i pracowników co raport JSON.

### 8. Historia operacji

Dodano aktywny endpoint:

`GET /mol-app-v2-audit-history`

Workflow: `xvrxTXDn2Dh3y3Wx`.

Łączy WORK_EVENTS, audyt komunikacji oraz decyzje korekt powiązane z propozycjami. Obsługuje filtry pracownika, aktora, typu zdarzenia, zakres dat i paginację. Dane są rekurencyjnie czyszczone z pól wskazujących hasło/token/secret/authorization/credential.

## Końcowa macierz frontend → backend

| Funkcja zaakceptowanego frontendu | Backend po domknięciu | Status |
| --- | --- | --- |
| logowanie / sesja / logout | AUTH LOGIN / SESSION / LOGOUT | ✅ |
| WORKER tylko mobile; LEADER/ADMIN mobile + WWW | role i autoryzacja backendowa | ✅ |
| START / STOP / REOPEN / korekta czasu | attendance service i publiczne wrappery | ✅ |
| 10 procesów, BIURO tylko LEADER/ADMIN | config + process service | ✅ |
| klik MAGAZYN = od razu proces MAGAZYN | process-start/process-change | ✅ |
| dwa opcjonalne narzędzia MAGAZYN | linki zewnętrzne, backend MOL niepotrzebny | ✅ |
| norma dzienna | norms-daily | ✅ |
| norma miesięczna | norms-monthly | ✅ |
| PICK/PAK total / eligible / outside / czas / % | jawnie wystawione przez backend | ✅ |
| PICK/PAK 1:3 | backendowa semantyka i raport ważony | ✅ |
| pracownik: nowe/archiwum komunikatów, SHOWN/ACK | COMM API | ✅ |
| lider: komunikat 1/wielu/wszystkich OPEN + ACK | leader-message/recipients | ✅ |
| monitoring: START/proces/czas/no-process/wyniki | leader-team | ✅ |
| monitoring: app activity | auth-session heartbeat + leader-team | ✅ |
| monitoring: aktywne alerty | ALERTS + leader-team | ✅ |
| monitoring: ES mapping/error | ES_POLL_STATE + leader-team | ✅ |
| historia pracownika i komunikacji | employee-history + timeline | ✅ |
| paginacja historii | cursor `o:N` | ✅ |
| raport czasu: 1/wielu/wszyscy + zakres | report-attendance | ✅ |
| raport czasu: procesy/no-process/korekty/sync | report-attendance | ✅ |
| raport wydajności: 1/wielu/wszyscy + zakres | report-performance | ✅ |
| ważony wynik grupy | backend sumuje liczniki/mianowniki | ✅ |
| CSV/XLSX obu raportów | report-export | ✅ |
| kolejka korekt approve/reject | Stage 9 corrections services | ✅ |
| użytkownicy lista/create/reset/active | Stage 9 user-admin/status services | ✅ |
| globalna Historia operacji | audit-history | ✅ |
| auto-alerty | mechanizm istnieje, pozostaje OFF/HOLD zgodnie z decyzją | ✅ stan zamierzony |

## Walidacje

Po końcowych poprawkach:

- `MOL // APP V2 // LEADER READ SERVICE` — **0 errors**,
- `API REPORT PERFORMANCE` — **0 errors / 0 warnings**,
- `API AUDIT HISTORY` — **0 errors / 0 warnings**,
- `API REPORT EXPORT` — **0 errors / 0 warnings**,
- `AUTH SESSION` z heartbeat — **0 errors**,
- worker-status oraz norm daily/monthly — wcześniej po tej zmianie **0 errors**.

Anonimowe publiczne wywołania zwracają `401 UNAUTHENTICATED` dla monitoringu, historii, raportu czasu, raportu wydajności, eksportu, audytu, worker-status, norm i auth-session. Nie stwierdzono wycieku danych przez nowe wejścia.

## Granice testu

Pełnego authenticated E2E nowych odczytów nie wykonano ręcznie przez narzędzie, ponieważ jego warstwa bezpieczeństwa zablokowała przekazanie hasła konta testowego. Nie obchodzono tego zabezpieczenia. Test authenticated E2E należy wykonać w następnym kroku przez normalne logowanie podczas integracji odebranego frontendu.

Nie jest to znana luka funkcjonalna backendu; jest to brak jednego poziomu dowodu runtime przed integracją.

## Rzeczy celowo jeszcze niewykonane

Nie są to braki backendu pod Etap 10:

1. podłączenie finalnego `stage10/` do API — następny krok,
2. rejestracja urządzenia i push tokena,
3. push w tle, dźwięk, wibracja, heads-up/deep-link,
4. APK/AAB,
5. testy Android foreground/background/locked/restart/network/DND/battery,
6. pilot magazynowy.

Warstwa natywnych powiadomień ma zostać wykonana przed pilotem magazynowym, zgodnie z decyzją użytkownika.

## Bezpieczeństwo i brak efektów ubocznych

- V1 niezmieniona.
- Nie rozszerzono zgody na realne zapisy Moniti.
- Domknięcie backendu nie wykonało biznesowych zapisów czasu/pracy w Moniti.
- Automatyczne alerty pozostały OFF/HOLD.
- Nie ujawniono ani nie przenoszono haseł, tokenów lub hashy.
- Frontend HTML/CSS/JS nie był modyfikowany; zmieniono jedynie jego README/status dokumentacyjny.

## Dokumentacja kontraktu

- bazowy `docs/v2/openapi.json`,
- rozszerzenie `docs/v2/openapi-stage11-addendum.json`,
- opis `docs/v2/api-contract.md`,
- live pin `backend/v2/stage11-live-contract.json`.

Przed Release Candidate addendum należy scalić do pojedynczego `openapi.json`. Jest to porządek dokumentacyjny, nie brak runtime backendu.

## Decyzja końcowa audytu

Na poziomie funkcjonalnym **nie znaleziono już brakującego kontraktu backendowego potrzebnego zaakceptowanemu frontendowi Etapu 10**.

Backend jest gotowy do następnego kroku: integracji finalnego frontendu z API, zaczynając od normalnego logowania/sesji i read-only ekranów. Pierwszy authenticated E2E nowych odczytów należy wykonać w ramach tej integracji przed podłączeniem zapisów.
