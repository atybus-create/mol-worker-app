# Etap 6 — domknięcie uprawnień procesów, 2026-09-05

Status: poprawka wdrożona w n8n; kod, generator, eksport i manifest zsynchronizowane na gałęzi domknięcia. Odbiór użytkownika pozostaje otwarty. Etap 7 nie rozpoczęty. Ten protokół uzupełnia historyczny `stage-6-acceptance.md`, nie zastępuje go fikcyjnym ponowieniem wcześniejszych testów.

## Wdrożona poprawka

BIURO wymaga roli LEADER lub ADMIN oraz wpisu na efektywnej liście dozwolonych procesów. WORKER nie uzyskuje BIURO nawet po omyłkowym dodaniu go do swojej listy. Kontrola obowiązuje dla katalogu i nowych operacji PROCESS_START/PROCESS_CHANGE, nie tylko w interfejsie. Lider odczytujący pracownika dostaje katalog pracownika; nie może sterować cudzym procesem.

Konfiguracja jest przechowywana w istniejącej tabeli `MOL_V2_CONFIG`, `scope=process_permissions`:

- `ALLOWED_PROCESSES_ROLE_WORKER`, `ALLOWED_PROCESSES_ROLE_LEADER`, `ALLOWED_PROCESSES_ROLE_ADMIN` — domyślne listy ról.
- `ALLOWED_PROCESSES_EMPLOYEE_<employee_id>` — indywidualna lista, zastępująca listę roli. `[]` oznacza brak dozwolonych nowych procesów, a nie powrót do uprawnień roli.

Wartość `value_json` jest tablicą kodów procesów. Sześć wdrożonych rekordów (trzy role i trzy konta odbiorowe) zapisano w `backend/v2/processes/permissions-config.json`. To snapshot, nie automat nadpisujący późniejsze decyzje administratora. Zmiana listy działa po następnym odczycie bez publikowania workflowu. Nadanie roli nadal odbywa się po stronie backendu, nigdy w żądaniu klienta.

**Jawna różnica względem literalnego pola ze specyfikacji:** nie dodano fizycznej kolumny `allowed_processes` do `MOL_V2_EMPLOYEES`. Schemat udostępnionego MCP odrzucił operację addColumn. Zastosowano istniejący wersjonowany magazyn konfiguracji, bez usuwania lub odtwarzania tabeli pracowników. Funkcjonalność indywidualnych list jest zaimplementowana; położenie danych jest inne.

Brak, błędny JSON, null lub zduplikowana konfiguracja blokuje nowy proces. Nie blokuje STATUS, wylogowania z procesu, STOP ani odzyskania uprzednio autoryzowanego zamrożonego planu. STATUS zachowuje obecność, aktywny proces i historię; zwraca pusty katalog oraz `process_permission_error=PROCESS_PERMISSION_CONFIG_INVALID`.

## Dowody testów

GitHub Actions `33977902727`, dokładny commit `59631dbcf72b5e2e3f79fee7c023052f553ce031`: SUCCESS. Domena procesów 41 przypadków, obecność 39, wygenerowany węzeł Decide 23. Przeszły także testy haseł, sesji, UI, kontraktu i izolacji 19 schematów/22 workflowów. Ponowne generowanie nie zmienia eksportu. Testy Decide używają wyłącznie fixture w pamięci; nie są testem zalogowanego API.

Walidacja n8n: 61 włączonych węzłów, 72 prawidłowe połączenia, 113 wyrażeń, 0 błędów. 13 ostrzeżeń dotyczy świadomego executeOnce na odczytach. Health: 200, 0.6.0, stage 6, READY/ONLINE. Publiczne START/CHANGE/LOGOUT bez sesji: 401 UNAUTHENTICATED, Cache-Control: no-store.

**Niewykonane w tym domknięciu:** nowy zalogowany test API trzech ról i pełny cykl w przeglądarce. Próba logowania została zatrzymana przez zabezpieczenie narzędzia. Nie obchodzono tej blokady. Nie wolno opisywać nowych testów jako live 403 WORKER / live sukces LEADER i ADMIN. Reguły te potwierdzają testy domeny i rzeczywistego wygenerowanego kodu; nowe potwierdzenie end-to-end pozostaje do wykonania przez użytkownika lub po przywróceniu dozwolonego testowania.

## Stan i bezpieczeństwo

Brak nowych zmian obecności: MOL004 CLOSED v31, MOL014 CLOSED v20, MOL015 CLOSED v10; Moniti/Drive SYNCED. Zero aktywnych procesów, zero RECOVERY_REQUIRED, zero niezakończonych ATTENDANCE_DRIVE. Obie blokady wolne. Trzy techniczne sesje `stage6-closeout-*` są unieważnione. Nie wykonano nowych zapisów do Moniti, nie zmieniono V1 ani jej danych. Nie skasowano audytu ani kolejki ATTENDANCE_DERIVED, której konsument należy do etapu 7.

Opublikowana usługa: `qPVmcfp6pUg3GbzH`, wersja `8a8a7d2b-f41a-472a-a7ab-78237dbac7a9`. Health: `sfoWeuiJBN2qvCRF`, wersja `c1d0d26e-5e25-41ba-88d6-5a5175740947`. Pozostałe referencje w manifeście zachowano. Backup repo: `backup/pre-stage6-closeout-20260905` przy `386ef2fb804ed6d85f11710d5ca76b967e0f7755`. Nie przywracać samego starego main bez odpowiedniego planu dla live i konfiguracji.

Przed przejściem do etapu 7 wymagany jest odbiór użytkownika, z jawnym potwierdzeniem zakresu testów i konfiguracji procesów. Publikacja kodu nie stanowi odbioru.
