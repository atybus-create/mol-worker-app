# MOL App V3 — Etap 0

Status: wdrożony technicznie, do odbioru użytkownika.

## Zakres

- Potwierdzono instancję `n8n-estyl-team`.
- Potwierdzono 0 aktywnych workflowów V1/V2/TEMP przed rozpoczęciem V3.
- Utworzono i aktywowano wyłącznie `MOL // APP V3 // API HEALTH` (`5xDy7GPmnhtXkoed`).
- Wspólny klient API frontendu przełącza tylko health na V3.
- Logowanie oraz wszystkie funkcje biznesowe pozostają wyłączone.
- Frontend używa jednego builda `20260911.1` dla Mobile i WWW.

## Dowody techniczne

- Walidacja workflowu: 0 błędów, 0 ostrzeżeń, 3 nody, 2 poprawne połączenia.
- Test przez n8n MCP: HTTP 200, czas wykonania workflowu 178 ms.
- Test CORS: HTTP 204, origin `https://atybus-create.github.io`, metody `OPTIONS, GET`.
- Test utrzymanego połączenia HTTP: kolejne odpowiedzi około 0,32 s.
- Test kontraktu frontendu: PASS.
- Istniejące regression guards: PASS.

## Kryterium odbioru

Na obu ekranach logowania musi być widoczny branding V3 oraz zielony komunikat potwierdzający backend V3. Logowanie ma pozostać zablokowane. Po akceptacji użytkownika można rozpocząć budowę `AUTH LOGIN`.
