# MOL App V2 — Etap 10: docelowy frontend

Status: **ODEBRANY 2026-09-07 — FRONTEND ZAMROŻONY DO CZASU DOMKNIĘCIA BACKENDU**

Frontend `v2/` pozostaje środowiskiem testowym backendu. Docelowy frontend znajduje się w `stage10/`.

Pełny audyt wymagania → frontend → backend:

`docs/v2/stage-10-frontend-backend-audit-20260907.md`

Końcowe domknięcie backendu po odbiorze Etapu 10:

`docs/v2/stage-11-backend-gap-closeout-20260907.md`

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

## Granica po odbiorze Etapu 10

Na polecenie użytkownika po odbiorze Etapu 10 najpierw domknięto brakujące kontrakty backendu. Do czasu końcowego raportu/audytu nie wolno rozpoczynać integracji fetch/API w `stage10/`.

Etap 11 backend zapewnia autorytatywne źródło dla jawnych total/eligible/outside, monitoringu lidera, heartbeat aplikacji, raportu czasu wielu osób, raportu wydajności, eksportu, pełnej historii i audytu. Szczegóły: `backend/v2/stage11-live-contract.json`.

## Nadal poza Etapem 10

- finalne podłączenie odebranego UI do backendu,
- APK/AAB,
- rejestracja urządzenia/push tokena,
- push w tle, dźwięk i wibracja,
- testy Android foreground/background/locked/restart/network/DND/battery optimization,
- pilot magazynowy.

Te elementy są realizowane w kolejnych etapach; natywne powiadomienia muszą być gotowe przed pilotem magazynowym.

## Niezmienne ograniczenia

- V1 nietknięta,
- brak rozszerzenia zgody Moniti,
- automatyczne alerty OFF/HOLD,
- backend jest źródłem autoryzacji i danych,
- frontend nie może samodzielnie rekonstruować kwalifikacji normy.
