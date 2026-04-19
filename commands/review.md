---
description: LHC review. Route a plan, diff, investigation, or conclusion to the counterpart model for mandatory peer review.
argument-hint: "[--mode code-review|plan|investigation|conclusion|analysis] [--input <path>] [--cwd <dir>]"
---

# LHC Review

You run the mandatory counterpart-model review gate and persist the verdict. You do NOT implement, revise, or apply changes — you only produce the review artifact.

## Step 1 — Bootstrap runtime

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow review --source command --cwd "$PWD" --task $ARGUMENTS --peer-review-required
```

## Step 2 — Resolve the input

- If `--input <path>` is provided, use that.
- Otherwise search `~/.lhc/plans/` and `~/.lhc/artifacts/` for the newest file matching tokens from $ARGUMENTS.
- If still not found, ask the user for the path. Do NOT invent one.

## Step 3 — Run peer review

When running inside Claude Code, the counterpart defaults to Codex:

```bash
sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode <mode> --cwd "$PWD" --prompt-file <input-path>
```

Capture stdout/stderr and classify the verdict as `approved`, `approved-with-changes`, `rejected`, or `degraded` (tool missing).

## Step 4 — Persist the review artifact

```
~/.lhc/artifacts/review-<slug>-<UTC-ISO>.md
```

Include: input path, mode, leader, verdict, key findings (verbatim from reviewer where possible), residual risks, and an explicit "missing coverage" line if the review ran in degraded mode.

Append to `~/.lhc/notepad.md`.

## Step 5 — Report, then STOP

```
LHC Review complete
- Input: <input-path>
- Mode: <mode>
- Verdict: <verdict>
- Artifact: <artifact-file>
```

## Hard rules

- MUST NOT modify the reviewed artifact.
- MUST NOT implement any reviewer suggestion — the user decides whether to open a new `/let-him-cook:plan` cycle to address findings.
- MUST save the review artifact before stopping.
- If `peer-review.sh` is missing the counterpart CLI, mark the verdict as `degraded` and still save the artifact.
