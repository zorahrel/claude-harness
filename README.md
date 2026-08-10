# claude-harness

Workflow, skills and commands for [Claude Code](https://claude.com/claude-code)
that survive long, autonomous runs — plus the four [rules](RULES.md) they exist
to enforce.

Nothing here is a framework. Each piece is a plain file the harness already
knows how to load, and each one can be adopted on its own.

## What's inside

| Path | What it is |
|---|---|
| `workflows/gauntlet.js` | Fan out one worker per piece, pair each with a critic that *runs* the check, loop until the bar is green — or report honestly why it isn't. |
| `workflows/gauntlet.test.mjs` | Its tests: 14 assertions, no network, no API calls. |
| `skills/gauntlet-loop` | When to reach for that loop, when not to, and how to write a bar that can fail. |
| `skills/grill-me` | Interrogates a plan until no fork is left open — one question at a time, recommended answer first. |
| `skills/config-security-audit` | Audits an agent configuration (`.claude/`, MCP servers, hooks, settings) for secrets, injection surface, over-permissive allow-lists. |
| `skills/domain-model`, `skills/ubiquitous-language` | Domain-driven design: context maps, ADRs, keeping the vocabulary honest. |
| `skills/zoom-out` | Steps back from the diff to the shape of the problem. |
| `commands/` | `/vai` (go autonomous, report honestly), `/commit`, `/recap`, `/caveman`. In Italian. |

## The interesting part: how the gauntlet loop ends

Most loops of this shape stop on a counter and call it success. This one
distinguishes three endings and never conflates them:

- **green** — every piece verified against the bar, regression check included
- **red** — measured, and it does not pass
- **unverified** — nobody actually checked: a critic died, was skipped, or the
  token budget ran out mid-piece

It also refuses to re-run a piece whose round changed nothing: if the working
tree is byte-identical and the critic lists the same defects, the worker cannot
move it, and another round buys the same answer at full price.

```bash
node workflows/gauntlet.test.mjs
```

The tests stub the `agent()` boundary, so they run offline in about a second.

## Install

Symlink what you want; nothing here needs to be installed together.

```bash
# the workflow (invoked via the Workflow tool)
mkdir -p ~/.claude/workflows
ln -s "$PWD/workflows/gauntlet.js"      ~/.claude/workflows/
ln -s "$PWD/workflows/gauntlet.test.mjs" ~/.claude/workflows/

# skills — or point your marketplace at skills/
ln -s "$PWD/skills/grill-me" ~/.claude/skills/

# commands
ln -s "$PWD/commands/vai.md" ~/.claude/commands/
```

Note: `~/.claude/skills/` is write-protected by Claude Code's safety check on
some setups — if a symlink there is refused, install the skills through a
marketplace directory outside `~/.claude` instead.

## Language

Skills and workflow are in English; the slash commands in `commands/` are in
Italian, because that is the language they are used in. They work the same
either way — translate them if you prefer.
