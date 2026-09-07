# MOL App V2 — Etap 10 progress

Data: 2026-09-07
Status: W TOKU
Gałąź: `codex/stage9-closeout-stage10-foundation`

## Cel

Budowa docelowego frontendu V2 po odbiorze Etapu 9. Frontend testowy `v2/` nie jest rozwijany jako produkt końcowy.

## Zrealizowane

### Wspólna warstwa produktu

- design tokens dla mobile i WWW,
- wspólne znaczenia statusów success/warning/danger/info,
- wspólny model możliwości ról,
- wspólne komponenty logowania,
- osobna walidacja CI dla Stage 10.

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
- wyboru procesu,
- normy i czasu bez procesu,
- komunikatów i podglądu wiadomości,
- profilu i historii dnia,
- własnej korekty czasu,
- menedżerskiego podglądu zespołu,
- mobilnych raportów,
- mobilnej kolejki korekt,
- mobilnej administracji użytkownikami zależnej od roli.

### WWW LEADER/ADMIN

Gotowy shell wizualno-interakcyjny dla:

- logowania,
- dashboardu zespołu,
- tabeli pracowników,
- szybkiego podglądu pracownika,
- raportów i eksportów,
- kolejki korekt,
- administracji użytkownikami,
- historii operacji.

WORKER otrzymuje ekran odmowy dostępu do WWW.

## Testy

Dedykowany workflow `Validate Stage 10 frontend`:

- JavaScript syntax PASS,
- model ról PASS,
- wymagane powierzchnie UI PASS,
- skan sekretów PASS.

Główny `Validate frontend` po zmianach Stage 10:

- składnia PASS,
- kontrakty i izolacja V2 PASS,
- dotychczasowe testy auth/attendance/processes PASS,
- Stage 10 boundaries PASS,
- skan sekretów PASS,
- CORS V2 PASS.

## Bezpieczeństwo

- brak nowych zapisów Moniti,
- brak rozszerzenia zgody testowej,
- automatyczne alerty nadal OFF/HOLD,
- V1 niezmieniona,
- nowe ekrany Stage 10 nie posiadają jeszcze aktywnych zapisów do backendu; formularze generują wyłącznie zdarzenia demonstracyjne.

## Pozostało w Etapie 10

1. ujednolicić stany UI: loading / empty / offline / retry / expired session / forbidden,
2. dopracować dostępność i rozmiary pod telefony magazynowe,
3. wykonać przegląd wizualny realnego HTML na środowisku preview,
4. usunąć dane demonstracyjne przed integracją,
5. zamrozić komponenty frontendowe jako wejście do Etapu 11.

Etap 11 rozpoczyna podłączenie finalnych ekranów do zaakceptowanych endpointów backendu Stage 9.
