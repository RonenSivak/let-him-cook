---
name: lhc-team
description: Coordinate parallel Wix internal engineering lanes with explicit role routing and a final peer-review gate.
---

# LHC Team

Use when the task naturally splits into parallel, bounded lanes.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/peer-review-governance.md`
- `../shared/subagent-catalog.md`

## Suggested Lane Shapes

Initialize workflow state before parallel work:

```bash
node ../../scripts/runtime-touch.js --workflow team --source workflow --phase starting --peer-review-required
```

- implementation lane
- evidence and verification lane
- docs and repo research lane
- final review lane

## Routing Rules

- Use Codex native subagents for bounded parallel work.
- Use Wix-native specialist roles when the task matches them.
- Keep external systems read-only unless the user explicitly authorizes a specific write.
- Reserve the counterpart model for final review, not for routine lane execution.

## Completion Gate

No team run is complete until:

- the primary objective is met
- verification evidence exists
- counterpart review is complete when required
