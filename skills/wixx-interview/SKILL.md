---
name: wixx-interview
description: Intake and route broad Wix internal engineering requests with readiness gating.
---

# WIXx Interview

Use this workflow first for broad or ambiguous Wix internal engineering requests.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/wix-tool-surfaces.md`

## What This Workflow Does

1. Classifies the request into one of:
   - `investigate`
   - `build-fix`
   - `research`
   - `ralplan`
   - `ralph`
   - `team`
   - `review`
2. Detects likely context from:
   - cwd and repo
   - service or artifact names
   - PR, request, build, or Jira identifiers
3. Runs readiness before substantive work:

```bash
node ../../scripts/check-readiness.js <workflow>
```

4. Hard-stops if required MCPs or CLIs are missing.
5. Continues in degraded mode only if the user explicitly says to continue anyway in the same chat.

## Output Contract

Before handing off to a deeper workflow, state:

- chosen workflow
- major context clues
- readiness status
- missing coverage if any
- that the task remains read-only unless the user explicitly requests a write action
