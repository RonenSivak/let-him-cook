---
name: lhc-build-fix
description: Triage failing Wix builds, PR checks, and release paths using DevEx and repo archaeology.
---

# LHC Build Fix

Use for CI failures, PR build failures, release failures, and related triage.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/wix-tool-surfaces.md`

## Workflow

1. Initialize workflow state:

```bash
node ../../scripts/runtime-touch.js --workflow build-fix --source workflow --phase starting --peer-review-required
```

2. Run readiness:

```bash
node ../../scripts/check-readiness.js build-fix
```

3. Use:
   - `devex` for build, release, rollout, and ownership context
   - `octocode` for repo search and PR archaeology
   - local inspection for the active repository
4. Explicitly separate the failure type:
   - code failure
   - flaky test
   - release failure
   - ownership ambiguity
   - infra or system failure
5. If the workflow produces a formal conclusion or code change recommendation, require counterpart review before presenting it as final.

## Parallel Triage Guidance

If the task has multiple independent evidence families, use native subagents for lanes such as:

- DevEx build and release evidence
- Octocode repo and PR archaeology
- local repository verification

Keep the final classification and recommendation with the coordinating agent.

## Guardrails

- remain read-only externally
- do not retrigger builds unless the user explicitly asks
