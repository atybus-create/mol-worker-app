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

## Podgląd zespołu

W widoku LEADER / ADMIN lista pracowników pokazuje teraz równolegle:

- status pracy,
- aktualny proces,
- obecność,
- PICK dzisiaj,
- PAK dzisiaj,
- procent normy,
- alerty.

Szybki podgląd wybranego pracownika pokazuje PICK i PAK jako osobne wartości dzienne obok normy i obecności.

Te same dzienne liczniki są obecne w menedżerskim widoku mobile.

## Raportowanie wielu pracowników

Panel raportów WWW obsługuje dowolny wybór wielu pracowników:

- checkbox dla każdej osoby,
- `Zaznacz wszystkich`,
- `Wyczyść`,
- licznik zaznaczonych,
- `Generuj raport dla zaznaczonych`,
- podsumowanie wybranej grupy,
- osobne wiersze pracowników,
- PICK / PAK / obecność / norma,
- zakres dat,
- przygotowane akcje CSV i XLSX przekazujące dokładną listę `employeeIds`.

Mobilny panel LEADER / ADMIN ma analogiczny multi-select i raport dla zaznaczonych osób.

Etap 10 nie podłącza jeszcze tych akcji do żywego endpointu. Obsługa żądania raportowego dla wielu `employee_id` jest wejściem do Etapu 11.

## Pozostałe powierzchnie UI

Gotowe są:

- logowanie mobile,
- logowanie WWW,
- dashboard WORKER,
- START / STOP pracy,
- wybór / zmiana procesu,
- norma i czas bez procesu,
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

## Testy końcowe

Commit technicznego closeoutu UI: `0a788a8bfc7b323f233e0a9be8a22925fac0a4d8`.

### Validate Stage 10 frontend

Run: `34120893120`
Wynik: PASS

Sprawdzone m.in.:

- składnia JS,
- role,
- 10 procesów,
- BIURO niedostępne dla WORKER,
- brak demonstracyjnego SORTOWANIA w UI,
- wymagane ekrany,
- PICK / PAK w podglądzie zespołu,
- multi-select raportów,
- przekazywanie `employeeIds`,
- brak sekretów.

### Validate frontend

Run: `34120893114`
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

Etap 10 jest technicznie gotowy. Następnym krokiem jest publikacja odświeżonego izolowanego `/stage10-preview/` i wizualny odbiór użytkownika.

Dopiero po jawnym odbiorze Etapu 10 należy oznaczyć go jako ODEBRANY i rozpocząć Etap 11 — integrację docelowych frontendów z backendem V2.
