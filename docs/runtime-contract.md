# LHC Runtime Contract

`let-him-cook` persists local runtime data under `~/.lhc/`.

## Directory Layout

- `~/.lhc/state/`
- `~/.lhc/state/sessions/<session-id>/`
- `~/.lhc/plans/`
- `~/.lhc/artifacts/`
- `~/.lhc/notepad.md`
- `~/.lhc/project-memory.json`
- `~/.lhc/readiness/`

## Session Workflow State

Each active workflow may persist a JSON state file under:

- `~/.lhc/state/sessions/<session-id>/<workflow>.json`

Minimum fields:

- `active`
- `workflow`
- `current_phase`
- `started_at`
- `completed_at`
- `read_only_mode`
- `degraded_mode`
- `missing_prerequisites`
- `context_snapshot_path`
- `peer_review_required`
- `peer_review_status`

## Artifact Contract

Artifacts live under `~/.lhc/artifacts/` and should include:

- original task
- final prompt or context sent
- raw result
- normalized summary
- next actions
- confidence
- missing coverage

## Governance

- External systems stay read-only unless the user explicitly requests a specific write action in the current session.
- Major plans, code changes, production investigations, and incident conclusions require counterpart-model review.
