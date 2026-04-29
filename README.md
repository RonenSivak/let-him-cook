# Let Him Cook (LHC)

LHC is a **personal-local workflow plugin for Wix engineers** that runs on both **Claude Code** and **Codex**. It wraps internal Wix MCPs, the local `claude` and `codex` CLIs, and external surfaces (GitHub via octocode, external docs via context7) into evidence-driven workflows with mandatory counterpart-model peer review, a read-only posture for external systems, and a local runtime at `~/.lhc/` that survives across sessions.

It is **not** a replacement for Wix MCP servers and **not** a write-enabled automation framework. It is a structured way to plan, investigate, research, triage, and review Wix engineering work with fewer footguns and a traceable artifact trail.

---

## At a glance

| Workflow | Skill | Produces |
|----------|-------|----------|
| Orient | `using-lhc` | Session-start primer |
| Classify ambiguous request | `lhc-interview` | Routing decision |
| Snapshot current state | `lhc-status` | Read-only report |
| Coding-standards brief | `lhc-standards` | `~/.lhc/artifacts/standards-*.md` |
| Plan substantial change | `lhc-ralplan` | `~/.lhc/plans/ralplan-*.md` (peer-reviewed, feature/bug-classified) |
| Execute a plan | `lhc-ralph` | `~/.lhc/artifacts/execute-*.md` (peer-reviewed, regression-first for bug fixes) |
| Parallel-lane execution | `lhc-team` | `~/.lhc/artifacts/team-*.md` |
| Production RCA | `lhc-investigate` | `~/.lhc/artifacts/investigate-*.md` (bug-symptom classified) |
| Red build classification | `lhc-build-fix` | `~/.lhc/artifacts/build-fix-*.md` (build bucket + bug shape) |
| Source-backed programmer research | `lhc-research` | `~/.lhc/artifacts/research-*.md` |
| Peer-review gate | `lhc-review` | `~/.lhc/artifacts/review-*.md` |

---

## Prerequisites

- **Node.js 18+** (helper scripts under `scripts/` use Node).
- One or both host CLIs: **Claude Code 2.x** and/or **Codex CLI**.
- The counterpart CLI for peer review. Inside Claude Code, `codex` must be on `PATH`. Inside Codex, `claude` must be on `PATH`. If one is missing, token/quota-limited, rate-limited, timed out, crashes before a verdict, or returns an unparseable verdict, LHC falls back to a strict separate-context reviewer and records `counterpart_coverage=degraded`. If the fallback also cannot run, the review verdict is `degraded`.
- Optional (recommended) MCP servers — LHC detects them at readiness time and tells you how to install any that are missing:
  - `mcp-s` (Wix MCP gateway — covers `devex`, `grafana`, `root-cause`, `docs-schema`, `jira`, `slack`)
  - `octocode` (GitHub repo discovery, PR archaeology)
  - `context7` (external library docs)

LHC **does not auto-install MCPs**. Each skill runs `scripts/check-readiness.js` on entry and prints a concrete install checklist if anything is missing.

---

## Install

LHC is a self-contained plugin directory. Install it once per host CLI. The plugin ships hooks in `hooks/hooks.json` (Claude Code) and the top-level `hooks.json` (Codex) — both are auto-registered when the plugin is active.

### Claude Code

**Option A — local marketplace (recommended for internal use).**

```bash
# 1. Clone or place the plugin wherever you keep plugins.
git clone https://github.com/RonenSivak/let-him-cook.git ~/plugins/let-him-cook

# 2. Register your local plugins directory as a marketplace.
claude /plugin marketplace add ~/plugins

# 3. Install the plugin.
claude /plugin install let-him-cook@local
```

**Option B — direct symlink (fastest for development).**

```bash
mkdir -p ~/.claude/plugins
ln -s "$(pwd)" ~/.claude/plugins/let-him-cook
```

**Option C — Anthropic plugin marketplace.** If LHC is published to the Wix-internal marketplace:

```bash
claude /plugin marketplace add wix-internal
claude /plugin install let-him-cook@wix-internal
```

After any install method, restart Claude Code and run `/plugin list` to confirm `let-him-cook` is active.

### Codex

As of Codex CLI `0.118.0`, plugin support is wired through the local marketplace manifest and `~/.codex/config.toml`; the old plugin-list CLI surface is gone. Use the installer in this repo:

```bash
git clone https://github.com/RonenSivak/let-him-cook.git ~/plugins/let-him-cook
cd ~/plugins/let-him-cook
node scripts/install-codex-plugin.js
```

The installer:

- symlinks this repo into `~/.codex/plugins/let-him-cook`
- creates or updates `~/.agents/plugins/marketplace.json`
- enables `[plugins."let-him-cook@ronensi-local"]` in `~/.codex/config.toml`

Use `node scripts/install-codex-plugin.js --dry-run` to inspect the changes first.

If `~/.codex/plugins/let-him-cook` already exists as a separate checkout, move it aside or keep updating that checkout directly before switching to the symlink installer.

### Codex env-var setup (equivalent of Claude `userConfig`)

The Claude manifest declares a `userConfig` block so Claude Code prompts you for the LHC env vars at plugin enable. **Codex does not document an equivalent primitive yet**, so on the Codex side these env vars must be set manually in `~/.codex/config.toml` or your shell environment. Set whichever ones you need:

```toml
# ~/.codex/config.toml — under [env] or [plugins."let-him-cook@ronensi-local".env]
MCP_S_TOKEN     = "..."   # Wix MCP gateway token (covers devex/grafana/root-cause/docs-schema/jira/slack)
OCTOCODE_TOKEN  = "..."   # GitHub token for octocode MCP (repo discovery, PR archaeology)
```

Both sides resolve `${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}` for the plugin root, so any script that reads these env vars works on both hosts. Track upstream Codex docs for `userConfig` parity; once OpenAI documents the field, this README section becomes redundant and the same block can ship in `.codex-plugin/plugin.json`.

### Verify

After install:

```bash
# Claude Code
claude /plugin list
# Look for: let-him-cook  (active)

# Codex registry state
grep -nE 'let-him-cook@ronensi-local|let-him-cook' ~/.codex/config.toml ~/.agents/plugins/marketplace.json

# Inside either interactive host:
/lhc-status
```

`/lhc-status` boots the runtime, confirms the hooks fired, and prints a per-workflow readiness snapshot.

---

## Using LHC

### Three invocation styles

1. **Direct skill** (recommended — most reliable): `/lhc-ralplan`, `/lhc-investigate`, `/lhc-status`, etc.
2. **Interactive classification**: `/lhc-interview` when you're not sure which skill to run.
3. **Natural language auto-trigger**: skill descriptions cover common phrasings, but keyword auto-trigger has known reliability gaps (r/claude 2025 skill survey). Prefer explicit invocation when you know the workflow.

### First-time walkthrough

Say you want to add a small API endpoint to a Wix service. The full LHC flow:

```
1. /lhc-ralplan
     → produces ~/.lhc/plans/ralplan-add-endpoint-<iso>.md
     → auto-invokes lhc-standards → ~/.lhc/artifacts/standards-add-endpoint-<iso>.md
     → peer-reviewed by counterpart model (Codex)

2. Review the plan + standards brief. Revise the plan (re-run lhc-ralplan) if needed.

3. /lhc-ralph
     → reads the plan and the standards brief
     → writes failing tests first for each acceptance criterion
     → implements, runs tests, iterates (max 3 retries per step)
     → routes the final diff through lhc-review (two-stage: spec + quality)
     → saves ~/.lhc/artifacts/execute-add-endpoint-<iso>.md

4. Open a PR with the diff. Commit message carries trailers:
     LHC-plan: ~/.lhc/plans/ralplan-add-endpoint-<iso>.md
     LHC-peer-review: approved
```

For a production issue:

```
/lhc-investigate → root-cause + grafana + devex correlation → peer-reviewed artifact.
```

For a red build:

```
/lhc-build-fix → devex + octocode → classifies as code/flaky/release/ownership/infra plus bug labels → hands off to lhc-ralplan if a code fix is warranted.
```

For a bug fix:

```
/lhc-ralplan → classifies bug labels, severity, origin, defect surface, and fix strategy → writes reproduction/regression-first acceptance criteria → peer-reviewed plan.
/lhc-ralph → watches the regression fail for the reported behavior → implements → verifies → peer-reviewed diff.
```

---

## Coding standards in LHC

LHC enforces a **weighted coding-standards policy** on every code-modifying workflow. It is the answer to "how does LHC write code that actually belongs in the repo."

### How it works

- `lhc-ralplan` auto-invokes `lhc-standards` when the plan will modify source files.
- `lhc-standards` produces a per-task brief at `~/.lhc/artifacts/standards-*.md` that:
  1. Detects the current repo's conventions (naming, imports, error handling, testing, state, etc.) by reading 5-10 nearby files + `tsconfig`, `package.json`, linter configs, `fedops.json`, etc.
  2. Consults Wix ecosystem standards via `docs-schema`, `framework-standards-reviewer`, `internal-docs-researcher`, and `context7`.
  3. Applies the weighted policy from [`skills/shared/coding-standards-policy.md`](skills/shared/coding-standards-policy.md).
  4. Flags conflicts, migration costs, and non-negotiables (security, accessibility, Wix SDK).
- `lhc-ralph` reads the brief when executing — the executor agent treats *Applied Rulings* and *Per-File Guidance* as contract.
- `lhc-review` reads the brief during the code-quality stage — style nits that contradict the brief are refused; violations of non-negotiables are flagged as blockers.

### Example weights

| Category | Default (repo : ecosystem) | Rationale |
|----------|---------------------------|-----------|
| Naming, imports, file structure | 90 : 10 | Consistency beats any individual pattern preference |
| Error handling | 70 : 30 | Repo idioms win; ecosystem wins when repo pattern silently swallows errors |
| Testing | 60 : 40 | Ecosystem prefers Vitest; repo can override |
| TypeScript strictness | 40 : 60 | Wix ecosystem enforces `strict: true`, no unjustified `any` |
| Accessibility | 20 : 80 | Ecosystem almost always wins |
| **Security** | **10 : 90** | **Ecosystem always wins — no exceptions** |
| Wix SDK / FED CLI / Business Manager | 0 : 100 | Ecosystem-owned surface |

Full table + override rules live in [`skills/shared/coding-standards-policy.md`](skills/shared/coding-standards-policy.md).

### Invoking directly

```bash
claude /lhc-standards      # when you want the brief before committing to a plan
```

The skill is also useful for tie-breaking "should we use pattern X or Y" debates — it produces cited evidence for both sides.

---

## Hooks

LHC ships four hooks. They are auto-registered when the plugin is installed; you do not need to install them separately.

| Event | Script | What it does |
|-------|--------|--------------|
| `SessionStart` | `runtime-touch.js --source session-start` | Bootstraps `~/.lhc/` (idempotent) on new sessions, resumes, `/clear`, and `/compact`. |
| `PreToolUse` | `pretool-runtime-bootstrap.sh` | Ensures `~/.lhc/` exists before any `Read`/`Write`/`Edit`/`Bash`/`Glob`/`Grep` tool fires. |
| `PreCompact` | `precompact-reinject.js` | Re-injects LHC's working agreements (read-only defaults, peer-review requirement, loop guard, etc.) as `additionalContext` so compaction doesn't erase them. |
| `Stop` | `stop-reminder.js` | If a workflow exited with `peer_review_required` still pending, emits a reminder naming the unfinished gate. Silent otherwise. |

### Disabling hooks

Two environment kill switches honor LHC hooks:

- `DISABLE_LHC=1` — all LHC hooks return `{}`; working agreements do not re-inject.
- `LHC_SKIP_HOOKS=<csv>` — disable named hooks. Example: `LHC_SKIP_HOOKS=precompact,stop`.

Use these when you need a vanilla Claude Code / Codex session. Hooks respect the flag immediately — no restart required.

---

## Configuration

### Kill switches (env vars)

| Var | Effect |
|-----|--------|
| `DISABLE_LHC=1` | Treats LHC as absent. Hooks no-op; skills don't auto-inject agreements. |
| `LHC_SKIP_HOOKS=<csv>` | Disable individual hooks (e.g. `precompact`, `stop`, `loop-guard`). |
| `ENABLE_PROMPT_CACHING_1H=0` | Disable the 1-hour prompt cache that `peer-review.sh` opts into by default (saves ~20-40% on repeated review calls). |

### Permission rules

External-writes governance is encoded as data in [`permissions.json`](permissions.json) (Sourcegraph Amp pattern). The runtime does not auto-enforce — agents read it and skills respect it. Edit `permissions.json` if your Wix engagement legitimately needs a standing waiver (rare).

### Peer-review routing

Counterpart-model review always routes through [`scripts/peer-review.sh`](scripts/peer-review.sh):

```bash
LHC_PLUGIN_ROOT="${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"
sh "$LHC_PLUGIN_ROOT"/scripts/peer-review.sh --mode <mode> --prompt-file <file>
```

Modes: `code-review`, `plan`, `investigation`, `conclusion`, `analysis`. `peer-review.sh` auto-detects whether it was invoked from Codex or Claude via the plugin-root environment variables. If the counterpart CLI is absent, token/quota-limited, rate-limited, times out, crashes before a verdict, or returns an unparseable verdict, the calling skill invokes a strict separate-context fallback and records `Review route: strict-local-fallback` plus `counterpart_coverage=degraded`. Claude uses `agents/strict-peer-reviewer.md`; Codex uses native `code-reviewer` seeded with `prompts/strict-peer-reviewer.md`. If the fallback also cannot run, the calling skill records `Verdict: degraded`.

Plugin and skill diffs get an extra local specialist loop before final counterpart sign-off:

- `plugin-structure-reviewer` checks manifests, catalogs, hooks, prompts/agents, host compatibility, and runtime safety.
- `skill-authoring-reviewer` checks skill triggers, workflow clarity, progressive disclosure, evidence grounding, and evaluation coverage.

Both reviewers use `skills/shared/plugin-skill-review-evidence.md` and return `approved`, `approved-with-changes`, or `rejected`. If both approve, `lhc-review` continues to counterpart review. If either rejects, or returns unaccepted `approved-with-changes`, `lhc-review` records the specialist verdicts and stops with a non-approved verdict; the producing/main workflow fixes findings outside the review skill and reruns the reviewers.

### Confidence discipline

`lhc-research`, `lhc-investigate`, and `lhc-standards` use [`skills/shared/confidence-escalation-policy.md`](skills/shared/confidence-escalation-policy.md). They should not return `medium` or `low` after a thin first pass. A lower-than-high artifact must include Evidence Coverage, an Exhaustion Ledger, Confidence Blockers, and the next evidence that would raise confidence. This keeps confidence honest without rewarding premature uncertainty.

---

## Runtime layout (`~/.lhc/`)

LHC keeps all durable state under `~/.lhc/`:

```
~/.lhc/
├── state/
│   ├── runtime.json              # bootstrap counts, last activity
│   ├── activity.jsonl            # append-only event log
│   └── sessions/<session-id>/
│       ├── <workflow>.json       # per-workflow state (phase, peer_review_required)
│       ├── <workflow>-context.md # context snapshot
│       └── tool-calls.jsonl      # loop-guard tool-call hash log
├── plans/
│   └── ralplan-<slug>-<iso>.md
├── artifacts/
│   ├── standards-<slug>-<iso>.md
│   ├── execute-<slug>-<iso>.md
│   ├── investigate-<slug>-<iso>.md
│   ├── build-fix-<slug>-<iso>.md
│   ├── research-<slug>-<iso>.md
│   ├── team-<slug>-<iso>.md
│   └── review-<slug>-<iso>.md
└── notepad.md                    # tab-separated append-only ledger
```

Tab-separated notepad format is documented in [`skills/shared/notepad-schema.md`](skills/shared/notepad-schema.md). Always append via [`scripts/write-notepad.js`](scripts/write-notepad.js) — never hand-format.

---

## Design principles

See [`AGENTS.md`](AGENTS.md) for the Codex operating contract, [`CLAUDE.md`](CLAUDE.md) for the Claude-side twin, and [`docs/evidence.md`](docs/evidence.md) for the research provenance mapping every non-trivial design choice to its academic or production citation. The highlights:

- **Test-first execution.** Failing tests before implementation (Anthropic SWE-bench scaffold, CodePRM ACL 2025).
- **Single-threaded by default.** Fan-out in `lhc-team` requires a written independence proof (Cognition "Don't Build Multi-Agents", SWE-bench Verified G6 > G7).
- **Tool-grounded verification.** Counterpart peer review over same-context self-approval (CRITIC ICLR 2024, Huang et al. ICLR 2024).
- **Evidence-calibrated confidence.** Lower-than-high confidence requires an exhaustion ledger, not a vibe (NAACL 2024 confidence-calibration survey, CRITIC, CodePRM).
- **Context compaction over accumulation.** PreCompact hook re-injects agreements; skills use progressive disclosure (Chroma Context Rot 2025, arXiv:2510.05381).
- **Hard-coded loop guard.** Three identical tool calls ⇒ strategy-switch; five ⇒ stop (Columbia DAPLab failure taxonomy Nov 2025).
- **Permission rules as data.** Amp-style DSL in [`permissions.json`](permissions.json).

---

## Troubleshooting

**"Unknown workflow" from `check-readiness.js`.** The workflow name must be lowercase and defined in [`scripts/readiness-registry.json`](scripts/readiness-registry.json).

**Peer review verdict is `degraded`.** Counterpart review and the strict local fallback both failed or could not run. Install both `claude` and `codex` on your `PATH`, check token/rate limits, and inspect the review artifact's `Counterpart failure` and `Review route` fields.

**Hooks don't fire.** In Claude Code, confirm `/plugin list` shows `let-him-cook`. In Codex, confirm `~/.agents/plugins/marketplace.json` contains `let-him-cook` and `~/.codex/config.toml` contains `[plugins."let-him-cook@ronensi-local"] enabled = true`. Then check for `DISABLE_LHC=1` or `LHC_SKIP_HOOKS` in your shell env.

**Skill says "no plan found" when invoking `lhc-ralph`.** Run `lhc-ralplan` first. LHC refuses to invent plans inline.

**"Same tool call 3×" loop-guard signal.** Three retries of the same fix is the signal to stop. Return to `lhc-ralplan` and revise. Do not attempt fix #4.

**Notepad format drift.** Always use `scripts/write-notepad.js`. Hand-written entries will eventually be stripped by maintenance scripts.

**Context rot / slow responses.** Invoke `/lhc-status` to see what's in flight. Consider clearing the session (`/clear` — the runtime will re-bootstrap) or aggressively referencing shared docs instead of pasting full contents.

---

## Updating

LHC is personal-local by default. To pull new changes:

```bash
cd ~/plugins/let-him-cook
git pull
# Claude Code and Codex will pick up the new plugin contents on the next session restart
```

If you installed LHC into Codex via the symlink installer, `git pull` updates the live plugin immediately. Re-run `node scripts/install-codex-plugin.js --dry-run` if you want to confirm the registry files still match the expected local-install shape.

When the plugin itself is updated, re-run `/lhc-status` to confirm your runtime still matches the schema (old `~/.lhc/state/` is forward-compatible).

---

## Contributing

LHC is designed for Wix internal engineering; contributions should be evidence-backed. New patterns added to the plugin require a matching entry in [`docs/evidence.md`](docs/evidence.md) citing at least one of:

- A replicated academic result (2+ independent papers or production systems)
- A top-10 SWE-bench / TerminalBench / TAU-bench scaffold that uses the pattern
- An Anthropic engineering post, Cognition/Augment/Aider post-mortem, or equivalent primary source

See [`skills/shared/iron-laws.md`](skills/shared/iron-laws.md) for the per-skill invariants, and [`skills/shared/rationalization-guard.md`](skills/shared/rationalization-guard.md) for the thoughts that lead around them.

---

## License

UNLICENSED — internal Wix use only.
