---
description: LHC build-fix. Triage failing Wix builds, PR checks, and releases using DevEx and repo archaeology. Saves a triage artifact, proposes a plan — does not implement.
argument-hint: "<pr url, build id, or symptom>"
---

# LHC Build Fix

You triage a build/CI/release failure to a classified root cause and an ownership call. If a code fix is required, you produce a plan file, **not** an edit.

## Step 1 — Bootstrap runtime

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow build-fix --source command --cwd "$PWD" --task $ARGUMENTS --peer-review-required
node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js build-fix --json
```

## Step 2 — Run the skill

```
Skill("let-him-cook:lhc-build-fix")
```

Classify the failure into one bucket: code failure / flaky test / release failure / ownership ambiguity / infra failure.

## Step 3 — Persist the triage artifact

```
~/.lhc/artifacts/build-fix-<slug>-<UTC-ISO>.md
```

Include: failure classification, relevant PR/build IDs, evidence (DevEx + octocode), ownership call, recommended next action, peer-review verdict.

Append to `~/.lhc/notepad.md`.

## Step 4 — Decide next action, then STOP

- If the classification calls for a code fix: create a plan file by invoking `Skill("let-him-cook:lhc-ralplan")` and tell the user to run `/let-him-cook:execute --plan <plan-file>` next. Do NOT implement here.
- If it's a flaky test, infra, or ownership issue: print a concrete follow-up for the owning team and STOP.
- If it's a release issue: tell the user to route to the release owner; do NOT retrigger builds unless explicitly asked.

## Hard rules

- MUST NOT edit repo files in this command.
- MUST NOT retrigger builds unless the user explicitly asks.
- MUST save the triage artifact before stopping.
- MUST hand off to `/let-him-cook:plan` → `/let-him-cook:execute` when a code change is warranted; never inline the implementation.
