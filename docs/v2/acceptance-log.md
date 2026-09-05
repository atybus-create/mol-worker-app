# MOL App V2 — rejestr odbiorów

| Etap | Zakres | Test techniczny | Odbiór użytkownika | Status |
|---:|---|---|---|---|
| 1 | Zamrożenie V1, inwentaryzacja, izolowany szkielet V2 | Backend 200; 0 błędów; 0 ostrzeżeń; `writes_enabled=false` | Oczekuje | GOTOWE DO ODBIORU |
| 2 | Finalny model działania i kontrakty API | — | — | NIE ROZPOCZĘTO |
| 3 | Rdzeń backendu V2 | — | — | NIE ROZPOCZĘTO |
| 4 | Logowanie i sesja | — | — | NIE ROZPOCZĘTO |
| 5 | Czas pracy | — | — | NIE ROZPOCZĘTO |
| 6 | Procesy pracownika | — | — | NIE ROZPOCZĘTO |
| 7 | Normy i wyniki | — | — | NIE ROZPOCZĘTO |
| 8 | Alerty i komunikacja | — | — | NIE ROZPOCZĘTO |
| 9 | Panel lidera i raporty | — | — | NIE ROZPOCZĘTO |
| 10 | Spójny frontend V2 | — | — | NIE ROZPOCZĘTO |
| 11 | Test równoległy V1 kontra V2 | — | — | NIE ROZPOCZĘTO |
| 12 | Przełączenie produkcji | — | — | NIE ROZPOCZĘTO |

## Test odbiorowy etapu 1

1. Otwórz produkcyjną V1 i potwierdź, że ekran logowania działa jak wcześniej.
2. Otwórz testową V2 pod adresem `/v2/`.
3. Na V2 sprawdź, czy kafel backendu pokazuje `ONLINE`.
4. Sprawdź, czy `Zapisy danych` pokazują `WYŁĄCZONE`.
5. Kliknij `Sprawdź ponownie` i potwierdź, że status nadal jest `ONLINE`.

Po potwierdzeniu użytkownika status etapu zostanie zmieniony na `ODEBRANY` i dopiero wtedy rozpocznie się etap 2.
