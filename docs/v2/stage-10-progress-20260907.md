# MOL App V2 — Etap 10 progress

Data: 2026-09-07
Status: GOTOWY TECHNICZNIE DO ODBIORU
Gałąź: `codex/stage9-closeout-stage10-foundation`

## Cel

Budowa docelowego frontendu V2 po odbiorze Etapu 9. Frontend testowy `v2/` nie jest rozwijany jako produkt końcowy.

## Zrealizowane

### Wspólna warstwa produktu

- design tokens dla mobile i WWW,
- wspólne znaczenia statusów success/warning/danger/info,
- wspólny model możliwości ról,
- wspólne komponenty logowania,
- wspólne stany loading / empty / offline / retry / expired session / forbidden,
- osobna walidacja CI dla Stage 10,
- wspólny kanoniczny katalog procesów `stage10/shared/processes.js`.

### Procesy i role

Finalny frontend odwzorowuje backendowy katalog 10 procesów:

- PAKOWANIE,
- KOMPLETACJA,
- DYZUR,
- ZWROTY,
- BIURO,
- PORZADKI_KARTONY,
- PRZYGOTOWANIE_STANOWISKA,
- MAGAZYN,
- PRZERWA,
- INNE.

WORKER otrzymuje 9 procesów bez BIURO. LEADER i ADMIN otrzymują wszystkie 10. Fikcyjne SORTOWANIE zostało usunięte z docelowego UI i objęte testem regresyjnym.

### Model dostępu

- WORKER: aplikacja mobilna, brak WWW,
- LEADER: aplikacja mobilna + widoki menedżerskie + panel WWW,
- ADMIN: aplikacja mobilna + widoki menedżerskie/admin + panel WWW.

Kontrola WWW jest realizowana również w kodzie role-guard; backend pozostaje docelowym źródłem autoryzacji w Etapie 11.

### Mobile

Gotowy shell wizualno-interakcyjny dla:

- logowania,
- dashboardu pracy,
- START/STOP,
- bieżącego procesu,
- wyboru procesu z pełnego katalogu zależnego od roli,
- normy i czasu bez procesu,
- komunikatów i podglądu wiadomości,
- profilu i historii dnia,
- własnej korekty czasu,
- menedżerskiego podglądu zespołu,
- dziennych liczników PICK i PAK dla pracowników,
- mobilnych raportów z wyborem wielu pracowników,
- mobilnej kolejki korekt,
- mobilnej administracji użytkownikami zależnej od roli.

### WWW LEADER/ADMIN

Gotowy shell wizualno-interakcyjny dla:

- logowania,
- dashboardu zespołu,
- tabeli pracowników,
- bieżących wartości PICK dziś / PAK dziś dla każdego pracownika,
- szybkiego podglądu pracownika z PICK / PAK / normą / obecnością,
- raportów z checkboxami i dowolnym wyborem wielu pracowników,
- funkcji `Zaznacz wszystkich` i `Wyczyść`,
- podsumowania dokładnie zaznaczonej grupy,
- eksportów CSV/XLSX dla dokładnie wybranych osób i zakresu dat,
- kolejki korekt,
- administracji użytkownikami,
- historii operacji.

WORKER otrzymuje ekran odmowy dostępu do WWW.

## Testy

Dedykowany workflow `Validate Stage 10 frontend` sprawdza:

- składnię wszystkich plików JavaScript,
- model ról,
- obecność 10 kanonicznych procesów,
- brak `SORTOWANIE`,
- ograniczenie `BIURO` dla WORKER,
- wymagane powierzchnie UI,
- PICK/PAK w podglądzie zespołu,
- multi-select raportów,
- przekazanie listy zaznaczonych `employeeIds` do przyszłej warstwy eksportu,
- skan sekretów.

Główny `Validate frontend` nadal chroni dotychczasowe kontrakty V2, V1 i CORS.

## Bezpieczeństwo

- brak nowych zapisów Moniti,
- brak rozszerzenia zgody testowej,
- automatyczne alerty nadal OFF/HOLD,
- V1 niezmieniona,
- nowe ekrany Stage 10 nie posiadają aktywnych zapisów do backendu; formularze i eksporty generują wyłącznie zdarzenia demonstracyjne.

## Brama Etapu 11

Etap 10 jest gotowy technicznie do odbioru po przejściu końcowego CI i publikacji zaktualizowanego izolowanego preview. Po odbiorze Etap 11 podłącza finalne ekrany do zaakceptowanych endpointów backendu Stage 9, w tym przygotuje obsługę raportu dla wielu `employee_id` bez zmiany znaczenia dotychczasowych endpointów.
