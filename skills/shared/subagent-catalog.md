# Subagent Catalog

Every entry below corresponds to a concrete file under `agents/` (Claude Code) or `prompts/` (Codex). Roles listed with no file are intentionally not wired here — do not invent calls to them.

Model pinning is enforced by each agent's frontmatter. Do not override the tier at call time unless the task is clearly outside the agent's intended scope.

## Generic Roles

| Role | Model | File | Use for |
|------|-------|------|---------|
| `planner` | opus | `agents/planner.md` | Turn a request into a bounded, testable plan with acceptance criteria. |
| `architect` | opus | `agents/architect.md` | System boundaries, interfaces, tradeoffs, failure modes. |
| `code-reviewer` | opus | `agents/code-reviewer.md` | Correctness, maintainability, regression risk on a diff. |
| `debugger` | sonnet | `agents/debugger.md` | Root-cause isolation before any fix is proposed. |
| `executor` | sonnet | `agents/executor.md` | Bounded implementation with smallest diff that matches the plan. |
| `verifier` | sonnet | `agents/verifier.md` | Fresh-evidence verification of a completion claim. |

## Wix-Native Specialist Roles

| Role | Model | File | Primary surfaces |
|------|-------|------|------------------|
| `incident-investigator` | opus | `agents/incident-investigator.md` | `root-cause`, `grafana`, `devex` |
| `build-release-operator` | sonnet | `agents/build-release-operator.md` | `devex` + `octocode` for builds, releases, rollouts, ownership |
| `internal-docs-researcher` | haiku | `agents/internal-docs-researcher.md` | `docs-schema` and internal docs |
| `repo-cartographer` | haiku | `agents/repo-cartographer.md` | `octocode` for wix-private discovery and PR archaeology |
| `framework-standards-reviewer` | haiku | `agents/framework-standards-reviewer.md` | FED CLI, Vitest, Oxlint, Wix Design System, wix-style-react |

## Not wired as subagents

The following roles are referenced elsewhere but are intentionally *not* implemented as local subagents:

- `security-reviewer` — routed to counterpart model via `lhc-review --mode code-review` with a security-focused prompt.
- `test-engineer` — handled inside `executor` via the plan's acceptance criteria; no separate agent.
- `writer` — Claude Code has built-in capability; no Wix-specialization needed.
- `explore` — Claude Code has the built-in `Explore` agent for broad searches.
- `jira-slack-coordinator` — intentionally omitted because LHC is read-only toward Jira and Slack by default. Manual human routing is the correct path.

If you find yourself reaching for one of the above, use the alternative in the right-hand column instead.

## Routing Guidance

- Use subagents for bounded parallel work within the current session.
- Use counterpart-model peer review (`peer-review.sh`) for the final sign-off pass. Never self-approve.
- External write access stays disabled unless the user explicitly authorizes the specific write.
- The coordinating agent never spawns lanes that spawn lanes. Fan-out is flat.
