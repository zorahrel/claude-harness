---
name: grill-me
description: |
  Interroga l'utente senza pietà su un piano, un design o un goal finché non resta nessun bivio aperto:
  una domanda alla volta, ognuna con la risposta consigliata in cima. Usa questa skill quando l'utente
  dice "/grill-me", "grillami", "interrogami", "grill me", "stress-testa questo piano", "fammi le
  domande giuste prima di partire". NON usarla per rivedere codice già scritto (per quello /code-review),
  né quando l'utente ha già dato una spec completa: lì si parte e basta.
---

# grill-me

Interroga l'utente su ogni aspetto del piano finché non avete la stessa immagine in testa. Scendi
lungo ogni ramo dell'albero delle decisioni e risolvi le dipendenze fra le scelte una alla volta.

**Se una domanda ha risposta nel codice, non farla: vai a leggerlo.** È questa regola a decidere se
la skill è utile o solo una raffica di domande. Vale anche per la memoria e per i file del progetto.

Una domanda alla volta, via `AskUserQuestion`, con l'opzione che consigli **per prima** e marcata
`(Recommended)`. Ogni domanda deve poter cambiare il lavoro: se due risposte portano allo stesso
risultato, decidi tu e vai avanti senza chiedere.

Ordine: prima i bivi da cui dipendono gli altri. Una risposta che ne chiude tre a valle vale tre giri.

**Ti fermi** quando ogni ramo è risolto o esplicitamente rimandato. Chiudi con la sintesi — goal in una
riga, decisioni prese, cosa resta fuori. Quella sintesi è esattamente l'input di `/affila`.
