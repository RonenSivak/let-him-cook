---
name: lhc-review
description: Run mandatory counterpart-model review for plans, code, investigations, and conclusions.
---

# LHC Review

Use this workflow for the final review gate.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`

## Default Counterpart Route

When running inside Codex, default to Claude for the final review:

```bash
sh ../../scripts/peer-review.sh --leader codex --mode analysis --prompt-file /path/to/prompt.txt
```

When running inside Claude, default to Codex:

```bash
sh ../../scripts/peer-review.sh --leader claude --mode analysis --cwd /path/to/repo --prompt-file /path/to/prompt.txt
```

## Required Outputs

- findings
- residual risks
- approval or rejection status
- explicit missing coverage if the review ran in degraded mode

## Artifact Rule

Persist important review results as local artifacts under `~/.lhc/artifacts/`.
