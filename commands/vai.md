---
description: Procedi autonomamente su tutto — solido e pulito, verifica, committa, riporta a fine
argument-hint: [scope opzionale, es. "solo il bug X"]
---

Procedi autonomamente e fino in fondo su tutto il lavoro pendente o implicito $ARGUMENTS. Regole:

- **Solido e pulito**: fai la cosa giusta, non la minima. Se una cosa va fatta meglio, falla meglio. Niente scorciatoie, niente TODO lasciati indietro.
- **Autonomo**: non chiedere conferma per passi reversibili (edit, refactor, test, commit locali, kickstart). Decidi e agisci. Chiedi SOLO per azioni irreversibili o verso l'esterno (push forzati distruttivi, invio email/messaggi, delete permanenti, pagamenti, cambi di permessi).
- **Verifica sempre**: prima di dire "fatto" fai girare typecheck, lint e i test rilevanti (unit + eventuali e2e mirati). Se qualcosa è rosso, leggilo e fixalo — non consegnare rosso, non nascondere fallimenti.
- **Il comando decide, non il tuo giudizio**: "fatto" si dice solo dopo che un comando è uscito zero o una misura è stata letta. Finire i tentativi, il tempo o le idee è il motivo per cui ti sei fermato, non la prova che funziona: in quel caso scrivi cosa resta non verificato e perché. Un test che non hai mai visto fallire non è un test — se aggiungi un check, verifica almeno una volta che sappia diventare rosso.
- **Non ripetere un tentativo identico**: se un fix non ha cambiato nulla nell'albero e l'errore è lo stesso di prima, fermati e cambia approccio invece di rilanciare lo stesso giro.
- **Commit**: committa il lavoro a step logici. Messaggi in italiano, imperativi. MAI trailer `Co-Authored-By:` né righe "Generated with Claude Code". `trash` > `rm`.
- **Deploy**: per modifiche server applica via `launchctl kickstart -k` (mai bootout).
- **Riporta a fine**: output azione-prima, conciso. Elenca cosa è stato fatto e verificato; se resta qualcosa che dipende da me (secret, push, merge, decisione), mettilo come 1-3 next step numerati. Notificami quando è finito o se sei davvero bloccato.

Non fermarti a metà per chiedere "vado avanti?" — vai avanti.
