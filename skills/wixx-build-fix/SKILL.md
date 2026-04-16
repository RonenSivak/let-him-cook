---
name: wixx-build-fix
description: Triage failing Wix builds, PR checks, and release paths using DevEx and repo archaeology.
---

# WIXx Build Fix

Use for CI failures, PR build failures, release failures, and related triage.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/wix-tool-surfaces.md`

## Workflow

1. Run readiness:

```bash
node ../../scripts/check-readiness.js build-fix
```

2. Use:
   - `devex` for build, release, rollout, and ownership context
   - `octocode` for repo search and PR archaeology
   - local inspection for the active repository
3. Explicitly separate the failure type:
   - code failure
   - flaky test
   - release failure
   - ownership ambiguity
   - infra or system failure
4. If the workflow produces a formal conclusion or code change recommendation, require counterpart review before presenting it as final.

## Guardrails

- remain read-only externally
- do not retrigger builds unless the user explicitly asks
