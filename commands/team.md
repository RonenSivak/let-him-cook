---
description: LHC team. Coordinate parallel Wix internal engineering lanes with explicit role routing, then gate on peer review.
argument-hint: "<task description>"
---

# LHC Team

You coordinate a small fleet of specialized agents across parallel lanes of a task. You do not implement directly — you dispatch subagents and synthesize their outputs.

## Step 1 — Bootstrap runtime

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow team --source command --cwd "$PWD" --task $ARGUMENTS --peer-review-required
```

## Step 2 — Require a plan

If `~/.lhc/plans/` contains no plan matching $ARGUMENTS, STOP and tell the user:

```
LHC Team — no plan found.
Run `/let-him-cook:plan <task>` first. Team execution is gated on a reviewed plan.
```

## Step 3 — Partition lanes

Split the plan into bounded lanes. Typical lane shapes:

- implementation (one or more subagents, usually `executor`)
- evidence and verification (`verifier`)
- docs and repo research (`repo-cartographer`, `internal-docs-researcher`)
- final review (`code-reviewer` or peer-review.sh)

Dispatch each lane via the Task tool with the matching LHC agent type.

## Step 4 — Run the skill for policy

```
Skill("let-him-cook:lhc-team")
```

Follow the skill for routing rules, including the read-only default and the final-review gate.

## Step 5 — Persist the team artifact

```
~/.lhc/artifacts/team-<slug>-<UTC-ISO>.md
```

Include: lane map, per-lane summary, files touched (aggregated), verification evidence, peer-review verdict.

Append to `~/.lhc/notepad.md`.

## Step 6 — Report, then STOP

## Hard rules

- MUST NOT start without a plan file in `~/.lhc/plans/`.
- MUST keep external systems read-only unless the plan authorizes a specific write.
- MUST gate completion on verification evidence AND peer review.
- If a lane cannot complete, surface it in the artifact rather than papering over it.
