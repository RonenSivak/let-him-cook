---
name: lhc-ralph
description: Persistent execution loop for Wix internal engineering work with verification and peer review.
---

# LHC Ralph

Use when the task needs persistence, verification, and a real completion gate.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../../docs/runtime-contract.md`

## Workflow

1. Initialize workflow state:

```bash
node ../../scripts/runtime-touch.js --workflow ralph --source workflow --phase starting --peer-review-required
```

2. Run readiness for the underlying task lane if it has not already been checked.
3. Ensure local runtime exists:

```bash
node ../../scripts/ensure-runtime.js
```

4. Persist workflow state under `~/.lhc/state/sessions/<session-id>/ralph.json`.
5. Continue working until verification evidence exists.
6. Do not present code changes, investigation outcomes, or incident conclusions as complete until counterpart review is clean.

## Default Behavior

- preserve read-only mode for external systems
- use local artifacts and local state
- require fresh verification before completion claims
