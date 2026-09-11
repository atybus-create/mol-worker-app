# Etap 7 — publikacja wersji 0.7.0

Data: 2026-09-05, kontrola publikacji 19:37–19:39 UTC. Status: backend i frontend V2 opublikowane; DO ODBIORU użytkownika z ograniczeniami E2E. Etap 8 nie został rozpoczęty.

## Dokładna wersja

Commit wydania: `74d3b80d66fa185accfcfb8f800e8650e9fd9683`. Gałąź `codex/stage7-es-norms` przeniesiono na `main` bez wymuszania historii, po porównaniu z bazą `63c3f6faf0ac52151636be95c224ea5161cbf4b9`. Brak rozbieżnego commita main. Zmiany dotyczą V2, jej testów i dokumentacji oraz obsługi generatorów w CI; pliki aplikacji V1 pozostały bez zmian. Ten późniejszy commit dodaje tylko niniejszy protokół — nie zmienia kodu wydania.

Przed przeniesieniem: `Stage 7 verification` run `33987637744`, dokładny SHA wydania, SUCCESS.

## Wyniki na main

| Kontrola | Run | Job | Wynik |
|---|---:|---:|---|
| Stage 7 verification | 33987666287 | 101364111285 | SUCCESS |
| Stage 6 backend sync — korzystający już z generatora etapu 7 | 33987666298 | 101364111262 | SUCCESS |
| Deploy GitHub Pages | 33987666332 | 101364111366 | SUCCESS |
| Validate frontend — historyczny wspólny zestaw | 33987666293 | 101364111043 | FAILURE w Check browser CORS to n8n |

Sprawdzono wyniki kroków, nie wyłącznie uruchomienie workflowu. W Stage 7 verification przeszły testy źródeł, odtwarzalność eksportów i publiczne API/preflight. Zestaw obejmuje 276 numerowanych przypadków izolowanych oraz dodatkowe kontrole opisane w `stage-7-acceptance.md`. W Stage 6 backend sync przeszło odtworzenie aktualnego eksportu 76-węzłowej usługi, regresja i preflight V2 — nie cofnięto jej do generatora 61-węzłowego.

W Validate frontend przeszły składnia, kontrakt i izolacja V2, wymagane elementy interfejsu, logo i skan wskazanych sekretów testowych. Nieudany pozostaje historyczny krok CORS starego endpointu V1 `mol-app-config`, w którym wcześniejsza diagnostyka potwierdziła HTTP 500. W bieżącym przebiegu ponownie sprawdzono błąd tego kroku; nie wywodzimy z niego nowej diagnozy całej infrastruktury. Nie zmieniono V1 ani nie pominięto testu dla uzyskania zielonego statusu. Nie należy mówić, że wszystkie workflowy CI są zielone.

## Potwierdzenie paczki Pages

Pobrano artefakt `github-pages`, ID `9975651226`, z zakończonego sukcesem run `33987666332`, head SHA `74d3b80d66fa185accfcfb8f800e8650e9fd9683`. Wewnętrzny `artifact.tar` zawiera wersję 0.7.0 oraz odwołania do `norms.js?v=0.7.0` i `norms.css?v=0.7.0`.

Porównano bajty sześciu plików artefaktu z lokalnie zweryfikowanymi źródłami: index, attendance, norms JS/CSS, manifest i health — wszystkie zgodne. SHA-256:

| Plik | SHA-256 |
|---|---|
| v2/index.html | 8846fdd270b3ed73bd0a5c47a0fd022f98e3851185092c4f58d33f03c87c1182 |
| v2/attendance.js | 3c0bd6b979831d85ee0c6d5421c7b6f16118c1e76d3bd4df7590003480114e8c |
| v2/norms.js | 4ba879a60eda2ee21443191656feed8e04d50bf4d569a4b31d6f53e89190f5a1 |
| v2/norms.css | bbadd25f19620755fa3ce2f2caec3f89f1ca91d362b3dc071fea9a5bcaa7f58f |
| backend/v2/manifest.json | d49b9e670ae49bb9e8d253babcb025700064c6c28761f16b8347dc6c539fb491 |
| backend/v2/workflows/health.json | 81ecf1ca3e06bf629dbbac562c09d8940ab63e2b9709d4b59c8a9c001d00e933 |

To sprawdzenie statycznego artefaktu przekazanego do udanej publikacji Pages. Nie jest testem wizualnym strony ani zalogowanej sesji.

## Backend po publikacji

GET health 2026-09-05 19:37:29 UTC: HTTP 200, service MOL_APP_V2, version 0.7.0, stage 7, environment test, core READY, database ONLINE, writes_enabled=true. Opublikowana wersja health: `fca803c6-7984-4c26-a108-f593c4e958d8`. Health nie dowodzi kompletności danych produkcyjnych ES.

Końcowy odczyt trzech blokad wykazał pustego właściciela command-writer, auth-writer i norm-drive-writer. Zwykłe zajęcie command-writer podczas pracy schedulera zakończyło się jego zwolnieniem; nie przejmowano blokady przez upływ lease. W końcowej kontroli nie zmieniano godzin pracy ani nie wykonywano komend Moniti. Obowiązuje świeży snapshot obecności v36/v25/v15 z `stage-7-evidence.json`, nie stare v31/v20/v10.

## Granica odbioru — bez zmian

Implementacja 7.1–7.6 oraz automatyczna część 7.7 są opublikowane. Sobotni ES nie zawiera trzech testowanych operatorów: ES_OPERATOR_NOT_FOUND / UNAVAILABLE, procenty puste, bez fikcyjnego 0%. Dodatnia produkcja rzeczywistych kont nie została potwierdzona. Nowy zalogowany E2E trzech ról oraz wizualny test przeglądarki pozostają niezaliczone; narzędzia blokowały ich wykonanie i nie obchodzono ograniczeń. Testy izolowane i publiczne 401 nie zastępują tych prób.

Użytkownik może wykonać odczytowy odbiór ekranu norm oraz porównać dwie zakładki raportu V2. Test rzeczywistych przyrostów, granic procesów i trzech ról pozostaje jawnym punktem do domknięcia. Nowy zakres zapisów czasu pracy lub data Moniti wymagają nowej zgody. Publikacja nie oznacza odbioru przez użytkownika i nie otwiera automatycznie etapu 8.

Materiały do kontynuacji: `stage-7-acceptance.md`, `stage-7-evidence.json`, `stage-7-resume-checkpoint.md`, `backend/v2/manifest.json`. `stage-7-progress.md` zachowuje historyczny zapis prac; niniejszy protokół i rejestr odbiorów są nowszym punktem odniesienia.
