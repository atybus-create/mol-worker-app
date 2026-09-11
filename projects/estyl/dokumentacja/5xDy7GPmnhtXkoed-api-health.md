# Dokumentacja techniczna workflow n8n

## MOL // APP V3 // API HEALTH

**Autor automatyzacji:** Artur Tybuś
**Autor szablonu:** Paulina Dynowska

---

# DOKUMENTACJA TECHNICZNA

## Metryczka

| Pole | Wartość |
|---|---|
| Nazwa workflow | MOL // APP V3 // API HEALTH |
| Workflow ID | 5xDy7GPmnhtXkoed |
| Link do workflow | https://n8n.estyl.team/workflow/5xDy7GPmnhtXkoed |
| Status | Aktywny |
| Trigger | Webhook GET |
| Projekt n8n | Artur Tybuś `<atybus@estyl.team>` |
| Główne integracje | n8n Webhook, frontend GitHub Pages |
| Credentiale | Brak |
| Format wyjścia | JSON HTTP 200 |
| Data utworzenia | 2026-09-11 |

## Cel workflow

Workflow potwierdza dostępność backendu MOL App V3 przed uruchomieniem logowania lub funkcji biznesowych. Pozwala obu frontendowym punktom wejścia sprawdzić właściwy backend bez wywoływania V1/V2, Moniti, ES, Drive ani Data Tables.

Jedno wywołanie zwraca jeden obiekt stanu V3.

## Konfiguracja i wymagania

- Publiczny endpoint: `GET /webhook/mol-app-v3-health`.
- Dozwolony origin CORS: `https://atybus-create.github.io`.
- Brak credentiali oraz zewnętrznych zależności.
- Timeout workflowu: 30 sekund; odpowiedzi sukcesu nie są zapisywane w historii wykonań.

## Przepływ działania

1. `GET // V3 Health` odbiera żądanie z frontendu.
2. `Build // Health Response` buduje wersjonowaną odpowiedź stanu.
3. `Respond // 200` zwraca JSON HTTP 200 z nagłówkami bezpieczeństwa i bez cache.

## Dane wyjściowe

| Kolumna / Pole | Opis |
|---|---|
| `ok` | Potwierdzenie poprawnej odpowiedzi. |
| `request_id` | Identyfikator przekazany w nagłówku żądania, jeśli występuje. |
| `data.status` | Stan gotowości backendu, obecnie `READY`. |
| `data.service` | Stały identyfikator `MOL_APP_V3`. |
| `meta.api_version` | Wersja kontraktu API V3. |
| `meta.server_time` | Czas odpowiedzi serwera w UTC. |

## Mapa nodeów

| Node | Rola |
|---|---|
| GET // V3 Health | Odbiera publiczne żądanie GET z PWA. |
| Build // Health Response | Tworzy jednolity kontrakt odpowiedzi V3. |
| Respond // 200 | Zwraca odpowiedź HTTP 200 bez cache. |

## Uwagi i ograniczenia

- Endpoint potwierdza działanie n8n i kontraktu HTTP, ale nie sprawdza Moniti, ES, Drive ani Data Tables.
- Workflow nie zawiera danych logowania ani sekretów.
- Test wewnętrzny wykonał workflow w 178 ms; kolejne żądania HTTP na utrzymanym połączeniu trwały około 0,32 s.
- Sugestia walidatora dotycząca error workflow jest świadomie nieużyta: workflow nie zawiera fallible nodeów ani integracji, a jego awaria sama jest sygnałem niedostępności.

---

# INSTRUKCJA KORZYSTANIA Z WORKFLOW DLA UŻYTKOWNIKÓW

Otwórz aplikację mobilną albo panel WWW. Na ekranie logowania powinien pojawić się zielony komunikat „Backend V3 online. Logowanie zostanie podłączone w następnym etapie.” Pola logowania pozostają celowo zablokowane do czasu odbioru kolejnego etapu. Jeśli pojawi się czerwony komunikat o braku połączenia, odśwież stronę; jeżeli problem pozostaje, zgłoś go wraz z godziną próby.

---

## ⚠ DO WERYFIKACJI

- Potwierdzić, czy Artur Tybuś ma być wpisywany jako autor i owner wszystkich workflowów MOL App V3.
- Workflow nie ma jeszcze numeru w Mapie Automatyzacji.

## Zgłoszenie do Mapy Automatyzacji (draft do akceptacji)

Tytuł subtaska: `[Zgłoszenie do Mapy] MOL // APP V3 // API HEALTH`

Co robi: Potwierdza dostępność backendu MOL App V3 i zwraca wersjonowany stan gotowości dla aplikacji mobilnej oraz panelu WWW.
Proces / projekt: MOL App V3 - system czasu pracy, procesów i norm magazynu
Obszar biznesowy: MOL
Owner: Artur Tybuś
Reuse: Prosty wzorzec health endpointu z kontrolą CORS i jednolitym kontraktem odpowiedzi API.
Workflow: https://n8n.estyl.team/workflow/5xDy7GPmnhtXkoed (status: Aktywny)
Dokumentacja techniczna: projects/estyl/dokumentacja/5xDy7GPmnhtXkoed-api-health.md
Task źródłowy: brak
Numer z mapy: brak - proszę o nadanie
