# WIXx Runtime Contract

`wixx-internal-engineering` persists local runtime data under `~/.wixx/`.

## Directory Layout

- `~/.wixx/state/`
- `~/.wixx/state/sessions/<session-id>/`
- `~/.wixx/plans/`
- `~/.wixx/artifacts/`
- `~/.wixx/notepad.md`
- `~/.wixx/project-memory.json`
- `~/.wixx/readiness/`

## Session Workflow State

Each active workflow may persist a JSON state file under:

- `~/.wixx/state/sessions/<session-id>/<workflow>.json`

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

Artifacts live under `~/.wixx/artifacts/` and should include:

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
