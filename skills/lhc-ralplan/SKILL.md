---
name: lhc-ralplan
description: Plan substantial Wix internal engineering work with readiness checks and mandatory peer review.
---

# LHC RALPlan

Use for substantial plans that need internal research, repo context, and a durable local artifact.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/subagent-catalog.md`

## Workflow

1. Run readiness:

```bash
node ../../scripts/check-readiness.js ralplan
```

2. Ensure local runtime exists before writing plan artifacts:

```bash
node ../../scripts/ensure-runtime.js
```

3. Ground the plan using:
   - local repo context
   - `docs-schema`
   - `octocode`
   - `devex` when service, rollout, or ownership context matters
4. Write the plan into `~/.lhc/plans/`.
5. Route the final plan to counterpart review before presenting it as approved.

## Review Rule

Major plans require counterpart review. If running inside Codex, default to Claude:

```bash
sh ../../scripts/peer-review.sh --leader codex --mode plan --prompt-file /path/to/prompt.txt
```
