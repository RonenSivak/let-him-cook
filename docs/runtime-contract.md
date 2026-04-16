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
- `~/.lhc/state/runtime.json`
- `~/.lhc/state/activity.jsonl`

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

## Bootstrap Ledger

The runtime also keeps a lightweight ledger:

- `runtime.json`
  - bootstrap counts
  - last bootstrap time
  - last workflow start
- `activity.jsonl`
  - append-only runtime events for hook boots and workflow starts

## Bootstrap Rules

- On first tool use after plugin activation, the hook should ensure that `~/.lhc/` exists.
- On every major workflow start, the workflow should create or refresh:
  - a workflow state JSON file
  - a context snapshot
  - an activity entry in `activity.jsonl`

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
