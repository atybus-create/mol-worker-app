# MOL App V2 — Etap 10 closeout

Data: 2026-09-07
Status: GOTOWY TECHNICZNIE DO ODBIORU UŻYTKOWNIKA
Gałąź: `codex/stage9-closeout-stage10-foundation`

## Zakres

Etap 10 tworzy docelowy frontend V2, niezależny od testowego frontendu `v2/` użytego do odbioru Etapu 9.

Powstały dwa spójne wizualnie interfejsy:

- `stage10/mobile/` — podstawowy interfejs mobilny dla WORKER / LEADER / ADMIN,
- `stage10/web/` — dodatkowy panel WWW wyłącznie dla LEADER / ADMIN.

## Dostęp według roli

- WORKER: mobile = TAK, WWW = NIE,
- LEADER: mobile = TAK, WWW = TAK,
- ADMIN: mobile = TAK, WWW = TAK.

Frontend posiada role-guard, jednak docelową autoryzacją pozostaje backend V2, który będzie podłączony w Etapie 11.

## Procesy

Frontend odwzorowuje dokładnie 10 aktywnych procesów:

1. PAKOWANIE,
2. KOMPLETACJA,
3. DYZUR,
4. ZWROTY,
5. BIURO,
6. PORZADKI_KARTONY,
7. PRZYGOTOWANIE_STANOWISKA,
8. MAGAZYN,
9. PRZERWA,
10. INNE.

Reguła uprawnień:

- WORKER: 9 procesów, bez BIURO,
- LEADER / ADMIN: wszystkie 10.

Fikcyjne SORTOWANIE zostało usunięte.

## Norma WORKER

Każdy pracownik ma podgląd normy w dwóch okresach:

1. bieżący dzień,
2. od pierwszego dnia bieżącego miesiąca kalendarzowego do dziś.

W obu okresach dla PAK, PICK i PICK/PAK prezentowane są osobno:

- **Ilość łącznie**,
- **Ilość do normy**,
- **Ilość poza normą**,
- **Czas**,
- **Procent normy**.

`Ilość do normy` odpowiada produkcji zakwalifikowanej przez backend do normy. `Ilość poza normą` pozostaje widoczna i nie jest ukrywana w wyniku pracownika.

## Podgląd zespołu LEADER / ADMIN

Lista pracowników pokazuje bieżący status, proces, obecność oraz dzisiejsze PICK, PAK i PICK/PAK. Każda z trzech ilości jest wyraźnie rozdzielona na:

- łącznie,
- do normy,
- poza normą.

Po wybraniu pracownika lider otrzymuje pełne rozliczenie:

- dzisiaj: PICK / PAK / PICK-PAK jako łącznie / do normy / poza normą / czas / procent,
- bieżący miesiąc: identyczny komplet danych od pierwszego dnia miesiąca do dziś.

Mobilny widok LEADER / ADMIN korzysta z tej samej semantyki.

## Raportowanie pracowników

Panel raportów WWW obsługuje:

- wybór jednego pracownika,
- wybór dowolnej grupy,
- `Zaznacz wszystkich`,
- `Wyczyść`,
- licznik zaznaczonych,
- zakres dat `od` / `do`,
- `Generuj raport dla zaznaczonych`,
- eksport CSV i XLSX z dokładną listą `employeeIds` i zakresem dat.

Raport okresowy ma jawne kolumny:

- PICK łącznie,
- PICK do normy,
- PICK poza normą,
- PICK czas,
- PICK %,
- PAK łącznie,
- PAK do normy,
- PAK poza normą,
- PAK czas,
- PAK %,
- PICK/PAK łącznie,
- PICK/PAK do normy,
- PICK/PAK poza normą,
- PICK/PAK czas,
- PICK/PAK %.

Mobilny panel LEADER / ADMIN ma analogiczny wybór osób i zakres dat.

## Zgodność z logiką Stage 7

Realny test Stage 7 potwierdził już rozróżnienie produkcji kwalifikowanej i niekwalifikowanej: `MATCH_PROCESS` weszło do `eligible_pak`, natomiast wcześniejsza produkcja `NO_APP` pozostała poza normą i nie została przepisana wstecz.

Obecny publiczny `worker-status` eksponuje `eligible_pak` i `eligible_pick`, ale nie posiada jeszcze kompletnego gotowego zestawu `total` / `outside_norm`. Dlatego w Etapie 11 należy rozszerzyć kontrakt backendu. Frontend nie może sam arbitralnie kwalifikować produkcji ani traktować `eligible` jako całkowitego wykonania.

Docelowo backend ma dostarczać dla PICK i PAK co najmniej:

- total,
- eligible,
- outside_norm,
- seconds,
- percent,

oraz analogiczne wartości PICK/PAK dla dnia, bieżącego miesiąca i dowolnego okresu raportowego.

## Pozostałe powierzchnie UI

Gotowe są:

- logowanie mobile,
- logowanie WWW,
- dashboard WORKER,
- START / STOP pracy,
- wybór / zmiana procesu,
- komunikaty i ACK UI,
- profil i historia dnia,
- formularz własnej korekty,
- mobilny panel zespołu,
- raporty,
- kolejka korekt,
- administracja użytkownikami,
- historia operacji,
- loading / empty / offline / retry / expired session / forbidden,
- responsywne układy mobile / tablet / desktop.

## Bezpieczeństwo i izolacja

Podczas Etapu 10:

- nie wykonano nowych zapisów Moniti,
- nie rozszerzono zgody na testy Moniti,
- nie uruchomiono automatycznych alertów,
- V1 pozostała bez zmian,
- `/v2/` pozostaje testowym frontendem Etapu 9,
- akcje Stage 10 są nadal demonstracyjne i nie zapisują do backendu.

## Testy końcowe po ostatnim rozszerzeniu

### Validate Stage 10 frontend

Run: `34124929440`
Wynik: PASS

Sprawdzone m.in.:

- składnia JS,
- role,
- 10 procesów i ograniczenie BIURO,
- dwa okresy norm WORKER,
- jawne `Ilość łącznie`, `Ilość do normy`, `Ilość poza normą`,
- PICK / PAK / PICK-PAK,
- pełny podgląd pracownika dla lidera,
- raport jednego, wielu lub wszystkich pracowników,
- przekazywanie `employeeIds`, `from`, `to`,
- brak sekretów.

### Validate frontend

Run: `34124929502`
Wynik: PASS

Sprawdzone m.in.:

- składnia,
- izolacja i kontrakty V2,
- granice produktu Stage 10,
- dotychczasowe integracje,
- skan sekretów,
- CORS V2,
- zamrożona V1.

## Brama odbiorowa

Etap 10 jest technicznie gotowy po rozszerzeniu norm i rozdzieleniu ilości. Następnym krokiem jest publikacja odświeżonego izolowanego `/stage10-preview/` i wizualny odbiór użytkownika.

Dopiero po jawnym odbiorze Etapu 10 należy oznaczyć go jako ODEBRANY i rozpocząć Etap 11 — integrację docelowych frontendów z backendem V2.
