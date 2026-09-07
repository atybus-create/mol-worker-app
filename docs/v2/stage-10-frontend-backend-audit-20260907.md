# MOL App V2 — audyt wymagania → frontend → backend

Data: 2026-09-07
Status Etapu 10: **NIEODEBRANY / po audycie kompletności**

## Zakres audytu

Porównano:

1. specyfikację źródłową MOL App V2 i pakiet przekazania,
2. ustalenia z rozmów projektowych do 2026-09-07,
3. aktualny docelowy frontend `stage10/`,
4. zaakceptowane kontrakty Stage 7 / Stage 8 / Stage 9,
5. aktywne, opublikowane workflowy n8n V2.

Nie wykonywano zapisów do Moniti ani zmian backendu. V1 pozostaje nietknięta. Automatyczne alerty pozostają OFF/HOLD.

## Ważna korekta procesu MAGAZYN

Proces `MAGAZYN` jest zwykłym procesem operacyjnym. Kliknięcie kafla **Magazyn** natychmiast rozpoczyna albo zmienia aktywny proces na `MAGAZYN`, dokładnie tak jak przy pozostałych procesach.

Dopiero po aktywacji procesu pokazują się dwa **opcjonalne** narzędzia:

- Terminy – aplikacja magazynowa,
- Batch reader.

Pracownik nie musi otwierać żadnego z nich. Otwarcie narzędzia nie rozpoczyna procesu i nie zmienia procesu — `MAGAZYN` jest już aktywny.

## Macierz pokrycia

| Funkcjonalność | Frontend Stage 10 | Backend V2 | Wniosek |
| --- | --- | --- | --- |
| Login / sesja / logout | jest | jest | zgodne |
| Role WORKER / LEADER / ADMIN | jest | jest | zgodne; backend jest źródłem uprawnień |
| WORKER bez WWW | jest | jest | zgodne |
| START dnia | jest, poprawione na `MONITI Rozpocznij pracę` | jest | zgodne |
| STOP dnia | jest, poprawione na `MONITI Zakończ pracę` | jest | zgodne |
| NOT_STARTED / OPEN / CLOSED | komplet powierzchni UI | jest | integrować w Stage 11 |
| `Cofnij zakończenie dnia` | dodane | `attendance-reopen` istnieje | zgodne |
| `Zmień godziny pracy` | dodane; formularz + zasada 31 dni | `attendance-correct` istnieje | zgodne, politykę 31 dni egzekwować backendowo |
| Wybór procesu | jest | `process-start` / `process-change` | zgodne |
| Zmiana procesu atomowo | frontend wysyła jedną intencję zmiany | backend ma `process-change` | zgodne |
| `WYLOGUJ Z PROCESU` | jest | `process-logout` | zgodne |
| pełne 10 procesów | jest | katalog/config V2 | zgodne; WORKER bez BIURO |
| MAGAZYN + 2 narzędzia | poprawione: proces aktywny od kliknięcia, narzędzia opcjonalne | proces obsługuje backend; linki nie potrzebują backendu MOL | zgodne |
| aktywny proces: start / timer / wykonanie / zmiana / logout / norma | komplet powierzchni UI | dane bazowe są w attendance/process/norm | zgodne po integracji |
| norma dzienna | jest | jest | zgodne |
| norma miesięczna MTD | jest | jest | zgodne |
| PAK: łącznie / do normy / poza / czas / % | jest | częściowo: snapshot ma eligible/outside/czas/%; jawny total warto wystawić | rozszerzyć kontrakt Stage 11 o jawne total |
| PICK: łącznie / do normy / poza / czas / % | jest | jak wyżej | rozszerzyć kontrakt Stage 11 o jawne total |
| PICK/PAK 1:3 | jest | logika norm jest zgodna | zgodne |
| agregacja kilku osób | poprawiona na ważoną, bez średniej z procentów | brak gotowego batch-performance API | **backend gap Stage 11** |
| czasy wszystkich procesów / międzyprocesowy / freshness | dodane | baza istnieje w process sessions / no_process / norm freshness | integrować w Stage 11 |
| komunikaty WORKER: nowe / archiwum / SHOWN / ACK | jest | COMM LIST / SHOWN / ACK istnieją | zgodne |
| komunikat LEADER do 1 / wielu / wszystkich OPEN | jest WWW i mobile | `leader-message` + recipients istnieją | zgodne |
| wymagane ACK | jest | jest | zgodne |
| historia komunikatów wybranej osoby + paginacja | dodana | komunikacja ma stronicowaną historię | zgodne po integracji |
| marker aktywności aplikacji przy odbiorcy | dodany w UI jako demo | brak potwierdzonego pola device/app activity w publicznym kontrakcie | **backend gap Stage 11** |
| monitoring zespołu | jest | `leader-team` istnieje | częściowo zgodne |
| START pracownika w monitorze | dodany | attendance.start_at istnieje | zgodne po integracji |
| bieżący proces i jego czas | jest | process.start_at + process_seconds istnieją | zgodne po integracji |
| czas międzyprocesowy | jest | no_process_seconds istnieje | zgodne po integracji |
| PICK/PAK dziś + norma | jest | norm snapshot istnieje | zgodne po integracji |
| aktywność aplikacji w monitorze | dodana jako demo | brak publicznego pola | **backend gap Stage 11** |
| aktywne alerty w monitorze | powierzchnia UI istnieje | komunikacja istnieje, ale leader-team nie wystawia listy/licznika aktywnych alertów | **backend gap Stage 11** |
| błąd/brak mapowania ES widoczny, osoba nie znika | dodane w UI | leader-team nie wystawia jawnego `es_mapping_status` | **backend gap Stage 11** |
| ADMIN wykluczony z operacyjnego zespołu, jeśli nie pracuje | frontend może to obsłużyć | aktualny leader-team zwraca wszystkich aktywnych użytkowników | **backend gap / poprawić Stage 11** |
| historia pracownika: dni / procesy / normy | jest powierzchnia | `employee-history` ma attendance, process sessions i norm | częściowo zgodne |
| historia START / STOP / REOPEN / korekt | dodana powierzchnia | `employee-history` nie łączy obecnie pełnych WORK_EVENTS i historii korekt | **backend gap Stage 11** |
| raport czasu pracy | osobny ekran | `report-attendance` istnieje | częściowo zgodne |
| raport czasu: 1 / wielu / wszyscy | jest | backend obsługuje pojedynczy `employee_id` albo wszystkich, nie listę `employee_ids[]` | **backend gap Stage 11** |
| raport czasu: START / STOP / obecność | jest | jest | zgodne |
| raport czasu: czasy procesów / międzyprocesowy | dodane | aktualny report-attendance ich nie zwraca | **backend gap Stage 11** |
| raport czasu: korekty / sync / status filter | dodane | sync jest częściowo; korekty, procesy i status filter wymagają rozszerzenia | **backend gap Stage 11** |
| raport wydajności za dowolny okres | jest | aktualny report-attendance zwraca głównie procenty, nie pełne ilości/czasy do raportu wydajności | **nowy/rozszerzony performance report Stage 11** |
| CSV / XLSX | jest | report-export istnieje | rozszerzyć eksport równolegle z nowymi filtrami/kolumnami |
| korekty lidera: kolejka / approve / reject | jest | jest | zgodne |
| użytkownicy: lista / create / reset / aktywacja | jest | jest | zgodne z rolami Stage 9 |
| globalna Historia operacji admin/leader | jest | brak osobnego publicznego audit endpointu | **backend gap Stage 11 albo usunąć ekran**; decyzja: zachować i dodać endpoint |
| logo ESTYL | poprawione: używany zamrożony asset V1 `logo.js` | n/d | zgodne |
| wersja aplikacji na loginie | dodana | n/d | zgodne |
| przypomnienie PIN | usunięte | brak takiego kontraktu backendu | usunięto osieroconą funkcję |
| automatyczne alerty | UI przygotowane | workflowy istnieją, consumer/rules OFF/HOLD | **nie aktywować** |
| APK: push / dźwięk / wibracja / ekran / deep-link | jeszcze nie Stage 10 | brak kompletnej warstwy device/push | realizować przed pilotem magazynowym zgodnie z decyzją użytkownika |

## Błąd wykryty w trakcie audytu — agregacja norm

W demonstracyjnym raporcie lidera wynik grupy był liczony jako średnia procentów pracowników. To jest niezgodne z modelem domenowym.

Poprawny wynik grupy i okresu musi być liczony z sum liczników i mianowników:

- `PAK% = SUM(eligible_PAK) / (SUM(hours_PAK) × 70) × 100`,
- `PICK% = SUM(eligible_PICK) / (SUM(hours_PICK) × 210) × 100`,
- `PICK/PAK% = (SUM(eligible_PAK) + SUM(eligible_PICK)/3) / ((SUM(hours_PAK)+SUM(hours_PICK)) × 70) × 100`.

Nigdy nie liczymy średniej z gotowych procentów dziennych ani procentów pracowników. Frontend Stage 10 został zabezpieczony przed tym błędem; backend Stage 11 ma zwracać agregat wyliczony w ten sam sposób.

## Obowiązkowe rozszerzenia backendu w Etapie 11

1. **Leader team**
   - `app_activity` / last heartbeat,
   - aktywne alerty,
   - jawny status mapowania ES,
   - operacyjna lista osób pracujących; ADMIN poza listą, jeśli nie ma otwartego dnia.

2. **Employee history**
   - WORK_EVENTS: START / STOP / REOPEN / PROCESS / CORRECTION,
   - historia korekt,
   - historia komunikacji lub jednoznaczne połączenie z COMM history.

3. **Work-time report**
   - `employee_ids[]` dla dowolnie zaznaczonej grupy,
   - procesy i czasy procesów,
   - czas międzyprocesowy,
   - korekty,
   - status/synchronizacja,
   - filtr statusu,
   - eksport zachowujący dokładnie te filtry.

4. **Performance report**
   - pracownicy: jeden / wiele / wszyscy,
   - dowolny zakres dat,
   - PICK i PAK: total / eligible / outside / seconds,
   - PICK/PAK w j.n. 1:3,
   - ważone procenty z sum liczników/mianowników,
   - freshness/coverage/source_error,
   - eksport CSV/XLSX.

5. **Norm/worker status**
   - wystawić jawne `total` obok istniejących eligible/outside, aby frontend niczego nie rekonstruował na podstawie założeń.

6. **Audit API**
   - publiczny, autoryzowany read endpoint dla ekranu `Historia operacji`, bez sekretów i danych hasła.

## APK przed pilotem magazynowym

Przed pierwszym testem z realnymi pracownikami musi powstać aplikacja Android z:

- rejestracją urządzenia/push tokena,
- powiadomieniem w tle,
- dźwiękiem firmowym,
- wibracją,
- heads-up / zachowaniem na zablokowanym ekranie w granicach Androida,
- deep-linkiem do właściwego komunikatu,
- przywróceniem sesji i aktywnego procesu po restarcie aplikacji/telefonu,
- testami foreground/background/locked/restart/network/DND/battery optimization na urządzeniach magazynowych.

## Decyzja audytu

Etapu 10 nie wolno zamykać tylko dlatego, że wygląd jest zaakceptowany. Przed odbiorem muszą przejść testy nowo dodanych powierzchni i regres całego frontendu.

Etap 11 nie może polegać wyłącznie na „podpięciu fetchy”. Musi również domknąć wymienione wyżej luki kontraktów backendowych. Dopiero wtedy frontend będzie miał pełne, autorytatywne źródło danych dla każdej funkcji.
