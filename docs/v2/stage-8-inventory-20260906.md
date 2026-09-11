# Etap 8 - inwentaryzacja 2026-09-06

Uzytkownik zlecil inwentaryzacje i kontynuacje wdrozenia. Etap 7 ma nadal otwarte testy ES/procentow/E2E w #20. Zgoda na prace nad etapem 8 nie jest odbiorem etapu 7.

## Stan zastany

Main i codex/stage8-alerts-messages: 473191ca132198fc20e952f8e488788f155c55b0. Test dostepu GitHub na osobnej galezi zakonczyl sie sukcesem; nie wymaga zmian ustawien uzytkownika.

- 8.1: istnieja backup, konfiguracja OFF/HOLD; progi, ACK regul i polling null.
- 8.2: opublikowane COMM RECORD WRITER TJiDDKw10Ue3UKWO (b03f92a0-51ee-4fa0-855c-bca747245959) i COMM BATCH SERVICE J3qIFff05cYGDW7C (8e82e176-249e-48a9-b1de-29fc6bbf3aab). Live ma limit 100; kandydat v4 ma 202 rekordy. Dwie tabele COMM istnieja; tylko dwa techniczne EVENT z probe, brak PREPARED.
- 8.3-8.4: API, historia i interfejs przygotowane w pakiecie v4; nieopublikowane.
- 8.5: NO_PROCESS przygotowany i testowany lokalnie, brak schedulera i adaptera danych live.
- 8.6-8.12: nadal otwarte, nie uznawac za wdrozone.

Pakiet v4: integralnosc ZIP oraz 70 sum SHA256 PASS. Ponowiona lokalna regresja: 588 numerowanych przypadkow PASS; nie jest to E2E.

## Kolejnosc dalszych prac

1. Zapisac brakujace zrodla i testy w galezi etapu 8, odtworzyc eksporty w CI.
2. Uzgodnic kod 8.2 z opublikowanym grafem; przetestowac replay, limit, lock i recovery bez czasu pracy/Moniti.
3. Publikowac API 8.3-8.4 dopiero po weryfikacji autoryzacji i zaleznosci, zachowac OFF/HOLD do kontrolowanego uruchomienia.
4. Zbudowac adapter/scheduler 8.5, nastepnie pozostale elementy #21.

W tej fazie nie wysylac historycznej kolejki, nie ustawiac arbitralnie progow, nie przenosic zgody na Moniti z 2026-09-05. V1 i dane czasu pracy poza zakresem zmian. Raportowac rzeczywisty zapis, test i publikacje oddzielnie.
