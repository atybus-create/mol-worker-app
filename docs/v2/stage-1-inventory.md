# MOL App V2 — etap 1: zamrożenie i inwentaryzacja

Data wykonania: 2026-09-05  
Status: gotowe technicznie, oczekuje na odbiór użytkownika

## Punkt powrotu V1

- Repozytorium: `atybus-create/mol-worker-app`
- Commit produkcyjny V1: `238db4500a6ddd7aae36c098a5d5837694f129f2`
- Tag rollbacku: `v1-freeze-2026-09-05`
- Produkcyjny frontend V1: `https://atybus-create.github.io/mol-worker-app/`
- V1 pozostaje aktywna do zatwierdzonego przełączenia w etapie 12.

## Środowisko V2

- Frontend testowy: `https://atybus-create.github.io/mol-worker-app/v2/`
- Backend health: `GET https://n8n.estyl.team/webhook/mol-app-v2-health`
- Workflow: `sfoWeuiJBN2qvCRF` — `MOL // APP V2 // API HEALTH`
- Tryb: `environment=test`, `writes_enabled=false`
- V2 nie korzysta jeszcze z tabel operacyjnych ani credentiali V1.

## Aktywne workflowy V1 i wersje rollbacku

| Workflow | ID | Active version | Węzły |
|---|---|---|---:|
| MOL // APP // API AUTH | `m4PEbodN7cJoxCZm` | `048ba38f-fee9-4dfb-943b-ad326275f536` | 14 |
| MOL // APP // AUTH VALIDATE | `jskvMhy32DrX5cli` | `cbeb20ae-30ee-4679-abd4-324b97eea354` | 8 |
| MOL // APP // API WORKER | `hUNjvgqv8lpDjfbm` | `c7669068-27b4-4e8b-9dad-238413e1d57b` | 146 |
| MOL // APP // ATTENDANCE SERVICE | `ziV6xORUy73x7z2E` | `aca31fff-6f05-4620-ac4c-a35375e11ccf` | 27 |
| MOL // APP // ATTENDANCE DRIVE SYNC | `IHWrMya7mfHya8GU` | `c780792e-9106-4959-bdf9-32afa53308d0` | 16 |
| MOL // APP // API PROCESS | `q13LtqEGWB0huDQE` | `0a5409fb-51be-4d0c-93d1-289e3d2f9319` | 55 |
| MOL // APP // API LEADER | `oDaioDnxZ1UInzQy` | `552115e0-fdef-476d-a182-5e3c60027a7b` | 61 |
| MOL // APP // API REPORTS | `LMWhpwHMf2t1l6qg` | `a8cd0c1f-794f-4289-996e-dd926fe48d0f` | 21 |
| MOL // APP // NORM SERVICE | `cl9mDhe9mQjWJR7E` | `458a2c31-ac32-4b9d-8122-7957da2c312c` | 43 |
| MOL // APP // NORM SCHEDULER | `EFTcIZT3fUlsNoAI` | `c62851d7-402a-4de2-8d9c-1d8cd4cf8930` | 16 |
| MOL // APP // ES LIVE PIPELINE | `13K8nWM3QYV13GUr` | `d08bc9dc-9e34-41bf-97db-2f46ba01bcef` | 39 |
| MOL // APP // ES BOUNDARY SNAPSHOT READ | `V27sooFYIuQaskUR` | `1537845d-9591-4acc-95bb-01853cf78f7a` | 11 |
| MOL // APP // ALERT SCHEDULER V2 | `9DThBkqXqWjjpJzN` | `12a2e0df-104b-418b-a403-86499045ffed` | 46 |
| MOL // APP // ALERT SOURCE RECOVER | `1ljMBYINjQWP8xNv` | `5e931d79-3911-4c5a-94b1-f33c0b50817a` | 5 |
| MOL // APP // ERROR ALERT HANDLER | `uKjfm1Oov2mwwyYX` | `231b12e2-3a21-4578-90ac-e2034a3d81ed` | 6 |

Na instancji znajduje się łącznie 151 workflowów. 36 nazw zaczyna się od `MOL // APP`; 15 z nich jest aktywnych i niearchiwalnych.

## Endpointy V1

| Metoda | Ścieżka | Właściciel |
|---|---|---|
| POST | `mol-app-auth-login` | API AUTH |
| POST | `mol-app-auth-logout` | API AUTH |
| GET | `mol-app-config` | API WORKER |
| GET | `mol-app-workday-current` | API WORKER |
| GET | `mol-app-live-metrics` | API WORKER |
| POST | `mol-app-alerts` | API WORKER |
| POST | `mol-app-attendance` | API WORKER |
| POST | `mol-app-process` | API PROCESS |
| POST | `mol-app-reports` | API REPORTS |
| POST | `mol-app-leader` | API LEADER |

## Tabele aplikacji V1

| Tabela | ID | Rola |
|---|---|---|
| MOL_APP_EMPLOYEES | `VrRF1c6UqWZrkYsc` | pracownicy, role, mapowania |
| MOL_APP_AUTH_SESSIONS | `v7CYyAHY8KVMSL0N` | sesje logowania |
| MOL_APP_CONFIG | `GEBNhFvVSHHfNphN` | konfiguracja |
| MOL_APP_PROCESSES | `Rwp68oSqNjoMMtJ5` | słownik procesów |
| MOL_APP_ATTENDANCE | `iHgLBsXzXgSe2Vwc` | operacyjny czas pracy |
| MOL_APP_ATTENDANCE_EVENTS | `uSw9g3wUTePiTNXe` | audyt czasu pracy |
| MOL_APP_ATTENDANCE_CORRECTIONS | `aWd0aR7BDejiM9S2` | korekty czasu |
| MOL_APP_WORK_DAYS | `ipGh6aMhD2Ka1DHi` | historyczny model dnia |
| MOL_APP_PROCESS_SESSIONS | `4EPkiN8VT9JgwPgv` | sesje procesów |
| MOL_APP_PROCESS_BOUNDARIES | `74RoeBASGfnuxV5T` | granice zmian procesu |
| MOL_APP_PRODUCTION_DELTAS | `cLNFvqhpJnhjCNDI` | przyrosty produkcji |
| MOL_APP_ES_POLL_STATE | `g1xgUlS33g1AHwA3` | stan odczytów ES |
| MOL_APP_MONITI_SNAPSHOT | `rlSZMFb2SIqXNenV` | snapshot Moniti |
| MOL_APP_STATUS_CACHE | `NTYqhYf2iFxUBv0v` | cache podsumowań |
| MOL_APP_MESSAGES_ALERTS | `QxLtTbT30kFiFqDN` | wiadomości i alerty |
| MOL_APP_DEVICE_SUBSCRIPTIONS | `LDRafhBfttCwx1D9` | urządzenia/push |

## Integracje i pliki Drive

- Specyfikacja V2: `1zDbsapsu7W2tkD_AGWPHk0RbP4YJ7jMaNYO_62pR6to`
- Arkusz czasu: `1aZL4aBKd0Muzbv_7wy1MmyE9-E_cGm4fLh3dnYfiQxQ`, tytuł `MOL_APP_CZAS_PRACY`
- Credential Moniti: referencja `jDX7MFgk2vvXqZ5f`, bez odczytu sekretu
- Credential Google Sheets: referencja `PffTtJhrPLmJ2ZrI`, bez odczytu sekretu
- Publiczne API n8n nie zezwala na listowanie credentiali (`403`); zależności ustalono na podstawie aktywnych grafów workflowów.

## Zasady izolacji V2

1. Wszystkie workflowy mają prefiks `MOL // APP V2 //`.
2. Wszystkie webhooki mają prefiks `mol-app-v2-`.
3. V2 nie zapisuje do tabel V1 przed zatwierdzeniem modelu danych.
4. Pierwszy endpoint jest wyłącznie odczytowym health checkiem.
5. V1 nie jest edytowana podczas budowy V2, poza krytyczną awarią zatwierdzoną przez użytkownika.
6. Przełączenie nastąpi dopiero po teście równoległym i zgodzie użytkownika.
