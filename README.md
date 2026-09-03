# MOL // System monitorowania czasu pracy, wykorzystania procesów i realizacji norm

Frontend Etapu 7 dla ESTYL.PL. Jedna baza kodu obsługuje widok pracownika oraz role LEADER/ADMIN.

## Architektura

- statyczny frontend/PWA bez frameworka i bez zależności runtime,
- backend: firmowy n8n `https://n8n.estyl.team`,
- sesja: Bearer token generowany przez `MOL // APP // API AUTH`,
- worker API: CONFIG, WORKDAY, PROCESS, ALERTS, REPORTS,
- leader API: `MOL // APP // API LEADER`,
- konfiguracja endpointów i linków zewnętrznych tylko w `config.js`.

## Funkcje pracownika

- logowanie i obsługa blokady Moniti,
- wybór i zmiana procesu,
- lokalny timer aktywnego procesu,
- automatyczne zamknięcie aktywnego procesu dokładnym czasem FINISH z Moniti,
- blokada rozpoczęcia kolejnego procesu po zakończeniu obecności w Moniti,
- KPI PAK/PICK i norma dzienna/miesięczna,
- alerty z acknowledge,
- zakończenie części aplikacyjnej dnia,
- proces MAGAZYN z przekierowaniem do Terminy – aplikacja magazynowa i Batch reader.

## Funkcje lidera

- lista wszystkich osób aktywnych w Moniti, z wykluczeniem kont ADMIN,
- status aplikacji, brak procesu, aktywny proces, normy i alerty,
- widoczny błąd brakującego mapowania Moniti–aplikacja,
- lista aktywnych alertów,
- ręczny komunikat do pracownika,
- raport dzienny i miesięczny pracownika.

## Publikacja

Workflow `.github/workflows/pages.yml` publikuje `main` do GitHub Pages. `main` jest gałęzią stabilną; `dev` służy jako gałąź integracyjna.

## Bezpieczeństwo

Repozytorium nie zawiera tokenów, haseł, credentiali n8n ani webhooka Google Chat. Hasła pracowników są konfigurowane wyłącznie w backendzie.
