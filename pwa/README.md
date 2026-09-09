# MOL App V2 — źródło wydania PWA TEST RC1

Status: **AKTYWNE ŹRÓDŁO RC1**

Build: `20260909.2`

Katalog `/pwa/` zawiera zatwierdzone źródło publikacji PWA TEST RC1.

## Punkty wejścia

- `index.html` — kieruje telefon do logowania mobilnego, a komputer do panelu WWW,
- `mobile/login.html` — logowanie WORKER, LEADER i ADMIN,
- `web/login.html` — logowanie LEADER i ADMIN,
- `shared/auth.js` — wspólny klient logowania,
- `shared/api.js` — wspólny klient API V2.

## Role

- WORKER — aplikacja mobilna.
- LEADER — aplikacja mobilna i panel WWW.
- ADMIN — aplikacja mobilna i panel WWW.

WORKER jest odrzucany w panelu WWW także przez autoryzację backendu. Ukrycie interfejsu nie jest mechanizmem bezpieczeństwa.

## Źródła danych i zapisy

Aplikacja korzysta z rzeczywistych endpointów API V2 pod `https://n8n.estyl.team/webhook/`. Nie zawiera danych demonstracyjnych.

Pełne testy E2E nie są uruchamiane w sesji użytkownika. Awaria opcjonalnej sekcji nie blokuje podstawowych operacji czasu pracy i procesów.

Automatyczne alerty pozostają OFF/HOLD do osobnej decyzji. Nie jest to blokada ręcznych komunikatów.

## Procesy

Kanoniczny katalog:

1. PAKOWANIE
2. KOMPLETACJA
3. DYZUR
4. ZWROTY
5. BIURO
6. PORZADKI_KARTONY
7. PRZYGOTOWANIE_STANOWISKA
8. MAGAZYN
9. PRZERWA
10. INNE

WORKER nie ma dostępu do BIURO. LEADER i ADMIN mają wszystkie procesy.

## Zasady wydania

- wszystkie pliki wejściowe używają jednego numeru builda,
- środowisko jest jawnie oznaczone jako TEST,
- katalogi `stage9-preview/` i `stage10-preview/` są historyczne,
- nowa publikacja docelowa powstanie wyłącznie w `/pwa/`,
- rollback publikacji jest zabezpieczony w `backup/pre-pwa-test-rc1-20260909`.
