# Let Him Cook (LHC)

LHC is a workflow plugin for Wix engineers that runs inside **Claude Code** and **Codex**. Think of it as a layer of Wix-aware skills (planning, investigation, research, code review) that produce real, saved artifacts you can revisit — not just chat output.

It runs locally, defaults to read-only against external systems (no surprise PR comments / Jira writes / Slack posts), and routes every important conclusion through the *other* model for peer review.

> **New here?** Install with [`QUICKSTART.md`](QUICKSTART.md) · skill/command lookup in [`CHEATSHEET.md`](CHEATSHEET.md) · "why does it work this way" in [`FAQ.md`](FAQ.md).

---

## What you get

LHC adds a set of `/lhc-*` skills you can invoke inside Claude Code or Codex. Each one writes its result to a saved file under `~/.lhc/` so you can read it later, share it, or feed it to the next skill.

| Skill | What it's for |
|-------|---------------|
| `/lhc-status` | "What's running, what's pending review, what's blocked?" — a snapshot of `~/.lhc/`. |
| `/lhc-interview` | You're not sure which skill to use; it asks a few questions and routes you. |
| `/lhc-standards` | Produces a coding-standards brief that mixes the current repo's conventions with Wix ecosystem rules. |
| `/lhc-ralplan` | Plans a change before any code gets written. Peer-reviewed. Required before `/lhc-ralph`. |
| `/lhc-ralph` | Executes an existing plan: failing test first, then code, then verify, then peer review. |
| `/lhc-team` | Same as `/lhc-ralph` but in parallel lanes — only when the plan proves the lanes are independent. |
| `/lhc-investigate` | Production root-cause analysis across docs, dashboards, builds, and repos. |
| `/lhc-build-fix` | Triages a red CI / failed release / rollout regression. |
| `/lhc-research` | Source-backed answer to "what's the existing pattern for X?" or "tradeoffs between A and B?". |
| `/lhc-review` | Peer-review gate. Other skills call it automatically; you can also run it standalone on a diff or plan. |

The typical flow is: `/lhc-ralplan` → review the plan → `/lhc-ralph` → ship. For a bug or incident: `/lhc-investigate` or `/lhc-build-fix` first, then plan + execute if a code fix is needed.

See [`CHEATSHEET.md`](CHEATSHEET.md) for the full one-page reference.

---

## Install

Short version (full version + verification in [`QUICKSTART.md`](QUICKSTART.md)):

```bash
git clone https://github.com/RonenSivak/let-him-cook.git ~/let-him-cook

# Claude Code
claude plugin marketplace add ~/let-him-cook
claude plugin install let-him-cook@let-him-cook-local

# Codex
cd ~/let-him-cook && node scripts/install-codex-plugin.js
```

After install, restart the host CLI and run `/lhc-status` to confirm everything is wired up.

### Prerequisites

- **Node.js 18+** (the install scripts and helpers are Node).
- **Claude Code 2.x** and/or **Codex CLI 0.118+**. You can install one or both.
- For peer review, *both* `claude` and `codex` should be on `PATH`. If only one is, review verdicts come back as `degraded` — the workflow still completes, but you lose the most valuable check.
- Optional but recommended MCPs (LHC tells you which ones a given skill needs):
  - **Wix internal** (via the `mcp-s` gateway): `devex`, `grafana`, `grafana-datasource`, `root-cause`, `docs-schema`, `jira`, `slack`.
  - **External**: `octocode` (GitHub repo discovery, PR archaeology), `context7` (library/framework docs).

LHC never auto-installs MCPs. When a skill starts, it runs [`scripts/check-readiness.js`](scripts/check-readiness.js) and prints exactly what's missing plus the install commands.

---

## How LHC stores your work

Everything LHC produces lives under a single local directory: `~/.lhc/`. Nothing is uploaded; nothing is shared between machines.

```
~/.lhc/
├── plans/                    Plans from /lhc-ralplan, ready for review or execution.
├── artifacts/                Output files from every other skill — see below.
├── notepad.md                Short append-only log of decisions and observations.
└── state/                    Per-session bookkeeping (you don't need to edit this).
```

### Plans

When you run `/lhc-ralplan`, the resulting plan is saved as `~/.lhc/plans/ralplan-<topic>-<timestamp>.md`. It contains:

- the goal and constraints
- a step-by-step approach
- acceptance criteria (these become the failing tests later)
- the peer-review verdict from the other model

`/lhc-ralph` reads this file as a contract — it won't invent a plan inline.

### Artifacts

Every other skill writes a single Markdown file under `~/.lhc/artifacts/`, named by what produced it:

| File pattern | Produced by |
|--------------|-------------|
| `standards-<topic>-<timestamp>.md` | `/lhc-standards` |
| `execute-<topic>-<timestamp>.md` | `/lhc-ralph` |
| `team-<topic>-<timestamp>.md` | `/lhc-team` |
| `investigate-<topic>-<timestamp>.md` | `/lhc-investigate` |
| `build-fix-<topic>-<timestamp>.md` | `/lhc-build-fix` |
| `research-<topic>-<timestamp>.md` | `/lhc-research` |
| `review-<topic>-<timestamp>.md` | `/lhc-review` |

Artifacts are your audit trail — you can paste a path into a Slack thread, attach it to a PR, or feed it to the next skill. There's no auto-rotation; delete old ones when you're done with them.

### Notepad

`~/.lhc/notepad.md` is a tab-separated, append-only log. Skills write a single line to it whenever they record an outcome — "started investigation X", "approved plan Y", "fix attempt 2 failed because Z". You can read it directly to see what happened across sessions.

Always append via [`scripts/write-notepad.js`](scripts/write-notepad.js) — never edit by hand. Format details: [`skills/shared/notepad-schema.md`](skills/shared/notepad-schema.md).

---

## Peer review

LHC's central quality gate is: **the model that produced the work does not approve it**. Every plan, diff, investigation, and conclusion is sent to the *other* CLI in a clean context for review.

```bash
sh "$LHC_PLUGIN_ROOT"/scripts/peer-review.sh --mode <mode> --prompt-file <file>
```

Modes: `code-review`, `plan`, `investigation`, `conclusion`, `analysis`. Verdicts: `approved`, `approved-with-changes`, `rejected`, or `degraded` (counterpart unavailable).

Plugin and skill diffs go through extra local specialists first (`plugin-structure-reviewer`, `skill-authoring-reviewer`) before counterpart sign-off.

If both CLIs aren't installed, every workflow still completes — it just records `degraded` in the artifact and tells you what's missing.

---

## Hooks

Four hooks are auto-registered when you install the plugin. You don't need to do anything to enable them.

| Event | What it does |
|-------|--------------|
| `SessionStart` | Bootstraps `~/.lhc/` (creates folders, writes runtime state). Idempotent — safe on `/clear`, `/compact`, or session resume. |
| `PreToolUse` | Makes sure `~/.lhc/` exists before any file/bash tool fires. Belt-and-suspenders to the SessionStart hook. |
| `PreCompact` | Re-injects LHC's working agreements (read-only defaults, peer-review requirement, loop guard) so context compaction doesn't erase them. |
| `Stop` | If a workflow exited with peer review still pending, prints a reminder. Silent otherwise. |

### Disabling hooks

Set environment variables when you need vanilla Claude Code or Codex:

| Var | Effect |
|-----|--------|
| `DISABLE_LHC=1` | All hooks no-op; skills don't auto-inject. LHC effectively absent. |
| `LHC_SKIP_HOOKS=<csv>` | Disable specific hooks, e.g. `LHC_SKIP_HOOKS=precompact,stop`. |
| `ENABLE_PROMPT_CACHING_1H=0` | Disable the 1-hour prompt cache `peer-review.sh` opts into by default. |

Hooks honor these flags immediately — no restart needed.

---

## External-write permissions

LHC defaults to read-only for everything outside your local repo: no PR comments, no Jira writes, no Slack posts, no Grafana mutations, no DevEx build retriggers. "Handle it" / "finish it" / "take care of it" do *not* authorize external writes.

The full permission rules are in [`permissions.json`](permissions.json) — edit it (rare) if your engagement legitimately needs a standing waiver.

---

## Updating

```bash
cd ~/let-him-cook
git pull

# Codex (symlink install) — picks up changes immediately; restart the session.
# Claude Code (cached install) — refresh the marketplace and update the plugin:
claude plugin marketplace update let-him-cook-local
claude plugin update let-him-cook
```

Then run `/lhc-status` to confirm the runtime is healthy. Old `~/.lhc/state/` is forward-compatible; you don't need to wipe it.

---

## Troubleshooting

> Most "why is it doing that?" questions live in [`FAQ.md`](FAQ.md). Quick fixes below.

**Hooks aren't firing.** Confirm `claude plugin list` shows `let-him-cook@let-him-cook-local` (Claude Code) or that `~/.codex/config.toml` has `[plugins."let-him-cook@ronensi-local"] enabled = true` (Codex). Then check for `DISABLE_LHC=1` or `LHC_SKIP_HOOKS` in your shell env.

**Peer review came back `degraded`.** The counterpart CLI is missing. Install both `claude` and `codex` on your `PATH`.

**`/lhc-ralph` says "no plan found".** Run `/lhc-ralplan` first — LHC refuses to invent plans inline.

**Three identical fix attempts failed.** That's the loop guard signal: stop, re-run `/lhc-ralplan`, and revise. Don't attempt fix #4.

**Notepad rows are vanishing.** You hand-edited them. Always append via `node scripts/write-notepad.js`.

---

## Design principles

LHC's defaults are evidence-backed; every non-trivial choice is mapped to a citation in [`docs/evidence.md`](docs/evidence.md). The short version:

- **Test-first execution.** Failing tests before implementation (Anthropic SWE-bench scaffold).
- **Single-threaded by default.** Parallel lanes only with a written independence proof (Cognition "Don't Build Multi-Agents").
- **Counterpart peer review over self-review.** Tool-grounded verification (CRITIC ICLR 2024).
- **Context compaction over accumulation.** Progressive disclosure; agreements re-injected at compact (Chroma Context Rot 2025).
- **Hard-coded loop guard.** Three identical tool calls ⇒ strategy switch; five ⇒ stop (Columbia DAPLab failure taxonomy).
- **Permissions as data.** Amp-style DSL in [`permissions.json`](permissions.json).

Per-skill invariants: [`skills/shared/iron-laws.md`](skills/shared/iron-laws.md). The thoughts that lead around them: [`skills/shared/rationalization-guard.md`](skills/shared/rationalization-guard.md).
