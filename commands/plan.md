---
description: LHC plan. Produce a plan artifact in ~/.lhc/plans/, peer-review, and STOP. Does not implement.
argument-hint: "[--consensus] [--deliberate] <task description>"
---

# LHC Plan (RALPLAN)

You are running the LHC planning workflow. Your job is to produce a saved plan artifact and stop. You MUST NOT edit or create source files outside of `~/.lhc/`. You MUST NOT run the implementation. Implementation happens later via `/let-him-cook:execute`.

## Step 1 — Bootstrap runtime

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow ralplan --source command --cwd "$PWD" --task $ARGUMENTS --peer-review-required
node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js ralplan --json
```

- If readiness is blocked, print the install checklist and ask whether to continue in degraded mode. If the user declines, STOP here.

## Step 2 — Run the planning skill

Invoke the underlying skill and pass $ARGUMENTS through:

```
Skill("let-him-cook:lhc-ralplan")
```

Then follow the skill's steps. The skill will:
- ground the plan in local repo context, `docs-schema`, `octocode`, and `devex` when relevant
- write the plan to `~/.lhc/plans/`
- route the plan to counterpart review via `scripts/peer-review.sh`

## Step 3 — Persist the plan artifact

The plan file name MUST follow this convention:

```
~/.lhc/plans/ralplan-<slug>-<UTC-ISO>.md
```

Where `<slug>` is a short kebab-case tag derived from $ARGUMENTS (max 40 chars).

The plan file MUST include:
- Title and one-paragraph goal
- Acceptance criteria (testable)
- Implementation steps, each with file paths where known
- Risks and mitigations
- Verification steps
- Peer-review verdict (from `scripts/peer-review.sh` output)
- ADR block (Decision, Drivers, Alternatives, Why chosen, Consequences, Follow-ups)

Also append one line to `~/.lhc/notepad.md`:

```
- <UTC-ISO>  ralplan  <slug>  <cwd>  plan=<plan-file-path>
```

## Step 4 — Hand off, then STOP

Output:

```
LHC Plan complete
- Plan: <plan-file-path>
- Peer review: <approved|rejected|degraded>
- Next: run `/let-him-cook:execute --plan <plan-file-path>` to implement
```

Then STOP. Do not implement. Do not call `/let-him-cook:execute` for the user.

## Hard rules

- MUST save the plan file to `~/.lhc/plans/` before stopping.
- MUST NOT edit source files in the working repo.
- MUST NOT invoke `lhc-ralph`, `lhc-team`, or any execution skill from this command.
- If peer review rejects, revise and re-run up to 3 times. If still rejected, save the latest plan, report the verdict, and stop.
- If the user says "just implement it", refuse and tell them to run `/let-him-cook:execute`.
