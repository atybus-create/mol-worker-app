# Etap 10 — MAGAZYN i komunikaty lidera

Data: 2026-09-07
Status: wykonane technicznie, do odbioru w preview

## MAGAZYN

Naprawiono zachowanie ekranu procesu tak, aby wybór `MAGAZYN` nie zależał od powodzenia dynamicznego ładowania konfiguracji narzędzi. Konfiguracja `shared/warehouse-tools.js` jest ładowana przed `worker-details.js`; nawet przy błędzie konfiguracji sam wybór procesu pozostaje funkcjonalny.

Po wybraniu `MAGAZYN`:
- proces staje się aktywnym wyborem w podglądzie,
- aktualny proces na ekranie głównym zostaje zaktualizowany,
- pojawia się sekcja `Narzędzia magazynowe`,
- dostępne są dwa linki odziedziczone z V1: `Terminy – aplikacja magazynowa` oraz `Batch reader`,
- otwarcie narzędzia nie kończy procesu MAGAZYN.

## Komunikaty lidera

Przywrócono osobny moduł `Komunikaty` dla LEADER/ADMIN w panelu WWW oraz w mobilnym trybie menedżerskim.

Frontend odwzorowuje zaakceptowany kontrakt `POST /mol-app-v2-leader-message`:
- `recipient_ids` — jeden, wielu odbiorców, maksymalnie 100,
- albo `all_open: true` — wszyscy pracownicy z aktualnie otwartym dniem,
- `content` — 1–2000 znaków,
- `ack_required` — opcjonalne wymaganie potwierdzenia odbioru.

WORKER nie otrzymuje funkcji wysyłania. W Etapie 10 wysyłka pozostaje demonstracyjna; realne podłączenie endpointu nastąpi w Etapie 11.

## Walidacja

Dedykowany CI Etapu 10 sprawdza od tej zmiany:
- poprawne ładowanie narzędzi MAGAZYN,
- widoczność obu narzędzi tylko dla MAGAZYN,
- aktualizację wybranego procesu,
- istnienie modułu Komunikaty WWW i mobile,
- pola odbiorców / all_open / content / ack_required,
- brak sekretów w froncie.
