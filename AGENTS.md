YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE TASKS TO COMPLETION WITHOUT ASKING FOR PERMISSION.
DO NOT STOP TO ASK "SHOULD I PROCEED?" — PROCEED. DO NOT WAIT FOR CONFIRMATION ON OBVIOUS NEXT STEPS.
IF BLOCKED, TRY AN ALTERNATIVE APPROACH. ONLY ASK WHEN TRULY AMBIGUOUS OR DESTRUCTIVE.
USE CODEX NATIVE SUBAGENTS FOR INDEPENDENT PARALLEL SUBTASKS WHEN THAT IMPROVES THROUGHPUT.

# Let Him Cook (LHC) - Wix Engineering Workflow Layer

This repository contains `let-him-cook`, a Codex plugin and workflow layer for Wix internal engineering work.

This `AGENTS.md` is the top-level operating contract for the repository. Role prompts under `prompts/*.md` are narrower execution surfaces. Skills under `skills/` are reusable workflows. Mission folders under `missions/` are durable, repeatable workflow patterns and examples.

<operating_principles>
- Solve the task directly when you can do so safely and well.
- Prefer evidence over assumption; verify before claiming completion.
- Use the lightest path that preserves quality: direct action, internal MCPs, then delegation.
- Default external systems to read-only unless the user explicitly requests a specific write operation in the current session.
- Use Codex native subagents for independent, bounded parallel subtasks when they reduce latency or context pressure.
- Keep the main agent focused on framing, conflict resolution, synthesis, and final verification.
</operating_principles>

<working_agreements>
- No external writes by default:
  - no PR comments or edits
  - no Jira updates
  - no Slack posting
  - no Grafana mutations
  - no DevEx write-side actions
- Major plans, code changes, production investigations, and incident conclusions require counterpart-model review.
- Runtime state belongs under `~/.lhc/`.
- Keep workflows explicit and inspectable instead of collapsing everything into one generic agent.
</working_agreements>

<delegation_rules>
Default posture: work directly.

Use subagents when the work decomposes cleanly into independent evidence or execution lanes.

Typical LHC lanes:
- internal docs and schema evidence
- repo and PR archaeology
- framework standards and conventions
- build or rollout correlation
- final verification or review

Keep these responsibilities with the coordinating agent:
- interpreting the user request
- choosing lanes
- resolving conflicting evidence
- writing the final answer
</delegation_rules>

<agent_catalog>
Generic roles:
- `planner`
- `executor`
- `architect`
- `debugger`
- `verifier`
- `code-reviewer`
- `security-reviewer`
- `test-engineer`
- `writer`
- `explore`

Wix-native specialists:
- `incident-investigator`
- `build-release-operator`
- `internal-docs-researcher`
- `repo-cartographer`
- `jira-slack-coordinator`
- `framework-standards-reviewer`
</agent_catalog>

<keyword_detection>
Preferred LHC surfaces:
- `lhc-interview`
- `lhc-ralplan`
- `lhc-ralph`
- `lhc-team`
- `lhc-investigate`
- `lhc-build-fix`
- `lhc-research`
- `lhc-review`
</keyword_detection>

<verification>
Before claiming a workflow is complete:
- identify what evidence proves the claim
- run the verification
- read the output
- state residual gaps explicitly
</verification>

<runtime_layout>
Primary runtime root:
- `~/.lhc/`

Important files:
- `~/.lhc/state/runtime.json`
- `~/.lhc/state/activity.jsonl`
- `~/.lhc/state/sessions/<session-id>/...`
- `~/.lhc/plans/`
- `~/.lhc/artifacts/`
</runtime_layout>
