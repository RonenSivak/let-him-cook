---
description: LHC execute. Implement a saved plan via the ralph loop with verification and peer review.
argument-hint: "[--plan <path>] [--verify-only] <task or plan slug>"
---

# LHC Execute (RALPH loop)

You are running the LHC execution workflow. You implement a plan that already exists in `~/.lhc/plans/`. You MUST refuse to run without a plan file.

## Step 1 — Bootstrap runtime

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow ralph --source command --cwd "$PWD" --task $ARGUMENTS --peer-review-required
```

## Step 2 — Resolve the plan file

Resolve in this order:

1. If `$ARGUMENTS` contains `--plan <path>`, use that path.
2. Otherwise look in `~/.lhc/plans/` for the newest file whose slug matches tokens from $ARGUMENTS.
3. Otherwise use the newest `~/.lhc/plans/ralplan-*.md`.

If no plan file is found, STOP and tell the user:

```
LHC Execute — no plan found.
Run `/let-him-cook:plan <task>` first, then `/let-him-cook:execute`.
```

## Step 3 — Run the ralph skill with the plan as input

Invoke:

```
Skill("let-him-cook:lhc-ralph")
```

Pass the resolved plan file path as the authoritative task spec. The skill will:
- persist per-session state under `~/.lhc/state/sessions/<session-id>/ralph.json`
- iterate implement → verify → fix until acceptance criteria pass
- require fresh verification evidence before declaring complete
- route the final diff to counterpart review via `scripts/peer-review.sh`

## Step 4 — Persist the execution artifact

Write an execution record to:

```
~/.lhc/artifacts/execute-<slug>-<UTC-ISO>.md
```

Include:
- link to the plan file used
- files touched (with paths)
- verification commands run + their outputs (truncated)
- peer-review verdict
- residual gaps

Append one line to `~/.lhc/notepad.md`:

```
- <UTC-ISO>  ralph  <slug>  <cwd>  plan=<plan-file>  artifact=<artifact-file>
```

## Step 5 — Report, then STOP

```
LHC Execute complete
- Plan: <plan-file>
- Artifact: <artifact-file>
- Peer review: <approved|rejected>
- Verification: <evidence summary>
```

## Hard rules

- MUST refuse to run without a plan file under `~/.lhc/plans/`.
- MUST NOT invent a plan inline; always read from the plan file.
- MUST write the artifact file to `~/.lhc/artifacts/` before stopping.
- MUST NOT chain into `/let-him-cook:plan` to fabricate a plan on the fly. If the user only has an idea, tell them to run `/let-him-cook:plan` first.
- External systems stay read-only unless the plan explicitly calls out a write.
