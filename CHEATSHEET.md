# LHC Cheatsheet

Single-page reference. Pair with [`README.md`](README.md) for the full contracts and [`FAQ.md`](FAQ.md) for the "why".

## Skills

Invoke as `/<name>` in Claude Code, Codex, or Cursor once the plugin is installed.

| Skill | When to reach for it | Produces |
|-------|----------------------|----------|
| `using-lhc` | Session-start primer; you're not sure what LHC even does. | (read-only) |
| `lhc-status` | "What did I run, what's pending review, what's blocked?" | Read-only snapshot of `~/.lhc/`. |
| `lhc-interview` | Ambiguous request — you don't know which skill to run. | Routing decision. |
| `lhc-standards` | Tie-breaking "should this match repo X or ecosystem Y" debates. | `~/.lhc/artifacts/standards-*.md` |
| `lhc-ralplan` | Anything bigger than a 2-line change. Required before `lhc-ralph`. | `~/.lhc/plans/ralplan-*.md` (peer-reviewed) |
| `lhc-ralph` | Execute an existing plan, regression-first, with a verify/fix loop. | `~/.lhc/artifacts/execute-*.md` |
| `lhc-team` | Plan decomposes into truly independent lanes (rare). | `~/.lhc/artifacts/team-*.md` |
| `lhc-investigate` | Production RCA — root cause across docs, grafana, devex, repos. | `~/.lhc/artifacts/investigate-*.md` |
| `lhc-build-fix` | Red CI / failed release / rollout regression triage. | `~/.lhc/artifacts/build-fix-*.md` |
| `lhc-research` | Source-backed programmer research before deciding direction. | `~/.lhc/artifacts/research-*.md` |
| `lhc-review` | Peer-review gate; called by other skills, also runnable directly on a diff/plan/conclusion. | `~/.lhc/artifacts/review-*.md` |

## Common flows

```text
Small code change       /lhc-ralplan → /lhc-ralph
Bug fix                 /lhc-ralplan (bug type) → /lhc-ralph (regression-first)
Production incident     /lhc-investigate
Red build / failed CI   /lhc-build-fix → /lhc-ralplan (if a code fix is warranted)
Open question / spike   /lhc-research
Standalone code review  /lhc-review
"What's in flight?"     /lhc-status
```

## Agents (subagent surfaces)

Generic: `planner` (opus) · `architect` (opus) · `code-reviewer` (opus) · `executor` (sonnet) · `debugger` (sonnet) · `verifier` (sonnet)

Wix-native: `incident-investigator` (opus) · `build-release-operator` (sonnet) · `internal-docs-researcher` (haiku) · `repo-cartographer` (haiku) · `framework-standards-reviewer` (haiku)

Reviewers (loaded by `lhc-review` for plugin/skill diffs): `plugin-structure-reviewer` (opus) · `skill-authoring-reviewer` (opus)

## Hooks

Cursor uses different event names; mapping in the right column.

| Event (Claude / Codex) | Cursor | What it does |
| --- | --- | --- |
| `SessionStart` | `beforeSubmitPrompt` | Bootstraps `~/.lhc/` on new sessions, resumes, `/clear`, `/compact`. |
| `PreToolUse` | `beforeShellExecution` | Ensures `~/.lhc/` exists before any file/bash tool fires. |
| `PreCompact` | *(none)* | Re-injects working agreements so compaction doesn't erase them. |
| `Stop` | `stop` | Reminds you if a workflow exited with peer review still pending. |

## Kill switches (env vars)

| Var | Effect |
|-----|--------|
| `DISABLE_LHC=1` | Treat LHC as absent. Hooks no-op; skills don't auto-inject. |
| `LHC_SKIP_HOOKS=<csv>` | Disable specific hooks, e.g. `precompact,stop`. |
| `ENABLE_PROMPT_CACHING_1H=0` | Disable the 1-hour prompt cache `peer-review.sh` uses. |

## Runtime layout (`~/.lhc/`)

```
~/.lhc/
├── state/runtime.json         bootstrap counts, last activity
├── state/activity.jsonl       append-only event log
├── state/sessions/<id>/…      per-workflow state, context, tool-call hashes
├── plans/ralplan-*.md         from /lhc-ralplan
├── artifacts/
│   ├── standards-*.md         from /lhc-standards
│   ├── execute-*.md           from /lhc-ralph
│   ├── investigate-*.md       from /lhc-investigate
│   ├── build-fix-*.md         from /lhc-build-fix
│   ├── research-*.md          from /lhc-research
│   ├── team-*.md              from /lhc-team
│   └── review-*.md            from /lhc-review
└── notepad.md                 tab-separated append-only ledger
```

Always append to `notepad.md` via [`scripts/write-notepad.js`](scripts/write-notepad.js) — never hand-format.

## Peer review

```bash
LHC_PLUGIN_ROOT="${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"
sh "$LHC_PLUGIN_ROOT"/scripts/peer-review.sh --mode <mode> --prompt-file <file>
```

Modes: `code-review` · `plan` · `investigation` · `conclusion` · `analysis`

Verdicts: `approved` · `approved-with-changes` · `rejected` · `degraded` (counterpart CLI missing).

## Commit trailers (when LHC authorized the change)

```
Constraint: <active constraint>
Rejected: <alternative> | <why>
Confidence: high|medium|low
Scope-risk: narrow|moderate|broad
LHC-plan: ~/.lhc/plans/<plan-file>
LHC-peer-review: approved
```

Skip trailers for typo-only or formatting-only commits. Full schema: [`skills/shared/commit-trailers.md`](skills/shared/commit-trailers.md).

## Useful scripts

| Script | Purpose |
|--------|---------|
| [`scripts/check-readiness.js`](scripts/check-readiness.js) | Per-workflow MCP/CLI readiness probe. Each skill runs it on entry. |
| [`scripts/install-codex-plugin.js`](scripts/install-codex-plugin.js) | Codex install/update; supports `--dry-run`. |
| [`scripts/install-cursor-plugin.js`](scripts/install-cursor-plugin.js) | Cursor install/update; supports `--dry-run` and `--uninstall`. |
| [`scripts/peer-review.sh`](scripts/peer-review.sh) | Routes to the counterpart CLI for review. |
| [`scripts/write-notepad.js`](scripts/write-notepad.js) | Append a row to `~/.lhc/notepad.md`. |
| [`scripts/write-artifact.js`](scripts/write-artifact.js) | Save a workflow artifact under `~/.lhc/artifacts/`. |

## When stuck

- Three identical fix attempts → **stop**. Re-run `/lhc-ralplan`.
- Peer review says `degraded` → install the counterpart CLI (`claude` or `codex`) on `PATH`.
- "No plan found" from `/lhc-ralph` → run `/lhc-ralplan` first; LHC refuses to invent plans inline.
- Hooks not firing → `claude plugin list` (Claude) or check `~/.codex/config.toml` (Codex); look for `DISABLE_LHC` / `LHC_SKIP_HOOKS` in your shell env.

See [`FAQ.md`](FAQ.md) for the longer-form answers.
