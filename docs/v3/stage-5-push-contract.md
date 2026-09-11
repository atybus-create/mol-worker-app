# MOL App V3 — Etap 5 — kontrakt urządzeń / push

Status: kontrakt przygotowany, push APK NIE jest wdrożony ani odebrany w Etapie 5.

## Aktualny transport Etapu 5

- MOBILE: polling `GET /webhook/mol-app-v3-comm-list` co 20 s, gdy aplikacja jest widoczna.
- MOBILE: heartbeat `POST /webhook/mol-app-v3-comm-heartbeat` co 30 s, gdy aplikacja jest widoczna.
- WWW: lekki polling komunikatów co 20 s.
- ACK: `POST /webhook/mol-app-v3-comm-ack`.
- SHOWN: `POST /webhook/mol-app-v3-comm-shown`.
- Brak deklaracji dostarczenia systemowego powiadomienia przy zamkniętej aplikacji.

## Docelowy kontrakt urządzenia

Rejestracja urządzenia powinna być oddzielna od sesji logowania i zawierać co najmniej:

- `device_id` — stabilny identyfikator instalacji,
- `employee_id` — właściciel aktywnej subskrypcji,
- `platform` — `ANDROID` / `IOS` / `WEB`,
- `push_token` — token dostawcy push,
- `active` — czy subskrypcja jest aktywna,
- `last_seen_at`, `created_at`, `updated_at`,
- wersję aplikacji oraz opcjonalnie wersję kontraktu push.

Token push nie może być używany jako token sesji MOL App. Wylogowanie powinno kończyć lub przepinać subskrypcję dla danego użytkownika zgodnie z polityką urządzeń.

## Docelowy kontrakt zdarzenia push

Push jest jedynie sygnałem o zmianie. Źródłem prawdy pozostaje API komunikacji V3 i `MOL_V3_COMM_RECORDS`.

Minimalny payload sygnału:

```json
{
  "schema_version": 1,
  "event": "COMM_CHANGED",
  "message_id": "<record_id>",
  "type": "<alert type>",
  "requires_ack": true
}
```

Treść i aktualny status komunikatu klient powinien odczytać z API V3 po otrzymaniu sygnału. Dzięki temu ponowienie push nie tworzy nowego epizodu ani ACK.

## Warunki przyszłego odbioru push

Push można uznać za wdrożony dopiero po realnym teście na APK: aplikacja w tle i zamknięta, dźwięk/wibracja zgodnie z ustawieniami urządzenia, jeden sygnał dla jednego epizodu, ponowienie bez duplikowania rekordu, kliknięcie otwiera właściwy komunikat, ACK synchronizuje się z backendem, a wylogowany użytkownik nie otrzymuje cudzych komunikatów.
