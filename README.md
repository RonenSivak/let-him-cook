# LHC

`let-him-cook` is a home-local Codex plugin for Wix developers. It is designed for daily internal engineering chores, not as a replacement for Wix MCP servers and not as a write-enabled automation framework.

## Purpose

The plugin turns the existing Wix tooling surface into a coherent workflow layer for:

- build and CI triage
- production investigation
- ownership, release, and rollout lookup
- internal documentation and repo research
- structured planning and execution with peer review

## Principles

- External systems are `read-only` by default.
- Missing prerequisites cause a `hard stop`.
- If the user explicitly says to continue anyway, workflows may continue in `degraded mode`.
- Counterpart-model review is mandatory for code changes, major plans, production investigations, and incident conclusions.

## Major Surfaces

- `devex`
- `grafana`
- `root-cause`
- `docs-schema`
- `jira`
- `slack`
- `octocode`
- `context7`
- local `codex` and `claude` CLIs

## Runtime Layout

The plugin uses `~/.lhc/` for local runtime state and artifacts:

- `~/.lhc/state/`
- `~/.lhc/plans/`
- `~/.lhc/artifacts/`
- `~/.lhc/notepad.md`
- `~/.lhc/project-memory.json`
- `~/.lhc/readiness/`

The runtime is bootstrapped automatically on first tool use through a plugin hook, and each major workflow initializes per-workflow state and context snapshots under `~/.lhc/state/sessions/`.

## Install

Use the official personal-plugin layout from the Codex plugin docs.

1. Copy this plugin directory to:
   - `~/.codex/plugins/let-him-cook`
2. Add an entry to:
   - `~/.agents/plugins/marketplace.json`
3. Use this source path in the marketplace entry:
   - `./.codex/plugins/let-him-cook`
4. Restart Codex, open the Plugin Directory, and install `LHC`.

## Workflow Skills

- `lhc-interview`
- `lhc-ralplan`
- `lhc-ralph`
- `lhc-team`
- `lhc-investigate`
- `lhc-build-fix`
- `lhc-research`
- `lhc-review`

## Helper Scripts

- `scripts/check-readiness.js`
- `scripts/ensure-runtime.js`
- `scripts/runtime-touch.js`
- `scripts/write-artifact.js`
- `scripts/peer-review.sh`

## Notes

- The plugin is home-local and personal-first.
- Repo-local specialization is intentionally deferred to later overlay support.
- The plugin does not auto-install MCPs. It detects readiness and emits install guidance.
