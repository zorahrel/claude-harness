# claude-harness

Strumenti per [Claude Code](https://claude.com/claude-code) che reggono le sessioni
lunghe, quelle in cui l'agente lavora da solo per ore.

*(English version below — [jump](#english).)*

## In due parole, se non sei uno sviluppatore

Claude Code è un assistente che scrive software e ha accesso al tuo computer. Ha
un difetto noto: **su compiti lunghi si perde**. Dice «fatto» quando non lo è,
riscrive cose che funzionavano, o costruisce difese contro problemi che non
esistono invece di finire quello che gli hai chiesto.

Questo repository contiene otto istruzioni scritte a mano che gli tolgono
quelle abitudini. Non è un programma da installare: sono **file di testo** che
l'agente legge da solo e che cambiano il suo comportamento. Si copia quello che
serve e si lascia il resto.

Le due che cambiano di più la giornata:

- **`grill-me`** — prima di partire, l'agente ti interroga sul piano finché non
  resta un dubbio: una domanda alla volta, con la risposta che consiglia lui in
  cima. Serve a non scoprire dopo tre ore che avevate in mente due cose diverse.
- **`gauntlet-loop`** — divide un lavoro in pezzi, e per ogni pezzo mette un
  secondo agente che *esegue davvero* il controllo invece di fidarsi. Se il
  controllo non è stato fatto, lo dice: «non verificato» non diventa mai
  «fatto».

Il filo che le tiene insieme è uno solo: **un lavoro è finito quando una prova
lo dimostra**, non quando l'agente ha finito le idee.

## Cosa c'è dentro

| Cartella | A cosa serve |
|---|---|
| `skills/grill-me` | Ti interroga sul piano finché non resta un bivio aperto. Una domanda per volta, la risposta consigliata per prima. |
| `skills/gauntlet-loop` | Quando usare il ciclo con i critici, quando no, e come si scrive un traguardo che può fallire davvero. |
| `skills/senior-pass` | Una passata da ingegnere senior su un progetto che esiste già: misura, mappa l'architettura, poi spazza undici assi — e **applica** le correzioni invece di elencartele. |
| `skills/config-security-audit` | Controlla la configurazione di un agente (`.claude/`, server MCP, hook, impostazioni) cercando chiavi esposte, superfici di attacco e permessi troppo larghi. Esce con errore se trova qualcosa di grave: si può mettere in CI. |
| `skills/graphify` | Costruisce un grafo della conoscenza da una cartella di file (codice, documenti, paper, immagini, video) e poi risponde alle domande interrogandolo. |
| `skills/domain-model`, `skills/ubiquitous-language` | Domain-driven design: mappe di contesto, ADR, e tenere onesto il vocabolario del progetto. |
| `skills/zoom-out` | Alza lo sguardo dal diff alla forma del problema. Utile quando non conosci quella zona di codice. |
| `workflows/gauntlet.js` | Il motore del ciclo: un lavoratore per pezzo, un critico che esegue il controllo, si ripete finché il traguardo è verde — o si spiega perché non lo è. |
| `commands/` | `/vai` (procedi da solo e riporta onestamente), `/commit`, `/recap`, `/caveman`. In italiano. |

## La parte interessante: come finisce il ciclo

Quasi tutti i cicli di questo tipo si fermano su un contatore e chiamano
«successo» il fatto di aver esaurito i tentativi. Questo distingue tre finali e
non li confonde mai:

- **verde** — ogni pezzo verificato contro il traguardo, controllo di regressione incluso
- **rosso** — misurato, e non passa
- **non verificato** — nessuno ha davvero controllato: un critico è morto, è
  stato saltato, o il budget è finito a metà

Si rifiuta anche di ripetere un pezzo il cui giro non ha cambiato niente: se
l'albero di lavoro è identico byte per byte e il critico elenca gli stessi
difetti, un altro giro compra la stessa risposta a prezzo pieno.

```bash
node workflows/gauntlet.test.mjs
```

I test sostituiscono la chiamata al modello, quindi girano offline in circa un
secondo: 14 asserzioni, nessuna rete, nessun costo.

## Installazione

Ogni pezzo si adotta da solo, non serve prendere tutto.

```bash
git clone https://github.com/zorahrel/claude-harness.git
cd claude-harness

# una skill
ln -s "$PWD/skills/grill-me" ~/.claude/skills/

# il workflow (si invoca con il tool Workflow)
mkdir -p ~/.claude/workflows
ln -s "$PWD/workflows/gauntlet.js"       ~/.claude/workflows/
ln -s "$PWD/workflows/gauntlet.test.mjs" ~/.claude/workflows/

# un comando
ln -s "$PWD/commands/vai.md" ~/.claude/commands/
```

Poi apri Claude Code e scrivi `/grill-me`: se risponde, è installata.

**Se il symlink viene rifiutato:** su alcune installazioni Claude Code protegge
`~/.claude/skills/` da scritture esterne. In quel caso installa le skill tramite
una cartella marketplace fuori da `~/.claude`, oppure copiale invece di
collegarle (`cp -R` al posto di `ln -s`).

## Lingua

Le skill e il workflow sono in inglese; i comandi in `commands/` e alcune skill
sono in italiano, perché è la lingua in cui vengono usati. Funzionano uguale in
entrambe: traducili se preferisci, il comportamento non cambia.

Le quattro regole che tutto questo esiste per far rispettare stanno in
[RULES.md](RULES.md).

---

<a name="english"></a>

# claude-harness (English)

Workflows, skills and commands for [Claude Code](https://claude.com/claude-code)
that survive long, autonomous runs — plus the four [rules](RULES.md) they exist
to enforce.

**If you are not a developer:** Claude Code is an assistant that writes software
and has access to your machine. On long tasks it drifts — it says "done" when it
isn't, rewrites things that worked, or builds defenses against problems that
don't exist instead of finishing what you asked. This repository is eight
hand-written instruction files that take those habits away. Nothing to install:
the agent reads them by itself.

Nothing here is a framework. Each piece is a plain file the harness already knows
how to load, and each one can be adopted on its own.

| Path | What it is |
|---|---|
| `skills/grill-me` | Interrogates a plan until no fork is left open — one question at a time, recommended answer first. |
| `skills/gauntlet-loop` | When to reach for the critic loop, when not to, and how to write a bar that can fail. |
| `skills/senior-pass` | A full senior-engineer pass over an existing project: measure the bar first, map the architecture, sweep eleven axes — and apply the fixes rather than filing them. In Italian. |
| `skills/config-security-audit` | Audits an agent configuration (`.claude/`, MCP servers, hooks, settings) for secrets, injection surface, over-permissive allow-lists. Exits non-zero on HIGH findings, so it works as a CI gate. |
| `skills/graphify` | Builds a persistent knowledge graph from a folder of files (code, docs, papers, images, video) and answers questions by querying it. In Italian. |
| `skills/domain-model`, `skills/ubiquitous-language` | Domain-driven design: context maps, ADRs, keeping the vocabulary honest. |
| `skills/zoom-out` | Steps back from the diff to the shape of the problem. |
| `workflows/gauntlet.js` | Fan out one worker per piece, pair each with a critic that *runs* the check, loop until the bar is green — or report honestly why it isn't. |
| `commands/` | `/vai` (go autonomous, report honestly), `/commit`, `/recap`, `/caveman`. In Italian. |

**How the gauntlet loop ends.** Most loops of this shape stop on a counter and
call it success. This one distinguishes **green** (verified against the bar,
regression included), **red** (measured, does not pass) and **unverified**
(nobody actually checked) — and never conflates them. It also refuses to re-run a
piece whose round changed nothing: identical tree plus identical critic findings
means another round buys the same answer at full price.

Install: clone, then `ln -s "$PWD/skills/<name>" ~/.claude/skills/`. If that
symlink is refused (Claude Code write-protects `~/.claude/skills/` on some
setups), install through a marketplace directory outside `~/.claude`, or copy
instead of linking.
