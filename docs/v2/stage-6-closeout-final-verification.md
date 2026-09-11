# Etap 6 - koncowa weryfikacja main, 2026-09-05

Uzupelnienie `stage-6-closeout-20260905.md` i `stage-6-closeout-evidence.json`. Poprawka i dokumentacja trafily na main w `693c6d1669b8311d425133debfff253b7919691d`. Commit `20bb334448b940f9de9626df7faa000b786a1bb2` dodal wylacznie osobny test publicznego preflight V2 do workflow CI; nie zmienial aplikacji ani backendu live.

## Potwierdzone na main

GitHub Actions `Stage 6 backend sync`, run `33978139866`, job `101338371457`, commit `20bb334448b940f9de9626df7faa000b786a1bb2`: SUCCESS. Odczytano log wykonania, nie tylko status.

- 41 przypadkow domeny procesow: PASS.
- 39 przypadkow obecnosci: PASS.
- 23 przypadki rzeczywistego wygenerowanego Decide na izolowanych danych w pamieci: PASS.
- Hasla, sesje, UI, kontrakt 23 endpointow, izolacja 19 schematow i 22 workflowow: PASS.
- Ponowne generowanie eksportu na main: brak roznic, PASS.
- SHA-256 wygenerowanego Decide: `8dcdac4927dc6459ef3667360abfe4bf34d10acb518590619543d7fbd19bea86`. To hash kodu w CI, nie osobno obliczony hash live.

Test publiczny 2026-09-05 16:31:47-16:31:49 UTC: health V2 HTTP 200. Preflight OPTIONS dla auth-login, attendance-status, process-start, process-change i process-logout: wszystkie HTTP 204, dozwolony origin `https://atybus-create.github.io`, wlasciwe metody GET/POST oraz naglowki authorization i content-type. Test nie wysylal hasel, tokenow ani polecen zmiany obecnosci/procesow. Nie jest to zalogowany test end-to-end.

## Oddzielny problem V1 - nie naprawiano ani nie ukrywano

Wspolny workflow `Validate frontend` nie jest caly zielony. Run `33978047300` dla `693c6d1` zakonczyl sie bledem tylko w kroku `Check browser CORS to n8n`: stary endpoint `/webhook/mol-app-config` (V1) zwrocil HTTP 500 bez access-control-allow-origin. Wszystkie poprzednie kroki, w tym testy V2 i kontrola sekretow, przeszly. Nastepny run `33978139832` dla `20bb334` ponownie nie przeszedl tego samego kroku. Nie wyciagamy z tego wniosku o przyczynie ani o dzialaniu calej V1.

Osobny test pieciu endpointow V2 przeszedl. Nie usunieto, nie oslabiono i nie oznaczono jako ignorowanego dotychczasowego testu V1. Zgodnie z zakresem nie zmieniano workflowow V1 ani jej danych. Deploy GitHub Pages dla commitu z poprawka `693c6d1`, run `33978047295`: SUCCESS.

## Granice odbioru

Opublikowana usluga V2 pozostaje `qPVmcfp6pUg3GbzH`, activeVersionId `8a8a7d2b-f41a-472a-a7ab-78237dbac7a9`. Zsynchronizowano w manifeście usluge i health; inne identyfikatory wersji w manifeście sa wczesniejszym snapshotem, nie pelnym nowym audytem instancji.

Indywidualne listy procesow dzialaja przez rekordy `ALLOWED_PROCESSES_EMPLOYEE_*` w MOL_V2_CONFIG, z domyslnymi listami rol. Nie dodano fizycznej kolumny allowed_processes do EMPLOYEES. BIURO jest dodatkowo bezwarunkowo ograniczone do LEADER/ADMIN.

Nowy zalogowany test trzech rol i pelny cykl w przegladarce nie zostaly wykonane: wywolanie z haslem zablokowalo zabezpieczenie narzedzia. Nie zaliczamy fixture ani preflight jako takiego testu. Trzy techniczne sesje domkniecia odczytano ponownie i potwierdzono revoked_at. Obie blokady byly wolne, aktywnych procesow 0, niezakończonych ATTENDANCE_DRIVE (status inny niz DONE) 0. Obecnosc pozostala CLOSED v31/v20/v10; nowych zapisow Moniti nie wykonywano.

Status etapu 6: wdrozenie poprawki i automatyczna weryfikacja zakonczone; DO ODBIORU uzytkownika z podanymi ograniczeniami. Etap 7 nie rozpoczety.
