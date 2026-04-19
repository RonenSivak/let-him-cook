---
description: LHC research. Answer "how does this work at Wix" with internal docs, repo archaeology, and external library docs. Saves a research artifact. Does not implement.
argument-hint: "<question or topic>"
---

# LHC Research

You produce a focused research artifact grounded in internal Wix sources. You MUST NOT implement code or edit repo files.

## Step 1 — Bootstrap runtime

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow research --source command --cwd "$PWD" --task $ARGUMENTS
node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js research --json
```

## Step 2 — Run the skill

```
Skill("let-him-cook:lhc-research")
```

Follow the source priority: `docs-schema` → `octocode` → `context7` for external dependencies. Dispatch subagents for independent evidence lanes when useful (`internal-docs-researcher`, `repo-cartographer`, `framework-standards-reviewer`).

## Step 3 — Persist the research artifact

```
~/.lhc/artifacts/research-<slug>-<UTC-ISO>.md
```

Include: question, answer (concise), evidence per source family with links, caveats, and explicit "not verified" items.

Append to `~/.lhc/notepad.md`:

```
- <UTC-ISO>  research  <slug>  <cwd>  artifact=<artifact-file>
```

## Step 4 — Report, then STOP

Print the artifact path and a 3-bullet summary. STOP.

## Hard rules

- MUST NOT edit files in the working repo.
- MUST NOT propose or implement changes based on the research — if the user wants a change, tell them to run `/let-him-cook:plan`.
- MUST keep conclusions scoped to evidence actually gathered.
- If the research turns into a formal conclusion or plan, route through `/let-him-cook:review` for counterpart review before presenting it as final.
