---
name: using-lhc
description: Establishes LHC (Let Him Cook) working contract on session start — read-only defaults, mandatory peer review, runtime layout under ~/.lhc/, and the map from user intent to LHC skill. Invoke at the start of any session that may involve Wix internal engineering work.
when_to_use: Session start inside a Wix repo, or when the user asks "what is LHC", "how do I use this plugin", "what skills do I have", or is about to invoke an engineering workflow without a named LHC skill.
---

# Using LHC

LHC ("Let Him Cook") is the Wix-specific workflow layer shared by Claude Code and Codex. This skill tells the agent how to pick the right LHC skill, what the working agreements are, and which invariants override the default host behavior.

## The one-slide mental model

```
User intent ───────> lhc-interview ──────> classifies ──────> [the right skill]
                                                               ├─ lhc-ralplan    (plan a change)
                                                               ├─ lhc-ralph      (execute a plan)
                                                               ├─ lhc-team       (parallel lanes on a plan)
                                                               ├─ lhc-investigate (prod RCA)
                                                               ├─ lhc-build-fix  (red build)
                                                               ├─ lhc-research   (how does X work at Wix)
                                                               ├─ lhc-review     (peer-review gate)
                                                               └─ lhc-status     (what's in ~/.lhc)

All of them persist under ~/.lhc/. Major conclusions gate on counterpart peer review.
```

## Working agreements (override defaults)

These override the default host-agent posture for the duration of any LHC workflow. Each rule is backed by research or production evidence — see `docs/evidence.md` for the citation trail.

- **Read-only by default.** No Jira writes, no Slack posts, no PR comments, no Grafana mutations, no build retriggers — unless the user explicitly authorizes the specific write in the current turn. Permission rules are encoded as data in `permissions.json`.
- **Counterpart peer review is mandatory.** For plans, diffs, investigations, and incident conclusions. Self-approval in the same context is forbidden. `scripts/peer-review.sh` is the only mechanism that satisfies this gate. *Evidence: CRITIC (Gou et al. ICLR 2024), Huang et al. ICLR 2024 — intrinsic self-correction degrades without an external oracle.*
- **Test-first for any execution.** `lhc-ralph` writes the failing test, watches it fail for the right reason, then implements. A passing test the agent never saw fail is confirmation bias, not verification. *Evidence: Anthropic's SWE-bench Verified scaffold prompt, CodePRM ACL 2025, Reflexion NeurIPS 2023.*
- **Single-threaded by default; parallelism must be proven.** `lhc-team` fan-out requires a written independence proof. When in doubt, serialize. *Evidence: Cognition "Don't Build Multi-Agents", Augment post-mortem, SWE-bench Verified single-agent G6 (73.2%) beats multi-agent G7 (62.2%) on identical compute.*
- **Runtime state lives under `~/.lhc/`.** Plans under `plans/`, artifacts under `artifacts/`, notepad at `notepad.md`, session state under `state/sessions/<session-id>/`.
- **Aggressive context compaction.** LHC hooks re-inject working agreements at PreCompact; skills offload detail to `shared/` references rather than bloating SKILL.md bodies. *Evidence: Chroma "Context Rot" (2025), arXiv:2510.05381, Mindstudio Reddit "47 skills tested, 40 made output worse."*
- **Readiness first.** Every substantial skill begins with `check-readiness.js`. Blocked readiness hard-stops unless the user explicitly opts into degraded mode in the same turn.
- **Evidence over assumption.** Fresh verification output beats remembered verification. Every research claim cites a source.
- **No inline plan invention.** `lhc-ralph` requires a plan file in `~/.lhc/plans/`. Inventing one inline is forbidden.
- **Hard-coded loop guard.** Three identical (tool, args) calls = change strategy; five = stop and escalate. `scripts/loop-guard.js` enforces. *Evidence: Columbia DAPLab "9 failure patterns of coding agents" (Nov 2025) — prompts alone do not stop loops.*

## Invocation style

**Prefer explicit invocation over auto-trigger.** Skill descriptions describe triggering conditions, but host-side keyword auto-invocation has known reliability gaps (r/claude Oct 2025 survey: 47 skills tested, trigger unreliability was a top complaint). When you know the workflow you want, invoke it by name:

- `/lhc-ralplan` over "plan this for me"
- `/lhc-investigate` over "look at this prod issue"
- `/lhc-build-fix` over "why is my build red"

Auto-trigger is a convenience; explicit invocation is the contract.

## Routing cheatsheet

Match the user's request to the skill before doing anything else:

| User says… | Skill to invoke |
|-----------|-----------------|
| "plan this", "design this", "before we code" | `lhc-ralplan` |
| "implement this", "run the plan", "ralph", "execute" | `lhc-ralph` |
| "split this up", "parallelize", "team" | `lhc-team` |
| "why is my build red", "CI is failing", "rollout broke" | `lhc-build-fix` |
| "what's going on in prod", "why is this failing", "RCA" | `lhc-investigate` |
| "how does X work at Wix", "which service owns Y" | `lhc-research` |
| "review this", "second opinion", "peer review" | `lhc-review` |
| "what's in ~/.lhc", "lhc status" | `lhc-status` |
| Anything ambiguous | `lhc-interview` (classifies and routes) |

## Kill switches

Environment flags disable LHC enforcement when the user needs a vanilla Claude Code or Codex session:

- `DISABLE_LHC=1` — treat LHC as absent: no hooks fire, skills are not auto-invoked, working agreements do not override defaults.
- `LHC_SKIP_HOOKS=precompact,stop` — disable specific hooks while keeping the rest.

Surface the kill switches if the user says "turn off LHC", "disable the plugin", or repeatedly fights the read-only defaults.

## Anti-patterns

- **Treating the contract files as code.** Only roles with files under `prompts/*.md` or `agents/*.md` are real. Catalog entries in `AGENTS.md` / `CLAUDE.md` do not create runnable roles by themselves.
- **Self-approval.** "I already reviewed it mentally" is not peer review.
- **Silent degraded mode.** Missing MCPs cannot be papered over with plausible-sounding output.
- **Polite-stop reporting.** Reporting "I approved the plan" before writing the file and running peer review. The only terminal states are: artifact saved + verdict recorded, or explicit refusal + reason.
- **Three failed iterations.** If `lhc-ralph` fails the same fix three times, stop and question the plan. Do not attempt fix #4.

## Where to go next

- Full working contract: `AGENTS.md` (Codex) / `CLAUDE.md` (Claude) at the plugin root.
- **Research provenance** (why LHC is shaped this way): `docs/evidence.md`.
- Invariants per skill: `skills/shared/iron-laws.md`.
- How to resist rationalizing around a rule: `skills/shared/rationalization-guard.md`.
- Permission rules as data: `permissions.json`.
- Runtime layout: `docs/runtime-contract.md`.
- Peer-review mechanics: `skills/shared/peer-review-governance.md`.
