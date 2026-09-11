# Etap 10 — narzędzia procesu MAGAZYN

Źródło: funkcjonalność V1 zachowana w docelowym UX V2 zgodnie z pakietem kontynuacji projektu. Linki zostały odczytane z `config.js` V1, a nie odtworzone z pamięci.

## Narzędzia

1. **Terminy – aplikacja magazynowa**  
   `https://atybus-create.github.io/mol-magazyn-terminy-pwa/`  
   Dekodowanie partii, terminów i rejestracja spisu.

2. **Batch reader**  
   `https://atybus-create.github.io/mol-magazyn-terminy-pwa/batch-reader/`  
   Szybki odczyt i dekodowanie partii.

## Zasada UX

- kafelki są pokazywane w mobilnym ekranie procesu dopiero po wybraniu `MAGAZYN`;
- są dostępne dla każdej roli korzystającej mobilnie z procesu `MAGAZYN`;
- otwarcie narzędzia następuje w nowej karcie / zewnętrznym widoku i nie kończy procesu `MAGAZYN`;
- powrót do MOL App ma zachować trwający proces; Etap 11 podłączy ten widok do rzeczywistego stanu procesu backendu;
- te dwa kafelki są skrótami do istniejących aplikacji magazynowych i nie są tym samym co automatyczne dekodery HTTP używane przez system kontroli terminów.

V1 pozostaje tylko źródłem referencyjnym i nie jest modyfikowana.
