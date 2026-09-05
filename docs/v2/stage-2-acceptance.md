# MOL App V2 — odbiór etapu 2

Etap 2 jest odebrany po zatwierdzeniu architektury, modelu domenowego i kontraktu API. Na tym etapie nie włączamy jeszcze zapisów V2.

## Ustalenia rekomendowane do akceptacji

- [ ] Stan obecności ma tylko `NOT_STARTED`, `OPEN`, `CLOSED`; awaria synchronizacji jest osobnym polem.
- [ ] V2 dostaje całkowicie osobne tabele `MOL_V2_*`; nie zapisuje do tabel V1.
- [ ] UI pobiera jeden wersjonowany snapshot i nie nadpisuje nowszych danych starszą odpowiedzią.
- [ ] Moniti jest opcjonalne. Gdy jest włączone, START/STOP/korekta są lokalnie zatwierdzane dopiero po potwierdzeniu Moniti.
- [ ] Awaria Drive nie blokuje pracy: zapis ma sukces lokalny i status `drive_sync=PENDING`.
- [ ] Awaria ES nie zeruje ani nie ukrywa ostatniej poprawnej normy; pokazuje jej świeżość.
- [ ] Zmiana procesu zamyka poprzedni i otwiera nowy atomowo; wylogowanie z procesu nie kończy pracy.
- [ ] `REOPEN` usuwa STOP przez kontrolowane przejście, tworzy audyt i nie uruchamia procesu.
- [ ] Hasła hashowane i rate-limit logowania są obowiązkowe przed przełączeniem produkcji.
- [x] Użytkownik zaakceptował limit własnej korekty pracownika 31 dni; starsze korekty wykonuje LEADER/ADMIN.
- [x] Użytkownik zaakceptował dodanie zatwierdzanych korekt z arkusza rozliczeniowego do Moniti i Data Tables, z aktualizacją raportu, statusem synchronizacji i historią zmian. Kontrakt: `drive-corrections.md`. Implementacja i test integracyjny pozostają do wykonania w kolejnych etapach.

## Test techniczny etapu 2

1. `openapi.json` jest poprawnym JSON-em OpenAPI 3.1.
2. Każda operacja zapisu ma obowiązkowy `request_id`.
3. Stan biznesowy i synchronizacja używają osobnych pól/enumeracji.
4. Ścieżki V2 mają własny prefiks i nie kolidują z V1.
5. Dokumenty nie przewidują żadnego zapisu V2 do tabel V1.

Po przejściu testu proszę o potwierdzenie etapu 2. Dopiero wtedy rozpocznie się etap 3: utworzenie rdzenia backendu i tabel V2.
