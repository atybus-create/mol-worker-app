# Etap 4 — logowanie i sesje V2

Status: WDROŻONY — DO ODBIORU. Backend, testy automatyczne, publikacja oraz pełny cykl w przeglądarce PASS. Potwierdzono logowanie atybus, odświeżenie, wylogowanie, ponowne odświeżenie oraz błędne hasło. Etap 5 nie został rozpoczęty.

## Zakres

- Osobne endpointy POST auth-login, GET auth-session, POST auth-logout i formularz `/v2/`.
- Konto `atybus` przygotowane w tabeli V2 z zachowaniem identyfikatora i roli z V1. Bez migracji pozostałych kont i bez modyfikacji V1.
- Losowy token 256-bitowy, sesja 12 godzin, bez automatycznego przedłużania. Backend odrzuca sesje wygasłe i unieważnione oraz nieaktywne konto. Rola odczytywana z tabeli pracowników.
- Token przechowywany w sessionStorage (odświeżenie tej samej karty zachowuje sesję; brak obietnicy logowania po zamknięciu przeglądarki). Nie zapisujemy hasła w przeglądarce.
- Wylogowanie potwierdzone dopiero po odpowiedzi backendu. Awaria sieci nie daje fałszywego komunikatu sukcesu; można ponowić wylogowanie.
- Ochrona przed podwójnym kliknięciem i spóźnioną odpowiedzią. Nazwa pracownika wstawiana przez textContent.

## Bezpieczeństwo i spójność

Hasła: PBKDF2-HMAC-SHA256, 600000 iteracji, osobna losowa sól 128-bitowa. Implementacja `@noble/hashes` 2.0.1, licencja MIT w `backend/v2/auth/LICENSE.noble`. Adapter środowiska n8n zmienia wyłącznie alokację klonów HMAC/SHA256 na jawne konstruktory; nie zmienia obliczeń. Weryfikacja zgodności z niezależnym `node:crypto` obejmuje poprawne/błędne hasło, Unicode i długi ciąg.

Tabela sesji przechowuje wyłącznie SHA256 tokenu. Powtórzenie logowania z tym samym request_id i poprawnym hasłem odtwarza identyczną odpowiedź z `MOL_V2_AUTH_RECEIPTS` zaszyfrowanej AES-256-GCM. Klucz jest oddzielnym poświadczeniem n8n, nie polem tabeli ani kodem w repozytorium. Receipt powstaje przed sesją; ponowienie może dokończyć przerwany zapis. Istniejąca wygasła/unieważniona sesja nigdy nie jest reaktywowana. Wylogowanie jest idempotentne dla sesji; data unieważnienia pozostaje niezmieniona.

Próby logowania: 5 nieudanych prób w 15-minutowym oknie na konto; nieznane loginy współdzielą osobny limit. Poprawne logowanie zeruje licznik. Limity są trwałe w Data Tables. To nie zastępuje docelowej ochrony infrastruktury przed DDoS.

Zapisy auth serializuje atomowo przejmowana blokada `auth-writer`. Przy konflikcie 409 AUTH_BUSY, frontend ponawia z tym samym request_id. Test czterech faktycznie równoczesnych żądań: jeden sukces, trzy AUTH_BUSY, dokładnie jeden rekord sesji. Logowanie trwa około 4 sekund na obecnym n8n; przed produkcją potrzebny test obciążenia dla docelowej liczby pracowników.

Workflowy auth nie zapisują danych wykonań sukcesów, błędów ani testów ręcznych. Error Handler przechowuje jedynie zanonimizowany błąd i identyfikator wykonania oraz zwalnia blokadę jego właściciela. Po awarii całego procesu n8n blokadę zwalnia operator dopiero po potwierdzeniu zakończenia wykonania — tak samo jak w rdzeniu etapu 3.

CORS ograniczony do origin aplikacji; odpowiedzi `Cache-Control: no-store`. CSP frontendu nie dopuszcza skryptów inline ani zewnętrznych zależności. Dane ani tokeny nie trafiają do URL.

## Testy i granice

Wyniki bez haseł i tokenów: `stage-4-evidence.json`. Testy lokalne: `scripts/test-v2-auth.cjs`, `scripts/test-v2-password.cjs`, walidacja kontraktu i izolacji backendu. Workflow diagnostyczny jest wyłączony.

19 tabel V2: 17 z etapu 3 plus AUTH_LIMITS i AUTH_RECEIPTS. Czas pracy, Moniti, Drive, ES pozostają niewłączone. Rozszerzenie kontraktu o auth-session służy tylko przywracaniu tożsamości; nie udaje przyszłego worker-status ani nie zwraca fikcyjnych norm.

Przed przełączeniem produkcyjnym: migracja pozostałych kont, wymiana słabego hasła testowego, polityka retencji starych sesji/zaszyfrowanych receipts, test obciążenia i pełna kontrola ról na kolejnych endpointach. Nie są to funkcje wdrożone w etapie 4.

## Odbiór użytkownika

1. Otwórz https://atybus-create.github.io/mol-worker-app/v2/ i sprawdź wersję 0.4.0.
2. Zaloguj się `atybus` dotychczasowym hasłem. Sprawdź imię i rolę Administrator.
3. Odśwież tę samą kartę — ekran ma pozostać zalogowany po sprawdzeniu backendu.
4. Wyloguj się i odśwież — ma pozostać formularz logowania.
5. Wprowadź błędne hasło — powinien pojawić się komunikat bez dostępu do konta.

Po Twoim potwierdzeniu przechodzimy dopiero do etapu 5.
