---
description: LHC intake. Classify a Wix internal engineering request, run readiness, and route to the right /let-him-cook:* command. Does not implement.
argument-hint: "[task description]"
---

# LHC Interview

You are running the LHC Interview workflow. You MUST NOT implement, investigate, research, plan, or fix anything inside this command. Your only job is to classify the request, verify runtime+readiness, and tell the user which next command to run.

## Step 1 — Bootstrap runtime

Run these, in order, using the Bash tool. Stop if either fails.

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow interview --source command --cwd "$PWD" --task $ARGUMENTS
```

## Step 2 — Classify

Classify the user's request ($ARGUMENTS) into exactly one of:

| Workflow | Route to | Use when |
|----------|----------|----------|
| investigate | `/let-him-cook:investigate` | prod issue, logs, metrics, request-ID RCA |
| build-fix | `/let-him-cook:build-fix` | failing PR build, CI, release, rollout |
| research | `/let-him-cook:research` | "how does X work at Wix", schema/docs questions |
| ralplan | `/let-him-cook:plan` | substantial change needing an upfront plan |
| ralph | `/let-him-cook:execute` | the user already has a saved plan and wants to implement |
| team | `/let-him-cook:team` | task splits into independent parallel lanes |
| review | `/let-him-cook:review` | final peer-review gate on a plan, diff, or conclusion |

If the request is ambiguous, ask **one** clarifying question via AskUserQuestion, then classify.

## Step 3 — Run readiness for the chosen workflow

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js <workflow> --json
```

- If `status == "ready"`: proceed.
- If `status == "blocked"`: print the `installChecklist` to the user. Do **not** proceed until the user says "continue anyway". If they say to continue, set degraded mode in the next step's context.

## Step 4 — Hand off, then stop

Output (and ONLY output) a short hand-off block like:

```
LHC Interview
- Classified as: <workflow>
- Readiness: <ready|blocked|degraded>
- Cwd: <pwd>
- Next: run `/let-him-cook:<command>` "$ARGUMENTS"
- Runtime: ~/.lhc/
```

Then STOP. Do not call the next command yourself. The user runs it.

## Hard rules

- MUST NOT implement or edit any source file.
- MUST NOT call any skill or command other than readiness scripts.
- MUST NOT silently continue into a different workflow.
- MUST write the classification to stdout even when readiness is blocked.
