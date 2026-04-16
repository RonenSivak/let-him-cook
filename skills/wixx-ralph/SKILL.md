---
name: wixx-ralph
description: Persistent execution loop for Wix internal engineering work with verification and peer review.
---

# WIXx Ralph

Use when the task needs persistence, verification, and a real completion gate.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../../docs/runtime-contract.md`

## Workflow

1. Run readiness for the underlying task lane if it has not already been checked.
2. Ensure local runtime exists:

```bash
node ../../scripts/ensure-runtime.js
```

3. Persist workflow state under `~/.wixx/state/sessions/<session-id>/ralph.json`.
4. Continue working until verification evidence exists.
5. Do not present code changes, investigation outcomes, or incident conclusions as complete until counterpart review is clean.

## Default Behavior

- preserve read-only mode for external systems
- use local artifacts and local state
- require fresh verification before completion claims
