# MOL App V2 — Etap 10: docelowy frontend

Status: **GOTOWY TECHNICZNIE DO ODBIORU PO AUDYCIE — NIEODEBRANY**

Frontend `v2/` pozostaje środowiskiem testowym backendu. Docelowy frontend jest rozwijany wyłącznie w `stage10/`.

Pełny audyt wymagania → frontend → backend:

`docs/v2/stage-10-frontend-backend-audit-20260907.md`

## Role

- WORKER — tylko aplikacja mobilna.
- LEADER — aplikacja mobilna + widoki menedżerskie + WWW.
- ADMIN — aplikacja mobilna + widoki menedżerskie/admin + WWW.

**WORKER nie otrzymuje panelu WWW ani menedżerskich ekranów mobilnych.**

Backend jest zawsze źródłem autoryzacji; ukrycie elementu UI nie jest zabezpieczeniem.

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

WORKER nie ma BIURO. LEADER/ADMIN mają wszystkie 10.

**MAGAZYN:** kliknięcie kafla od razu aktywuje proces MAGAZYN. Dwa narzędzia magazynowe są wyłącznie opcjonalnym dodatkiem i nie sterują procesem.

## Norma

WORKER ma dwa domyślnie zwinięte widoki: `Norma dziś` i `Norma miesięczna`.

PAK, PICK i PICK/PAK pokazują:

- ilość łącznie,
- ilość do normy,
- ilość poza normą,
- czas,
- procent normy.

PICK/PAK używa jednostek normy: `1 PAK = 1 j.n.` oraz `3 PICK = 1 j.n.`.

Agregacja okresu/grupy jest ważona z sum liczników i mianowników. Nie wolno uśredniać gotowych procentów.

## Raporty lidera

Osobne ekrany:

- Wydajność,
- Czas pracy,
- Komunikaty.

Wydajność i Czas pracy pozwalają wybierać jednego, wielu lub wszystkich pracowników oraz zakres dat. Czas pracy ma osobno START, STOP, obecność, czasy procesów, czas międzyprocesowy, korekty i synchronizację.

## Komunikacja

LEADER/ADMIN mogą przygotować komunikat do jednego, wielu lub wszystkich aktualnie OPEN, z opcją wymaganego ACK. WORKER ma listę nowych/archiwalnych wiadomości, SHOWN i ACK.

Automatyczne reguły alertów pozostają OFF/HOLD do osobnej decyzji i etapu powiadomień.

## Ograniczenia Etapu 10

- brak realnych zapisów do backendu z finalnego UI,
- brak nowych zapisów Moniti,
- V1 nietknięta,
- finalne podłączenie danych i rozszerzenie brakujących kontraktów API zaczyna się w Etapie 11,
- APK/push/dźwięk/wibracja przed pilotem magazynowym, zgodnie z decyzją użytkownika.
