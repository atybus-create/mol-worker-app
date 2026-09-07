# MOL App V2 — Etap 9 closeout

Data: 2026-09-07
Status: ODEBRANY / ACCEPTED

## Zakres końcowy

Etap 9 obejmuje działający backend oraz testowy frontend panelu LEADER/ADMIN dla:

- bieżącego widoku zespołu,
- historii pracownika,
- raportu obecności i norm,
- eksportu CSV/XLSX,
- listy użytkowników,
- tworzenia użytkowników z kontrolą roli,
- resetu hasła z unieważnieniem sesji,
- aktywacji/dezaktywacji kont,
- kolejki korekt czasu pracy,
- akceptacji i odrzucania korekt.

Frontend używany podczas odbioru Etapu 9 pozostaje frontendem testowym. Nie jest docelowym interfejsem produkcyjnym. Docelowy interfejs jest zakresem Etapu 10.

## Uprawnienia

### WORKER

- brak dostępu do panelu lidera,
- brak dostępu do cudzych danych,
- brak administracji użytkownikami,
- docelowo logowanie tylko w aplikacji mobilnej.

### LEADER

- dostęp do panelu WWW,
- widok wszystkich aktywnych pracowników niezależnie od `leader_id`,
- historia i raporty pracowników,
- zatwierdzanie/odrzucanie korekt,
- tworzenie wyłącznie kont WORKER,
- reset hasła WORKER oraz własnego,
- aktywacja/dezaktywacja wyłącznie WORKER.

### ADMIN

- pełny zakres panelu WWW,
- tworzenie WORKER/LEADER/ADMIN,
- reset hasła dowolnego użytkownika,
- aktywacja/dezaktywacja innych kont,
- samodezaktywacja zablokowana.

## Regres i dowody techniczne

Przed closeout ponownie zwalidowano główne workflowy Stage 9:

- `MOL // APP V2 // LEADER READ SERVICE` — valid,
- `MOL // APP V2 // USER ADMIN SERVICE` — valid,
- `MOL // APP V2 // USER STATUS SERVICE` — valid,
- `MOL // APP V2 // CORRECTION QUEUE SERVICE` — valid,
- `MOL // APP V2 // PASSWORD HASH SERVICE` — valid,
- `MOL // APP V2 // SHEET CORRECTION APPROVAL` — valid.

Publiczne bramki administracyjne zostały ponownie sprawdzone bez sesji. Endpointy panelu lidera, listy użytkowników, tworzenia użytkownika, aktywacji/dezaktywacji, kolejki korekt i odrzucenia korekty zwracają `401 UNAUTHENTICATED`; nie ma anonimowego dostępu do funkcji Stage 9.

Wcześniej w ramach implementacji Etapu 9 wykonano pełne E2E obejmujące:

- utworzenie tymczasowego WORKER,
- logowanie hasłem startowym,
- reset hasła,
- odrzucenie starego hasła,
- poprawne logowanie nowym hasłem,
- aktywację/dezaktywację konta i odwołanie sesji,
- kolejkę korekt PENDING → REJECTED,
- blokadę zatwierdzenia odrzuconej niezmienionej propozycji,
- powrót propozycji do CHANGED po zmianie payloadu w arkuszu,
- ponowne dopuszczenie preview po zmianie payloadu.

Dane syntetyczne i sesje użyte w testach zostały usunięte.

## Bezpieczeństwo i ograniczenia

- V1 nie została przebudowana.
- Nie rozszerzono zakresu realnych zapisów Moniti.
- Automatyczne alerty komunikacyjne pozostają wyłączone / HOLD.
- Odrzucenie korekty jest autorytatywne również dla istniejącej ścieżki zatwierdzania.
- Operacje administracyjne używają blokady `user-admin-writer`.
- Operacje korekt używają współdzielonej blokady `auth-writer`.

## Odbiór użytkownika

Użytkownik obejrzał panel Etapu 9 w środowisku testowym i 2026-09-07 potwierdził, że wygląda poprawnie, po czym zlecił domknięcie Etapu 9 i przejście do Etapu 10.

Etap 9 jest od tego momentu zamrożonym punktem odniesienia funkcjonalnego. Dalsze zmiany wyglądu są realizowane w Etapie 10 bez przepisywania zaakceptowanej logiki backendu, chyba że test integracyjny ujawni konkretny błąd.

## Następny etap

Etap 10: docelowy frontend V2.

Dwa interfejsy na jednym backendzie:

1. mobilny WORKER — dla telefonów magazynowych,
2. WWW LEADER/ADMIN — dla liderów i administratorów.

Oba mają używać wspólnego design systemu i stylistyki zaakceptowanej na wizualizacjach 2026-09-07.
