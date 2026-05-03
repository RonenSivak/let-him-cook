# LHC FAQ

Answers to the questions that come up most often. Pair with [`README.md`](README.md) (full reference), [`QUICKSTART.md`](QUICKSTART.md) (install), and [`CHEATSHEET.md`](CHEATSHEET.md) (skill list).

## What LHC is (and isn't)

### What does LHC actually give me on top of vanilla Claude Code / Codex?
Five things: (1) reusable workflows for plan/execute/investigate/research/review with concrete artifacts under `~/.lhc/`, (2) a read-only default for external systems (no surprise PR comments, Jira writes, Slack posts), (3) mandatory counterpart-model peer review on plans, diffs, and conclusions, (4) Wix-aware agents that know about the Wix MCPs — `devex` (build/release), `grafana` (dashboards/metrics), `root-cause` (incident correlation), `docs-schema` (internal docs), `jira` (tickets), `slack` (channels) — plus `octocode` (GitHub) and `context7` (external library docs), and (5) a runtime that survives `/clear` and `/compact` so context doesn't reset every session.

### Is LHC a replacement for the Wix MCP servers?
No. LHC *uses* the MCPs when they're installed and gates each workflow on the ones it needs:

- **Wix internal** (via the `mcp-s` gateway): `devex`, `grafana`, `grafana-datasource`, `root-cause`, `docs-schema`, `jira`, `slack`.
- **External**: `octocode` (GitHub repo discovery, PR archaeology), `context7` (library/framework docs).

If any of these is missing, the readiness check tells you exactly what to install — LHC never auto-installs anything.

### Can I use LHC on non-Wix code?
Yes, but you'll lose value. The Wix-native agents (`incident-investigator`, `build-release-operator`, `internal-docs-researcher`, `repo-cartographer`, `framework-standards-reviewer`) are tuned for Wix MCPs. The generic skills (`lhc-ralplan`, `lhc-ralph`, `lhc-research`, `lhc-review`) work fine without them.

### Why two CLIs (Claude *and* Codex)?
Peer review is the central quality gate, and the strongest version is "the *other* model reads what I produced." Inside Claude Code, `peer-review.sh` routes to Codex; inside Codex, it routes to Claude. If only one CLI is installed, review verdicts downgrade to `degraded` and the producing skill records the gap — nothing hard-fails, but you're losing the most valuable check.

### Does Cursor count as a third host?
Yes. The Cursor installer ([`scripts/install-cursor-plugin.js`](scripts/install-cursor-plugin.js)) wires the same skills + hooks into `~/.cursor/skills/` and `~/.cursor/hooks.json`. Cursor's hook events differ from Claude/Codex (`beforeSubmitPrompt`, `beforeShellExecution`, `stop`); the installer handles the mapping. There's no `PreCompact` equivalent on Cursor, so the working-agreements re-injection step is a no-op there. For peer review, Cursor still shells out to whichever counterpart CLI (`claude` or `codex`) is on `PATH`.

## Installing & updating

### Where should I clone the repo?
Anywhere. Both installers reference it by absolute path, not by name. The README and QUICKSTART use `~/let-him-cook` for consistency.

### Why does the Claude install use `let-him-cook@let-him-cook-local` instead of just `let-him-cook`?
Claude Code disambiguates plugins by marketplace. The repo's `.claude-plugin/marketplace.json` declares the marketplace as `let-him-cook-local` and the plugin inside it as `let-him-cook` — so the fully-qualified ID is `let-him-cook@let-him-cook-local`.

### `git pull` updated the repo, but Claude Code still shows the old version. Why?
Claude Code caches plugins under `~/.claude/plugins/cache/...` at install time. A `git pull` on the source repo does not update the cache. Run `claude plugin marketplace update let-him-cook-local` then `claude plugin update let-him-cook`. The Codex installer uses a symlink, so it picks up changes immediately on the next session.

### The Codex / Cursor installer says `already points to <other path>`. What now?
You have a previous checkout symlinked into `~/.codex/plugins/let-him-cook` (or `~/.cursor/plugins/local/let-him-cook` for Cursor). Either keep using that checkout, or move it aside (`mv <path> <path>.bak`) and re-run the installer.

### How do I cleanly remove the Cursor install?
`node scripts/install-cursor-plugin.js --uninstall`. It removes only LHC's symlinks under `~/.cursor/skills/` and the LHC entries from `~/.cursor/hooks.json` (each LHC entry is tagged with `_origin: "lhc"` so the script can identify them). Any third-party hooks you had (e.g. Superset) are left untouched.

### How do I temporarily disable LHC for one session?
`DISABLE_LHC=1 claude` (or `codex`). All hooks no-op and skills won't auto-inject. To disable specific hooks instead: `LHC_SKIP_HOOKS=precompact,stop`. See [`CHEATSHEET.md`](CHEATSHEET.md#kill-switches-env-vars) for the full list.

## Workflow questions

### Why does `lhc-ralph` refuse to run without a plan?
Inline plan invention is one of LHC's anti-patterns — it's how agents drift into "plausible but wrong" implementations. `lhc-ralph` reads the plan as contract: failing-tests-first per acceptance criterion, with bug-classification preserved when relevant. Run `/lhc-ralplan` first; the result is a peer-reviewed `~/.lhc/plans/ralplan-*.md`.

### When should I use `lhc-team` vs. `lhc-ralph`?
`lhc-ralph` is the default — single-threaded execution. `lhc-team` only fires when the plan decomposes into provably independent lanes, and the plan author writes that independence proof. Default to `lhc-ralph`; reach for `lhc-team` only when latency on a multi-day chunk of work is the bottleneck. (Cognition's "Don't Build Multi-Agents" + SWE-bench Verified G6>G7 are why.)

### Why does the planner sometimes ask me to classify the bug shape?
Because regression-first execution depends on it. "Crash bug" plans look different from "wrong-output bug" plans, which look different from "performance regression" plans — different reproductions, different acceptance criteria, different verification gates. The classification gets carried into `lhc-ralph` so the executor writes the right failing test before touching code.

### What's the difference between `lhc-investigate` and `lhc-build-fix`?
`lhc-investigate` is for production incidents — root-cause across docs-schema, grafana, devex, octocode. `lhc-build-fix` is for red CI / failed releases — classifies the failure (code / flaky / release-config / ownership / infra) and either resolves it directly or hands off to `lhc-ralplan` if a real code fix is warranted.

### When should I use `lhc-research`?
Before deciding direction on something non-trivial. It's source-backed — every claim cites internal docs, code, or external references via `context7`. Use it for "what's the existing pattern for X?", "is there prior art?", "tradeoffs between A and B?", or "recommend an approach". Don't use it for things you can answer with one or two grep calls.

### Does `lhc-standards` always run?
It's auto-invoked by `lhc-ralplan` when the plan will modify source files. You can also run it directly (`/lhc-standards`) when you want the brief before committing to a plan, or as a tie-breaker on style debates. Output lives at `~/.lhc/artifacts/standards-*.md` and is read by both `lhc-ralph` (during execution) and `lhc-review` (during the quality stage).

## Peer review

### Why is self-approval banned?
Same-context self-review is one of the most replicated failure modes in agent benchmarks (CRITIC ICLR 2024, Huang et al. ICLR 2024). The producer's prior is anchored to its own output. LHC routes review to a *different model in a clean context* via `peer-review.sh` — Claude reviews Codex's work, Codex reviews Claude's. The cost is real but the quality delta is well-documented.

### My review came back `degraded`. What does that mean?
The counterpart CLI isn't on `PATH`. Inside Claude Code, install `codex`. Inside Codex, install `claude`. Then re-run the workflow. `degraded` is recorded in the artifact, never silently upgraded — if you ship work with a degraded verdict, that's a deliberate call.

### Can I bypass peer review for a quick fix?
Skip the workflow entirely for trivial work — typo fixes, formatting, a one-line config change. The peer-review gate is mandatory only inside the plan/execute/investigate/conclusion skills. If you're driving Claude Code directly, you're outside the LHC contract.

## Runtime & artifacts

### Where does LHC store data, and is any of it shared?
Everything is local: `~/.lhc/state/`, `~/.lhc/plans/`, `~/.lhc/artifacts/`, `~/.lhc/notepad.md`. Nothing is uploaded; nothing is shared across machines. The repo's `permissions.json` is the only checked-in policy data.

### Survives `/clear` and `/compact`?
Yes. `SessionStart` re-bootstraps the runtime; `PreCompact` re-injects the working agreements so compaction doesn't erase them. The artifact trail under `~/.lhc/` is unaffected by either.

### Can I edit the notepad by hand?
Don't. Always append via `node scripts/write-notepad.js`. The format is tab-separated and validated by maintenance scripts; hand-written rows get stripped. Schema: [`skills/shared/notepad-schema.md`](skills/shared/notepad-schema.md).

### How do I clean up old artifacts?
Manually — `rm -rf ~/.lhc/artifacts/<old>` is fine. There's no auto-rotation by design; artifacts are the audit trail.

## Anti-patterns & limits

### Why won't LHC let me push a fix on the third attempt?
The loop guard says: three identical retries means the strategy is wrong, not the implementation. Stop, re-run `/lhc-ralplan`, and revise. Five identical tool calls hard-stop the loop. (Columbia DAPLab's failure taxonomy, Nov 2025, motivated this.)

### Can LHC write to GitHub / Jira / Slack / Grafana?
No, by default. External writes need explicit per-session authorization, and even then LHC routes through a single agent rather than ambient permission. "Handle it" / "finish it" / "take care of it" do *not* authorize external writes — read [`skills/shared/peer-review.md`](skills/shared/peer-review.md) for the full read-only contract.

### Why does the readiness check refuse to start a workflow?
Because running an investigation without `docs-schema`, or running `/lhc-ralplan` without `octocode`, produces plausible-sounding output with no evidence behind it. LHC names the gap rather than papering over it. The skill prints the install commands you need; pause, install, retry.

## Pointers

- Install: [`QUICKSTART.md`](QUICKSTART.md)
- Skill list / commands: [`CHEATSHEET.md`](CHEATSHEET.md)
- Full reference: [`README.md`](README.md)
- Why LHC works the way it does (citations): [`docs/evidence.md`](docs/evidence.md)
- Per-skill invariants: [`skills/shared/iron-laws.md`](skills/shared/iron-laws.md)
- Permission rules: [`permissions.json`](permissions.json)
