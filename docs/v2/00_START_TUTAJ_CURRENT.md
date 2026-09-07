# MOL App V2 — START TUTAJ / aktualny punkt kontynuacji

Stan przekazania: **2026-09-07 20:59 Europe/Warsaw**  
Repozytorium: `atybus-create/mol-worker-app`  
Gałąź robocza: `codex/stage9-closeout-stage10-foundation`  
HEAD przy przekazaniu: `ca8f824d54f266fa5430ca6a70429c2791631104`  
Status: **ETAP 10 ODEBRANY. ETAP 11A BACKEND GOTOWY. INTEGRACJA FRONTEND ↔ BACKEND JESZCZE NIE ROZPOCZĘTA.**

Ten dokument jest bieżącym punktem wejścia do projektu. Nie zaczynaj projektu od początku. Nie przepisuj odebranych etapów. Nie traktuj starszych pakietów przekazania jako aktualniejszego stanu niż ten dokument i pliki live wskazane niżej.

## 1. Polecenie użytkownika na pierwszą sesję po przeniesieniu

Kontynuuj dokładnie od miejsca, w którym zakończono poprzednie okno kontekstowe.

**Najpierw wykonaj tylko weryfikację i prezentację — bez łączenia frontendu z backendem:**

1. Sprawdź dostęp do GitHub i n8n MCP.
2. Odczytaj aktualny HEAD gałęzi roboczej i upewnij się, że nie ma nowszej pracy. Nie resetuj ani nie cofaj zmian.
3. Odczytaj aktywne/opublikowane workflowy n8n związane z Etapem 11A. Nie uruchamiaj zapisów biznesowych.
4. Porównaj ponownie zaakceptowany frontend Etapu 10 z faktycznie aktywnym backendem i potwierdź, że każda funkcja UI ma źródło/operację backendową.
5. Pokaż użytkownikowi ponownie aktualny stan frontendu przeznaczonego do integracji — mobile WORKER/LEADER/ADMIN oraz WWW LEADER/ADMIN — korzystając z istniejącego preview. Nie przebudowuj wyglądu bez polecenia.
6. Zgłoś użytkownikowi krótko: co potwierdzono, ewentualne różnice i czy frontend jest gotowy do spięcia.
7. **ZATRZYMAJ SIĘ. Nie łącz frontendu z backendem. Czekaj na jednoznaczną akceptację użytkownika.**

Dopiero po komunikacie użytkownika w rodzaju: **„Akceptuję frontend do integracji — połącz backend z frontendem”** wolno rozpocząć integrację.

## 2. Status etapów

- Etapy **1–10: ODEBRANE**.
- Etap **11A: domknięcie braków backendu — wykonane i zweryfikowane**.
- Etap **11B: integracja finalnego frontendu z backendem — NIE ROZPOCZĘTA / BRAMA AKCEPTACJI UŻYTKOWNIKA**.
- Pełny regres/Release Candidate — później.
- Android APK/AAB + natywne powiadomienia w tle — przed pilotem magazynowym.
- Pilot magazynowy — dopiero po APK i testach powiadomień.

Aktualny rejestr: `docs/v2/acceptance-log.md`.

## 3. Źródła prawdy, które trzeba przeczytać przed jakąkolwiek integracją

W tej kolejności:

1. `docs/v2/00_START_TUTAJ_CURRENT.md` — ten dokument.
2. `docs/v2/acceptance-log.md` — aktualne odbiory i bramy.
3. `backend/v2/stage11-live-contract.json` — **live pin backendu po domknięciu braków**.
4. `docs/v2/stage-11-backend-gap-closeout-20260907.md` — co dokładnie uzupełniono i jakie były testy.
5. `docs/v2/stage-10-frontend-backend-audit-20260907.md` — wcześniejsza lista luk i wymagania UI.
6. `stage10/README.md` — zakres i role finalnego frontendu.
7. `docs/v2/api-contract.md` oraz `docs/v2/openapi-stage11-addendum.json` — kontrakty do integracji.
8. Dopiero potem kod `stage10/` i aktywne workflowy n8n.

Starszy zbiorczy pakiet `# MOL V2 — KOMPLET KONTEKSTU DO KONTYNUACJI.docx` zachowuje historię i specyfikację, ale jego statusy etapów 6–10 są historyczne. Aktualny stan rozstrzygają pliki powyżej.

## 4. Aktualny backend — Etap 11A

Backend po końcowym audycie ma status: `BACKEND_READY_FOR_FRONTEND_INTEGRATION`.

Główna usługa odczytowa lidera:
- `MOL // APP V2 // LEADER READ SERVICE`
- workflow ID: `5JJIHXO4rArpa32N`
- operacje: `LEADER_TEAM`, `EMPLOYEE_HISTORY`, `REPORT_ATTENDANCE`, `REPORT_PERFORMANCE`, `REPORT_EXPORT`, `AUDIT_HISTORY`
- walidacja po ostatnich zmianach: **0 errors**.

Publiczne odczyty istotne dla integracji:

- `GET /mol-app-v2-worker-status` — `yXJ9hBTKl2yFBTVO`
- `GET /mol-app-v2-norms-daily` — `7OJ48TN6IEkQqrMW`
- `GET /mol-app-v2-norms-monthly` — `ZenbZql84avHIz9b`
- `GET /mol-app-v2-auth-session` — `li4DQnEefK8DR8hh` — działa również jako heartbeat `last_seen_at`
- `GET /mol-app-v2-leader-team` — `qaAkW6vHaRtLxq0Z`
- `GET /mol-app-v2-employee-history` — `lkqTVrFEeWpQaPTl`
- `GET /mol-app-v2-report-attendance` — `avbxQqBwiYG8KhrS`
- `GET /mol-app-v2-report-performance` — `apaA176w09BdBkex`
- `GET /mol-app-v2-report-export` — `l0Pq8sEusnT5IDhI`
- `GET /mol-app-v2-audit-history` — `xvrxTXDn2Dh3y3Wx`

Etap 11A domknął m.in.:

- jawne `total / eligible / outside / seconds` dla PICK, PAK i PICK/PAK,
- semantykę `1 PAK = 1 j.n.; 3 PICK = 1 j.n.`,
- heartbeat aplikacji i `ONLINE / RECENT / OFFLINE`,
- aktywne alerty w monitoringu lidera,
- diagnostykę/mapowanie ES,
- operacyjne ukrywanie ADMIN bez otwartego dnia,
- pełną historię pracownika: obecność, procesy, WORK_EVENTS, korekty, decyzje, komunikację,
- paginację historii,
- raport czasu dla jednego/wielu/wszystkich pracowników,
- czasy procesów i międzyprocesowe,
- korekty bezpośrednie `ATTENDANCE_CORRECTED` i `WORK_REOPENED`,
- nowy raport wydajności za dowolny okres,
- ważoną agregację grupy — nigdy średnia z procentów,
- CSV/XLSX dla czasu i wydajności,
- globalny audit-history z filtrami, paginacją i sanitizacją pól wrażliwych.

Anonimowe wywołania nowych/rozszerzonych odczytów zostały sprawdzone i zwracają `401 UNAUTHENTICATED`.

Jedyny niewykonany poziom dowodu runtime: pełny **authenticated E2E nowych odczytów**. Narzędzie zablokowało ręczne przenoszenie hasła; zabezpieczenia nie obchodzono. Ten test ma być wykonany przez normalne logowanie podczas właściwej integracji, po akceptacji użytkownika.

## 5. Finalny frontend Etapu 10 — stan zamrożony do ponownego pokazania użytkownikowi

Finalny frontend znajduje się w `stage10/`. `v2/` jest wcześniejszym/testowym frontendem backendu i nie jest docelowym UI.

Role:

- `WORKER` — tylko mobile.
- `LEADER` — mobile + funkcje menedżerskie + WWW.
- `ADMIN` — mobile + funkcje menedżerskie/admin + WWW.
- WORKER nie może dostać WWW ani menedżerskich danych przez bezpośrednie API.

Kanoniczne procesy:

1. `PAKOWANIE`
2. `KOMPLETACJA`
3. `DYZUR`
4. `ZWROTY`
5. `BIURO`
6. `PORZADKI_KARTONY`
7. `PRZYGOTOWANIE_STANOWISKA`
8. `MAGAZYN`
9. `PRZERWA`
10. `INNE`

Uprawnienia:
- WORKER: wszystkie poza `BIURO`.
- LEADER/ADMIN: wszystkie 10.
- `SORTOWANIE` nie jest procesem produkcyjnym i nie może wrócić do UI.

`MAGAZYN`: kliknięcie procesu od razu uruchamia/zmienia proces `MAGAZYN`; dwa narzędzia magazynowe są opcjonalne i nie sterują stanem procesu.

Raporty lidera/admina:
- osobno `Wydajność` i `Czas pracy`,
- wybór jednego, wielu albo wszystkich pracowników,
- checkboxy, `Zaznacz wszystkich`, `Wyczyść`, licznik zaznaczonych,
- zakres dat,
- raport i eksport dokładnie dla zaznaczonego zbioru,
- wynik grupy + wyniki per osoba,
- backend liczy agregację ważoną.

## 6. Preview, które trzeba ponownie pokazać użytkownikowi PRZED integracją

Launcher:
`https://atybus-create.github.io/mol-worker-app/stage10-preview/`

Mobile:
- WORKER: `https://atybus-create.github.io/mol-worker-app/stage10-preview/mobile/index.html?role=WORKER`
- LEADER: `https://atybus-create.github.io/mol-worker-app/stage10-preview/mobile/index.html?role=LEADER`
- ADMIN: `https://atybus-create.github.io/mol-worker-app/stage10-preview/mobile/index.html?role=ADMIN`

WWW:
- LEADER: `https://atybus-create.github.io/mol-worker-app/stage10-preview/web/index.html?role=LEADER`
- ADMIN: `https://atybus-create.github.io/mol-worker-app/stage10-preview/web/index.html?role=ADMIN`
- test blokady WORKER: `https://atybus-create.github.io/mol-worker-app/stage10-preview/web/index.html?role=WORKER`

Preview jest demonstracyjne: dane demo, bez biznesowych zapisów backendu. Ma służyć ponownemu pokazaniu i akceptacji stanu UI przed spięciem z API.

## 7. Dokładna brama integracji — NIE POMIJAĆ

Przed integracją nowy asystent ma przedstawić użytkownikowi krótką macierz kontrolną:

- ekran/funkcja frontendu,
- endpoint/operacja backendu,
- status `POTWIERDZONE` albo konkretna rozbieżność,
- link do odpowiedniego preview.

Jeżeli nie wykryto regresji, ma napisać wprost, że **frontend jest gotowy do integracji, ale nic jeszcze nie zostało połączone**, i poprosić o akceptację.

**Bez jednoznacznej akceptacji użytkownika nie wolno:**
- zmieniać `stage10/*.js/html/css` pod realne API,
- publikować zintegrowanej wersji,
- przełączać preview z demo na live,
- podłączać write endpointów,
- wykonywać nowych biznesowych zapisów Moniti.

## 8. Dopiero po akceptacji — kolejność integracji Etapu 11B

1. Wspólny klient API, konfiguracja endpointów i obsługa sesji/tokena.
2. Realne login/logout + routing roli.
3. Najpierw odczyty read-only:
   - worker-status,
   - normy,
   - komunikaty/historia,
   - leader-team,
   - employee-history,
   - report-attendance,
   - report-performance,
   - audit-history,
   - listy użytkowników/korekt.
4. Wykonać authenticated E2E przez normalne logowanie. Nie przenosić hasła ręcznie między narzędziami.
5. Dopiero gdy odczyty przejdą, podłączyć zapisy:
   - attendance START/STOP/REOPEN/CORRECT,
   - process START/CHANGE/LOGOUT,
   - SHOWN/ACK,
   - korekty lidera approve/reject,
   - user create/reset/active.
6. Każdy write zachowuje istniejący `request_id`, wersję i idempotencję. Nie tworzyć równoległej logiki domenowej we frontendzie.
7. Po integracji pełny regres WORKER/LEADER/ADMIN, mobile/WWW, offline/retry/session-expiry/double-click/stale-response.
8. Dopiero po odbiorze integracji przejść do Release Candidate i warstwy Android.

## 9. Granice bezpieczeństwa i decyzje, których nie wolno zgubić

- V1 pozostaje nietknięta.
- Automatyczne alerty pozostają `OFF/HOLD`; nie aktywować bez osobnej decyzji użytkownika.
- Nie rozszerzać zgody na realne zapisy Moniti. Historyczne zgody z 2026-09-05/06/07 nie są zgodą na nowe testy biznesowe.
- Odczyty i walidacje są dozwolone; write do czasu/procesów/Moniti tylko w jawnie uzgodnionym zakresie.
- Nie ujawniać haseł, hashy, tokenów, credentiali ani prywatnego pliku z kontami testowymi.
- Prywatny dokument z kontami może być dołączony przez użytkownika osobno do nowego okna; nie publikować go w repo.
- Nie resetować gałęzi do starszego commita, jeśli HEAD jest nowszy niż `ca8f824d54f266fa5430ca6a70429c2791631104`.

## 10. Android przed pilotem magazynowym

Użytkownik wymaga, aby pierwszy pilot z realnymi magazynierami odbył się już na prawdziwej aplikacji Android z działaniem w tle.

Przed pilotem trzeba mieć i przetestować:
- rejestrację urządzenia/push tokena,
- FCM lub równoważny push natywny,
- high-importance notification channel,
- dźwięk,
- wibrację,
- heads-up i zachowanie na zablokowanym ekranie w granicach Androida,
- deep-link do właściwego komunikatu,
- deduplikację,
- token refresh/revoke/logout,
- test foreground/background/locked/removed-from-recents/restart/network/DND/battery optimization na faktycznych telefonach magazynowych.

Nie obiecywać gwarantowanego fizycznego wybudzenia ekranu w każdym stanie Android/DND/OEM. Nie używać full-screen intent bez uzasadnionej zgodności z zasadami Androida.

## 11. Ostatni potwierdzony stan techniczny

- Branch HEAD: `ca8f824d54f266fa5430ca6a70429c2791631104`.
- GitHub CI `Validate frontend`, run `34153370058`: **SUCCESS**.
- Etap 10: **ODEBRANY**.
- Etap 11A backend gap closure: **PASS / BACKEND READY FOR FRONTEND INTEGRATION**.
- Finalny frontend HTML/CSS/JS nie został zmieniony podczas domykania backendu.
- Integracja frontend ↔ backend: **0% — świadomie wstrzymana przed bramą akceptacji użytkownika**.

## 12. Pierwsza odpowiedź nowego asystenta

Po wczytaniu dokumentu nowy asystent nie powinien od razu implementować.

Powinien najpierw:

1. potwierdzić dostęp i aktualny HEAD,
2. potwierdzić aktywny backend read-only,
3. porównać go z `stage10/`,
4. ponownie pokazać użytkownikowi preview frontendu,
5. wypunktować ewentualne rozbieżności albo potwierdzić brak luk,
6. zakończyć komunikatem: **„Frontend i backend są zweryfikowane. Integracji jeszcze nie rozpocząłem. Czekam na Twoją akceptację, żeby je połączyć.”**

To jest obowiązujący punkt kontynuacji projektu.