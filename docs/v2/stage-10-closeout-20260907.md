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

Frontend został zsynchronizowany z `backend/v2/processes/catalog.json` i odwzorowuje dokładnie 10 aktywnych procesów:

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

Wcześniejszy demonstracyjny proces SORTOWANIE został usunięty z UI. Dedykowane CI pilnuje, aby nie wrócił do wykonywalnego frontendu.

## Norma WORKER

Po rozszerzeniu zakresu każdy pracownik ma własny podgląd normy w dwóch okresach:

1. bieżący dzień,
2. od pierwszego dnia bieżącego miesiąca kalendarzowego do dziś.

W obu okresach prezentowane są trzy niezależne wiersze:

- PAK — ilość, czas, procent normy,
- PICK — ilość, czas, procent normy,
- PICK/PAK — łączna ilość, łączny czas, łączny procent normy.

Nie pozostawiamy jednego zbiorczego procentu bez możliwości sprawdzenia składowych PICK i PAK.

## Podgląd zespołu LEADER / ADMIN

Lista pracowników pokazuje bieżący status, proces, obecność, PICK dzisiaj, PAK dzisiaj, łączną normę PICK/PAK i alerty.

Po wybraniu pracownika lider otrzymuje pełne rozliczenie:

- dzisiaj: PICK ilość/czas/%, PAK ilość/czas/%, PICK/PAK ilość/czas/%,
- bieżący miesiąc: ten sam komplet danych od pierwszego dnia miesiąca do dziś.

Mobilny widok LEADER / ADMIN również pokazuje bieżące wartości jako ilość, czas i procent normy.

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

- PICK ilość,
- PICK czas,
- PICK %,
- PAK ilość,
- PAK czas,
- PAK %,
- PICK/PAK ilość,
- PICK/PAK czas,
- PICK/PAK %.

Mobilny panel LEADER / ADMIN ma analogiczny wybór osób i zakres dat oraz pokazuje dla każdej osoby trzy zestawy ilość/czas/procent.

Etap 10 nie podłącza jeszcze tych akcji do żywego endpointu. Obsługa rzeczywistych agregacji za wskazany okres jest wejściem do Etapu 11.

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

## Testy końcowe po rozszerzeniu norm

### Validate Stage 10 frontend

Run: `34124229858`
Wynik: PASS

Sprawdzone m.in.:

- składnia JS,
- role,
- 10 procesów,
- BIURO niedostępne dla WORKER,
- brak demonstracyjnego SORTOWANIA w UI,
- dwa okresy norm WORKER: dzień + bieżący miesiąc,
- PICK / PAK / PICK-PAK w układzie ilość / czas / procent,
- pełny podgląd pracownika dla lidera,
- raport okresowy dla jednego, wielu lub wszystkich pracowników,
- przekazywanie `employeeIds`, `from`, `to`,
- brak sekretów.

### Validate frontend

Run: `34124229836`
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

Etap 10 jest technicznie gotowy po rozszerzeniu norm. Następnym krokiem jest publikacja odświeżonego izolowanego `/stage10-preview/` i wizualny odbiór użytkownika.

Dopiero po jawnym odbiorze Etapu 10 należy oznaczyć go jako ODEBRANY i rozpocząć Etap 11 — integrację docelowych frontendów z backendem V2.
